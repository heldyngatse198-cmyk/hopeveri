const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const JWT_SECRET = process.env.JWT_SECRET || 'hopeveri-secret-change-in-production';
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');
const db = require('./db');
const { authenticate, requireAdmin } = require('./middleware');
const { detect } = require('./detector');
const { humanize } = require('./humanizer');
const { sendConfirmationEmail } = require('./mailer');

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// ── helpers ──────────────────────────────────────────────────────────

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function getTodayUTC() {
  return new Date().toISOString().slice(0, 10);
}

function sanitizeUser(u) {
  const { password, ...safe } = u;
  return safe;
}

function getSubscriptionQuota(subscription) {
  if (subscription === 'monthly') return 50;
  if (subscription === 'yearly') return 9999;
  return 5;
}

function getQuotaResetDay() {
  const now = new Date();
  const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 8, 0, 0));
  if (now < reset) {
    reset.setUTCDate(reset.getUTCDate() - 1);
  }
  return reset.toISOString().slice(0, 10);
}

function expireSubscription(user) {
  if (user.subscription !== 'free' && user.subscription_end_at) {
    const now = new Date();
    const endDate = new Date(user.subscription_end_at);
    if (!isNaN(endDate.getTime()) && endDate <= now) {
      db.prepare('UPDATE users SET subscription = ?, daily_quota = ?, subscription_end_at = NULL, updated_at = datetime(\'now\') WHERE id = ?')
        .run('free', getSubscriptionQuota('free'), user.id);
      user.subscription = 'free';
      user.daily_quota = getSubscriptionQuota('free');
      user.subscription_end_at = null;
    }
  }
}

function checkAndResetQuota(user) {
  expireSubscription(user);
  const today = getQuotaResetDay();
  if (user.quota_reset_at !== today) {
    const quota = getSubscriptionQuota(user.subscription);
    db.prepare('UPDATE users SET daily_quota = ?, quota_reset_at = ? WHERE id = ?').run(quota, today, user.id);
    user.daily_quota = quota;
  }
}

const guestSessions = new Map();
const GUEST_DAILY_QUOTA = 5;

function getGuestDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function getGuestTokenFromRequest(req) {
  return req.headers['x-guest-token'] || req.query.guestToken;
}

function createGuestSession() {
  const token = uuidv4();
  const session = {
    token,
    daily_quota: GUEST_DAILY_QUOTA,
    quota_reset_at: getGuestDateKey(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    uses: 0,
  };
  guestSessions.set(token, session);
  return session;
}

function getGuestSession(req) {
  const token = getGuestTokenFromRequest(req);
  let session = token ? guestSessions.get(token) : null;
  if (!session) {
    session = createGuestSession();
  }
  if (session.quota_reset_at !== getGuestDateKey()) {
    session.daily_quota = GUEST_DAILY_QUOTA;
    session.quota_reset_at = getGuestDateKey();
    session.updated_at = new Date().toISOString();
  }
  return session;
}

function classifyDocument(text) {
  const normalized = text.toLowerCase();
  const scores = {
    cv: /(cv|curriculum|expérience|compétences|formation|professionnel)/i.test(normalized) ? 2 : 0,
    lettre: /(lettre|motivation|candidature|postuler|poste)/i.test(normalized) ? 2 : 0,
    facture: /(facture|montant|client|TVA|paiement|total|référence)/i.test(normalized) ? 2 : 0,
    admin: /(administratif|protocole|rapport|procédure|directive|contrat|document interne)/i.test(normalized) ? 2 : 0,
    courrier: /(courrier|poste|lettre officielle|destinataire|expéditeur)/i.test(normalized) ? 2 : 0,
  };

  let classification = 'autre';
  let best = 0;
  Object.entries(scores).forEach(([key, score]) => {
    if (score > best) {
      best = score;
      classification = key;
    }
  });

  if (classification === 'autre' && normalized.length > 200) {
    if (normalized.includes('facture') || normalized.includes('montant')) classification = 'facture';
    else if (normalized.includes('lettre') || normalized.includes('motivation')) classification = 'lettre';
    else if (normalized.includes('courrier') || normalized.includes('expéditeur') || normalized.includes('destinataire')) classification = 'courrier';
  }

  const folderName = classification === 'courrier' ? 'Courriers' : `Dossier ${classification.toUpperCase()}`;

  return {
    classification,
    folder: folderName,
    tags: [classification, 'document'],
  };
}

function buildDocumentSummary(classification, text) {
  return {
    summary: `Document classé comme ${classification.classification}.`,
    folder: classification.folder,
    snippet: text.slice(0, 160),
  };
}

function createAnalysisLog(userId, text, result, profile, docType, humanizedText = null) {
  const analysisId = uuidv4();
  db.prepare(`
    INSERT INTO analyses (id, user_id, text_excerpt, score, classification, profile, doc_type, is_humanized, humanized_text)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    analysisId,
    userId,
    text.slice(0, 500),
    result.score,
    result.classification,
    profile,
    docType,
    humanizedText ? 1 : 0,
    humanizedText ? humanizedText.slice(0, 2000) : null
  );
}

let ocrWorker = null;
let ocrLoaded = false;

async function ensureOCRWorker() {
  if (ocrLoaded) return;
  ocrWorker = Tesseract.createWorker({ logger: () => {} });
  await ocrWorker.load();
  await ocrWorker.loadLanguage('fra');
  await ocrWorker.initialize('fra');
  ocrLoaded = true;
}

async function extractTextFromFile(file) {
  const name = (file.originalname || '').toLowerCase();
  if (name.endsWith('.pdf')) {
    const data = await pdfParse(file.buffer);
    return data.text || '';
  }
  if (name.endsWith('.docx')) {
    const data = await mammoth.extractRawText({ buffer: file.buffer });
    return data.value || '';
  }
  if (name.match(/\.(png|jpe?g)$/)) {
    await ensureOCRWorker();
    const { data } = await ocrWorker.recognize(file.buffer);
    return data?.text || '';
  }

  return file.buffer.toString('utf-8');
}

async function parseUploadFiles(files) {
  const parsed = [];
  for (const file of files) {
    const text = await extractTextFromFile(file);
    if (!text || text.trim().length < 10) {
      parsed.push({ file, text: '', error: `Le fichier ${file.originalname} ne contient pas assez de texte.` });
    } else {
      parsed.push({ file, text: text.trim() });
    }
  }
  return parsed;
}

// ── AUTH ─────────────────────────────────────────────────────────────

router.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis.' });
  if (password.length < 6) return res.status(400).json({ error: 'Mot de passe trop court (min 6).' });

  const existing = db.prepare('SELECT id, confirmed FROM users WHERE email = ?').get(email);
  if (existing) {
    if (!existing.confirmed) {
      return res.status(409).json({ error: 'Email déjà utilisé mais non confirmé. Vérifiez votre boîte de réception ou renvoyez le lien de confirmation.' });
    }
    return res.status(409).json({ error: 'Cet email est déjà utilisé.' });
  }

  const id = uuidv4();
  const hash = bcrypt.hashSync(password, 10);
  const today = getTodayUTC();
  const confirmationToken = uuidv4();
  const confirmationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO users (id, email, password, role, subscription, daily_quota, quota_reset_at, confirmed, confirmation_token, confirmation_token_expires_at)
    VALUES (?, ?, ?, 'user', 'free', 5, ?, 0, ?, ?)
  `).run(id, email, hash, today, confirmationToken, confirmationExpiry);

  try {
    await sendConfirmationEmail(email, confirmationToken);
  } catch (err) {
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    console.error('SMTP send error:', err.message || err);
    return res.status(500).json({ error: "Impossible d'envoyer l'email de confirmation. Veuillez réessayer plus tard." });
  }

  res.status(201).json({ message: 'Un email de confirmation a été envoyé. Vérifiez votre boîte de réception.' });
});

router.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis.' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Identifiants invalides.' });
  if (!user.active) return res.status(403).json({ error: 'Compte désactivé. Contactez un administrateur.' });
  if (!user.confirmed) return res.status(403).json({ error: 'Email non confirmé. Vérifiez votre courrier ou renvoyez le lien de confirmation.' });

  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Identifiants invalides.' });
  }

  checkAndResetQuota(user);
  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  const token = generateToken(updated);
  res.json({ token, user: sanitizeUser(updated) });
});

router.get('/api/auth/confirm', (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token de confirmation manquant.' });

  const user = db.prepare('SELECT * FROM users WHERE confirmation_token = ?').get(token);
  if (!user) {
    return res.status(400).json({ error: 'Token invalide ou expiré.' });
  }

  if (user.confirmed) {
    return res.json({ message: 'Votre adresse email est déjà confirmée.' });
  }

  if (!user.confirmation_token_expires_at || new Date(user.confirmation_token_expires_at) < new Date()) {
    return res.status(400).json({ error: 'Le lien de confirmation a expiré.' });
  }

  db.prepare(
    'UPDATE users SET confirmed = 1, confirmation_token = NULL, confirmation_token_expires_at = NULL, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(user.id);

  res.json({ message: 'Email confirmé avec succès. Vous pouvez maintenant vous connecter.' });
});

router.post('/api/auth/resend-confirmation', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email requis.' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
  if (user.confirmed) return res.status(400).json({ error: 'Email déjà confirmé.' });

  const confirmationToken = uuidv4();
  const confirmationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  db.prepare(
    'UPDATE users SET confirmation_token = ?, confirmation_token_expires_at = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(confirmationToken, confirmationExpiry, user.id);

  try {
    await sendConfirmationEmail(user.email, confirmationToken);
  } catch (err) {
    console.error('SMTP send error:', err.message || err);
    return res.status(500).json({ error: "Impossible d'envoyer l'email de confirmation. Veuillez réessayer plus tard." });
  }

  res.json({ message: 'Un nouvel email de confirmation a été envoyé.' });
});

router.get('/api/auth/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
  checkAndResetQuota(user);
  const refreshed = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: sanitizeUser(refreshed) });
});

router.get('/api/guest/session', (req, res) => {
  const session = getGuestSession(req);
  res.json({
    guestToken: session.token,
    quotaRemaining: session.daily_quota,
    quotaResetAt: session.quota_reset_at,
  });
});

router.post('/api/guest/detect-multiple', (req, res) => {
  const session = getGuestSession(req);
  const { texts, profile, docType } = req.body || {};

  if (!Array.isArray(texts) || texts.length === 0) {
    return res.status(400).json({ error: 'Aucun texte fourni pour vérification.' });
  }
  if (texts.length > 5) {
    return res.status(400).json({ error: 'Maximum 5 fichiers/documents à la fois.' });
  }
  const invalid = texts.find((text) => !text || typeof text !== 'string' || text.trim().length < 10);
  if (invalid) {
    return res.status(400).json({ error: 'Tous les fichiers doivent contenir au moins 10 caractères.' });
  }
  if (session.daily_quota < texts.length) {
    return res.status(429).json({ error: 'Quota gratuit épuisé. Créez un compte ou attendez demain 8h.' });
  }

  const results = texts.map((text) => {
    const trimmed = text.trim();
    const result = detect(trimmed, profile || 'etudiant', docType || 'autre');
    return { textExcerpt: trimmed.slice(0, 200), ...result };
  });

  session.daily_quota -= texts.length;
  session.uses += texts.length;
  session.updated_at = new Date().toISOString();

  res.json({ results, quotaRemaining: session.daily_quota, guestToken: session.token });
});

router.post('/api/guest/humanize-multiple', (req, res) => {
  const session = getGuestSession(req);
  const { texts, profile } = req.body || {};

  if (!Array.isArray(texts) || texts.length === 0) {
    return res.status(400).json({ error: 'Aucun texte fourni pour humanisation.' });
  }
  if (texts.length > 5) {
    return res.status(400).json({ error: 'Maximum 5 fichiers/documents à la fois.' });
  }
  const invalid = texts.find((text) => !text || typeof text !== 'string' || text.trim().length < 10);
  if (invalid) {
    return res.status(400).json({ error: 'Tous les fichiers doivent contenir au moins 10 caractères.' });
  }
  if (session.daily_quota < texts.length) {
    return res.status(429).json({ error: 'Quota gratuit épuisé. Créez un compte ou attendez demain 8h.' });
  }

  const results = texts.map((text) => {
    const trimmed = text.trim();
    const humanizedText = humanize(trimmed, profile || 'etudiant');
    const result = detect(trimmed, profile || 'etudiant', 'autre');
    return { original: trimmed, humanized: humanizedText, ...result };
  });

  session.daily_quota -= texts.length;
  session.uses += texts.length;
  session.updated_at = new Date().toISOString();

  res.json({ results, quotaRemaining: session.daily_quota, guestToken: session.token });
});

router.post('/api/guest/upload/detect', upload.array('files', 5), async (req, res) => {
  const session = getGuestSession(req);
  const { profile, docType } = req.body || {};

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Aucun fichier envoyé pour vérification.' });
  }
  if (req.files.length > 5) {
    return res.status(400).json({ error: 'Maximum 5 fichiers/documents à la fois.' });
  }
  if (session.daily_quota < req.files.length) {
    return res.status(429).json({ error: 'Quota gratuit épuisé. Créez un compte ou attendez demain 8h.' });
  }

  const parsed = await parseUploadFiles(req.files);
  const results = parsed.map((item) => {
    if (item.error) return { error: item.error, fileName: item.file.originalname };
    const result = detect(item.text, profile || 'etudiant', docType || 'autre');
    return { fileName: item.file.originalname, textExcerpt: item.text.slice(0, 200), ...result };
  });

  session.daily_quota -= req.files.length;
  session.uses += req.files.length;
  session.updated_at = new Date().toISOString();

  res.json({ results, quotaRemaining: session.daily_quota, guestToken: session.token });
});

router.post('/api/guest/upload/humanize', upload.array('files', 5), async (req, res) => {
  const session = getGuestSession(req);
  const { profile } = req.body || {};

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Aucun fichier envoyé pour humanisation.' });
  }
  if (req.files.length > 5) {
    return res.status(400).json({ error: 'Maximum 5 fichiers/documents à la fois.' });
  }
  if (session.daily_quota < req.files.length) {
    return res.status(429).json({ error: 'Quota gratuit épuisé. Créez un compte ou attendez demain 8h.' });
  }

  const parsed = await parseUploadFiles(req.files);
  const results = parsed.map((item) => {
    if (item.error) return { error: item.error, fileName: item.file.originalname };
    const humanizedText = humanize(item.text, profile || 'etudiant');
    const result = detect(item.text, profile || 'etudiant', 'autre');
    return { fileName: item.file.originalname, original: item.text, humanized: humanizedText, ...result };
  });

  session.daily_quota -= req.files.length;
  session.uses += req.files.length;
  session.updated_at = new Date().toISOString();

  res.json({ results, quotaRemaining: session.daily_quota, guestToken: session.token });
});

router.post('/api/premium/classify', authenticate, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user || !user.active) return res.status(403).json({ error: 'Compte désactivé.' });
  if (!['monthly', 'yearly'].includes(user.subscription)) {
    return res.status(403).json({ error: 'Cette fonctionnalité est réservée aux abonnés premium.' });
  }

  const { texts } = req.body || {};
  if (!Array.isArray(texts) || texts.length === 0) {
    return res.status(400).json({ error: 'Aucun document fourni pour classification.' });
  }
  if (texts.length > 10) {
    return res.status(400).json({ error: 'Maximum 10 documents à la fois.' });
  }

  const results = texts.map((text) => {
    const trimmed = (text || '').trim();
    if (trimmed.length < 10) {
      return { error: 'Document trop court pour classification.' };
    }
    const classification = classifyDocument(trimmed);
    return buildDocumentSummary(classification, trimmed);
  });

  res.json({ results });
});

router.get('/api/email/status', authenticate, (req, res) => {
  const user = db.prepare('SELECT email_connected, email_provider, subscription FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
  if (!['monthly', 'yearly'].includes(user.subscription)) {
    return res.status(403).json({ error: 'Email integration réservée aux abonnements premium.' });
  }
  res.json({ connected: !!user.email_connected, provider: user.email_provider || null });
});

router.post('/api/email/connect', authenticate, (req, res) => {
  const { provider } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user || !user.active) return res.status(403).json({ error: 'Compte désactivé.' });
  if (!['monthly', 'yearly'].includes(user.subscription)) {
    return res.status(403).json({ error: 'Email integration réservée aux abonnements premium.' });
  }
  if (!provider || !['gmail', 'outlook'].includes(provider)) {
    return res.status(400).json({ error: 'Fournisseur email invalide.' });
  }

  db.prepare('UPDATE users SET email_connected = 1, email_provider = ?, updated_at = datetime(\'now\') WHERE id = ?')
    .run(provider, user.id);

  res.json({ connected: true, provider, connectUrl: `https://example.com/connect/${provider}` });
});

// ── MULTI-FILE DETECTION / HUMANIZATION ───────────────────────────────

router.post('/api/detect-multiple', authenticate, (req, res) => {
  const { texts, profile, docType } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user || !user.active) return res.status(403).json({ error: 'Compte désactivé.' });

  checkAndResetQuota(user);
  const freshUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  if (!Array.isArray(texts) || texts.length === 0) {
    return res.status(400).json({ error: 'Aucun texte fourni pour vérification.' });
  }
  if (texts.length > 5) {
    return res.status(400).json({ error: 'Maximum 5 fichiers/documents à la fois.' });
  }
  const invalid = texts.find((text) => !text || typeof text !== 'string' || text.trim().length < 10);
  if (invalid) {
    return res.status(400).json({ error: 'Tous les fichiers doivent contenir au moins 10 caractères.' });
  }
  if (freshUser.daily_quota < texts.length) {
    return res.status(429).json({ error: 'Quota insuffisant. Attendez 8h demain ou payez pour obtenir plus.' });
  }

  const results = texts.map((text) => {
    const trimmed = text.trim();
    const result = detect(trimmed, profile || 'etudiant', docType || 'autre');
    createAnalysisLog(freshUser.id, trimmed, result, profile || 'etudiant', docType || 'autre');
    return { textExcerpt: trimmed.slice(0, 200), ...result };
  });

  db.prepare('UPDATE users SET daily_quota = daily_quota - ? WHERE id = ?').run(texts.length, freshUser.id);
  res.json({ results, quotaRemaining: freshUser.daily_quota - texts.length });
});

router.post('/api/humanize-multiple', authenticate, (req, res) => {
  const { texts, profile } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user || !user.active) return res.status(403).json({ error: 'Compte désactivé.' });

  checkAndResetQuota(user);
  const freshUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

  if (!Array.isArray(texts) || texts.length === 0) {
    return res.status(400).json({ error: 'Aucun texte fourni pour humanisation.' });
  }
  if (texts.length > 5) {
    return res.status(400).json({ error: 'Maximum 5 fichiers/documents à la fois.' });
  }
  const invalid = texts.find((text) => !text || typeof text !== 'string' || text.trim().length < 10);
  if (invalid) {
    return res.status(400).json({ error: 'Tous les fichiers doivent contenir au moins 10 caractères.' });
  }
  if (freshUser.daily_quota < texts.length) {
    return res.status(429).json({ error: 'Quota insuffisant. Attendez 8h demain ou payez pour obtenir plus.' });
  }

  const results = texts.map((text) => {
    const trimmed = text.trim();
    const humanizedText = humanize(trimmed, profile || 'etudiant');
    const result = detect(trimmed, profile || 'etudiant', 'autre');
    createAnalysisLog(freshUser.id, trimmed, result, profile || 'etudiant', 'autre', humanizedText);
    return { original: trimmed, humanized: humanizedText, ...result };
  });

  db.prepare('UPDATE users SET daily_quota = daily_quota - ? WHERE id = ?').run(texts.length, freshUser.id);
  res.json({ results, quotaRemaining: freshUser.daily_quota - texts.length });
});

// ── DETECTION ────────────────────────────────────────────────────────

router.post('/api/detect', authenticate, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user || !user.active) return res.status(403).json({ error: 'Compte désactivé.' });

  checkAndResetQuota(user);

  // Re-read after potential reset
  const freshUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (freshUser.daily_quota <= 0) {
    return res.status(429).json({ error: 'Quota journalier épuisé. Réessayez demain après 08h.' });
  }

  const { text, profile, docType } = req.body || {};
  if (!text || typeof text !== 'string' || text.trim().length < 10) {
    return res.status(400).json({ error: 'Texte trop court (min 10 caractères).' });
  }

  const result = detect(text.trim(), profile || 'etudiant', docType || 'autre');

  // Decrement quota
  db.prepare('UPDATE users SET daily_quota = daily_quota - 1 WHERE id = ?').run(freshUser.id);

  // Log analysis
  const analysisId = uuidv4();
  db.prepare(`
    INSERT INTO analyses (id, user_id, text_excerpt, score, classification, profile, doc_type)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(analysisId, freshUser.id, text.trim().slice(0, 500), result.score, result.classification, profile || 'etudiant', docType || 'autre');

  res.json({
    ...result,
    quotaRemaining: freshUser.daily_quota - 1,
  });
});

// ── HUMANIZATION ─────────────────────────────────────────────────────

router.post('/api/humanize', authenticate, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user || !user.active) return res.status(403).json({ error: 'Compte désactivé.' });

  checkAndResetQuota(user);
  const freshUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (freshUser.daily_quota <= 0) {
    return res.status(429).json({ error: 'Quota journalier épuisé. Réessayez demain après 08h.' });
  }

  const { text, profile } = req.body || {};
  if (!text || typeof text !== 'string' || text.trim().length < 10) {
    return res.status(400).json({ error: 'Texte trop court (min 10 caractères).' });
  }

  const humanizedText = humanize(text.trim(), profile || 'etudiant');

  // Decrement quota
  db.prepare('UPDATE users SET daily_quota = daily_quota - 1 WHERE id = ?').run(freshUser.id);

  // Log analysis with humanized flag
  const analysisId = uuidv4();
  const detectionResult = detect(text.trim(), profile || 'etudiant', 'autre');
  db.prepare(`
    INSERT INTO analyses (id, user_id, text_excerpt, score, classification, profile, doc_type, is_humanized, humanized_text)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).run(analysisId, freshUser.id, text.trim().slice(0, 500), detectionResult.score, detectionResult.classification, profile || 'etudiant', 'autre', humanizedText.slice(0, 2000));

  res.json({
    original: text.trim(),
    humanized: humanizedText,
    quotaRemaining: freshUser.daily_quota - 1,
  });
});

// ── SUBSCRIPTION (WhatsApp) ──────────────────────────────────────────

router.get('/api/subscription/whatsapp-link', authenticate, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

  const plans = {
    monthly: { name: 'Mensuel', price: '5000 FCFA/mois' },
    yearly: { name: 'Annuel', price: '50000 FCFA/an' },
  };

  res.json({
    message: 'Choisissez votre plan et contactez-nous sur WhatsApp.',
    plans,
    whatsappNumber: '+242067318641',
    template: (plan) =>
      `Bonjour, je souhaite m'abonner à HopeVeri. Email : ${user.email} Plan : ${plan}`,
  });
});

// ── USER HISTORY ─────────────────────────────────────────────────────

router.get('/api/history', authenticate, (req, res) => {
  const analyses = db.prepare(
    'SELECT * FROM analyses WHERE user_id = ? ORDER BY created_at DESC LIMIT 100'
  ).all(req.user.id);
  res.json({ analyses });
});

router.delete('/api/history', authenticate, (req, res) => {
  db.prepare('DELETE FROM analyses WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true, message: 'Historique supprimé.' });
});

router.delete('/api/account', authenticate, (req, res) => {
  db.prepare('UPDATE users SET active = 0, updated_at = datetime(\'now\') WHERE id = ?').run(req.user.id);
  res.json({ ok: true, message: 'Compte désactivé. Connectez-vous à nouveau pour voir le statut.' });
});

// ── ADMIN ROUTES ─────────────────────────────────────────────────────

router.get('/api/admin/stats', authenticate, requireAdmin, (req, res) => {
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const activeUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE active = 1').get().count;
  const freeUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE subscription = 'free'").get().count;
  const monthlyUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE subscription = 'monthly'").get().count;
  const yearlyUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE subscription = 'yearly'").get().count;
  const totalAnalyses = db.prepare('SELECT COUNT(*) as count FROM analyses').get().count;
  const todayAnalyses = db.prepare(
    "SELECT COUNT(*) as count FROM analyses WHERE date(created_at) = date('now')"
  ).get().count;

  res.json({
    totalUsers,
    activeUsers,
    freeUsers,
    monthlyUsers,
    yearlyUsers,
    totalAnalyses,
    todayAnalyses,
  });
});

router.get('/api/admin/users', authenticate, requireAdmin, (req, res) => {
  const users = db.prepare(
    'SELECT id, email, role, subscription, subscription_end_at, email_connected, email_provider, active, daily_quota, quota_reset_at, created_at FROM users ORDER BY created_at DESC'
  ).all();
  res.json({ users });
});

router.patch('/api/admin/users/:id', authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

  const { active, subscription, daily_quota, durationDays } = req.body || {};

  if (active !== undefined) {
    db.prepare('UPDATE users SET active = ?, updated_at = datetime(\'now\') WHERE id = ?').run(active ? 1 : 0, id);
  }
  if (subscription) {
    if (!['free', 'monthly', 'yearly'].includes(subscription)) {
      return res.status(400).json({ error: 'Plan invalide.' });
    }
    const quota = getSubscriptionQuota(subscription);
    let endDate = null;
    let emailConnectedValue = user.email_connected;
    let emailProviderValue = user.email_provider;
    if (subscription !== 'free') {
      const days = Number(durationDays) || (subscription === 'monthly' ? 30 : 365);
      const date = new Date();
      date.setUTCDate(date.getUTCDate() + days);
      endDate = date.toISOString();
    } else {
      emailConnectedValue = 0;
      emailProviderValue = null;
    }

    db.prepare(
      'UPDATE users SET subscription = ?, daily_quota = ?, subscription_end_at = ?, email_connected = ?, email_provider = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).run(subscription, quota, endDate, emailConnectedValue, emailProviderValue, id);
  }
  if (daily_quota !== undefined) {
    db.prepare('UPDATE users SET daily_quota = ?, updated_at = datetime(\'now\') WHERE id = ?').run(daily_quota, id);
  }

  const updated = db.prepare('SELECT id, email, role, subscription, active, daily_quota, subscription_end_at, quota_reset_at, created_at FROM users WHERE id = ?').get(id);
  res.json({ user: updated });
});

router.delete('/api/admin/users/:id', authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

  db.prepare('DELETE FROM analyses WHERE user_id = ?').run(id);
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ ok: true, message: 'Utilisateur et ses analyses supprimés.' });
});

router.get('/api/admin/analyses', authenticate, requireAdmin, (req, res) => {
  const analyses = db.prepare(`
    SELECT a.*, u.email as user_email
    FROM analyses a
    JOIN users u ON a.user_id = u.id
    ORDER BY a.created_at DESC
    LIMIT 200
  `).all();
  res.json({ analyses });
});

router.get('/api/admin/analytics', authenticate, requireAdmin, (req, res) => {
  const dailyStats = db.prepare(`
    SELECT date(created_at) as day, COUNT(*) as count
    FROM analyses
    GROUP BY day
    ORDER BY day DESC
    LIMIT 30
  `).all();

  const scoreDistribution = db.prepare(`
    SELECT
      SUM(CASE WHEN score <= 40 THEN 1 ELSE 0 END) as human,
      SUM(CASE WHEN score > 40 AND score <= 60 THEN 1 ELSE 0 END) as mixed,
      SUM(CASE WHEN score > 60 THEN 1 ELSE 0 END) as ai
    FROM analyses
  `).get();

  const topUsers = db.prepare(`
    SELECT u.email, COUNT(a.id) as analysis_count
    FROM analyses a
    JOIN users u ON a.user_id = u.id
    GROUP BY u.id
    ORDER BY analysis_count DESC
    LIMIT 10
  `).all();

  res.json({ dailyStats, scoreDistribution, topUsers });
});

module.exports = router;
