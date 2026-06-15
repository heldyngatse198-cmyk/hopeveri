const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const { query } = require('./db');
const { authenticate, requireAdmin } = require('./middleware');
const { detect } = require('./detector');
const { humanize } = require('./humanizer');
const { sendConfirmationEmail } = require('./mailer');
const { verifyGoogleToken } = require('./googleAuth');
const { checkOllama, detectWithAI, humanizeWithAI, ollamaAvailable } = require('./ollama');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');

const JWT_SECRET = process.env.JWT_SECRET || 'hopeveri-secret-change-in-production';
const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
}

function sanitizeUser(user) {
  const { password, ...safe } = user;
  return {
    ...safe,
    email_connected: safe.email_connected === 1 || safe.email_connected === true,
    confirmed: safe.confirmed === 1 || safe.confirmed === true,
    active: safe.active === 1 || safe.active === true,
    auto_sync_enabled: safe.auto_sync_enabled === 1 || safe.auto_sync_enabled === true,
    document_preferences: safe.document_preferences ? JSON.parse(safe.document_preferences) : [],
    custom_rules: safe.custom_rules ? JSON.parse(safe.custom_rules) : [],
  };
}

function getSubscriptionQuota(subscription) {
  if (subscription === 'monthly') return 50;
  if (subscription === 'yearly') return 9999;
  return 5;
}

function getDefaultAvatar(email) {
  const colors = ['#06b6d4','#8b5cf6','#f43f5e','#10b981','#f59e0b','#3b82f6','#ec4899','#14b8a6'];
  const hash = email.split('').reduce((a,c) => a + c.charCodeAt(0), 0);
  return { avatar_url: null, avatar_color: colors[hash % colors.length] };
}

function parseJsonField(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
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

function getQuotaResetDay() {
  const now = new Date();
  const reset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 8, 0, 0));
  if (now < reset) {
    reset.setUTCDate(reset.getUTCDate() - 1);
  }
  return reset.toISOString().slice(0, 10);
}

async function getUserByEmail(email) {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0];
}

async function getUserById(id) {
  const result = await query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0];
}

async function checkAndResetQuota(user) {
  const today = getQuotaResetDay();
  if (user.quota_reset_at !== today) {
    const quota = getSubscriptionQuota(user.subscription);
    await query('UPDATE users SET daily_quota = $1, quota_reset_at = $2 WHERE id = $3', [quota, today, user.id]);
    user.daily_quota = quota;
    user.quota_reset_at = today;
  }
}

async function createAnalysisLog(userId, text, result, profile, docType, actionType = 'detect', humanizedText = null) {
  // better-sqlite3 requires bind params to be primitives (no objects/booleans/etc.);
  // normalize all values explicitly.
  const score = Number(result?.score ?? 0);
  const classification = String(result?.classification ?? 'autre');
  const isHumanized = humanizedText ? 1 : 0; // for SQLite numeric boolean
  const humanized = humanizedText ? String(humanizedText).slice(0, 2000) : null;

  await query(
    `INSERT INTO analyses (id, user_id, text_excerpt, score, classification, profile, doc_type, action_type, is_humanized, humanized_text)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      uuidv4(),
      String(userId),
      String(text).slice(0, 500),
      score,
      classification,
      String(profile),
      String(docType),
      String(actionType),
      isHumanized,
      humanized,
    ]
  );
}


router.post('/auth/register', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis.' });
  if (password.length < 6) return res.status(400).json({ error: 'Mot de passe trop court (min 6).' });

  const existing = await getUserByEmail(email);
  if (existing) {
    if (!existing.confirmed) {
      return res.status(409).json({ error: 'Email déjà utilisé mais non confirmé. Vérifiez votre boîte de réception ou renvoyez le lien de confirmation.' });
    }
    return res.status(409).json({ error: 'Cet email est déjà utilisé.' });
  }

  const id = uuidv4();
  const hashedPassword = bcrypt.hashSync(password, 10);
  const confirmationToken = uuidv4();
  const confirmationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await query(
    `INSERT INTO users (id, email, password, role, subscription, daily_quota, quota_reset_at, confirmed, confirmation_token, confirmation_token_expires_at)
     VALUES ($1, $2, $3, 'user', 'free', 5, $4, false, $5, $6)`,
    [id, email, hashedPassword, getQuotaResetDay(), confirmationToken, confirmationExpiry]
  );

  try {
    await sendConfirmationEmail(email, confirmationToken);
  } catch (error) {
    await query('DELETE FROM users WHERE id = $1', [id]);
    console.error('SMTP send error:', error.message || error);
    return res.status(500).json({ error: 'Impossible d’envoyer l’email de confirmation. Veuillez réessayer plus tard.' });
  }

  res.status(201).json({ message: 'Un email de confirmation a été envoyé. Vérifiez votre boîte de réception.' });
});

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis.' });

  const user = await getUserByEmail(email);
  if (!user || !user.active || !user.confirmed) {
    return res.status(401).json({ error: 'Identifiants invalides ou compte non confirmé.' });
  }

  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Identifiants invalides.' });
  }

  await checkAndResetQuota(user);
  const refreshed = await getUserById(user.id);
  const token = generateToken(refreshed);
  res.json({ token, user: sanitizeUser(refreshed) });
});

router.post('/auth/google', async (req, res) => {
  const { idToken } = req.body || {};
  if (!idToken) return res.status(400).json({ error: 'Token Google requis.' });

  let profile;
  try {
    profile = await verifyGoogleToken(idToken);
  } catch (error) {
    return res.status(401).json({ error: 'Token Google invalide.' });
  }

  if (!profile.email) return res.status(400).json({ error: 'Email Google introuvable.' });

  let user = await getUserByEmail(profile.email);
  if (!user) {
    const id = uuidv4();
    const randomPassword = uuidv4();
    await query(
      `INSERT INTO users (id, email, password, role, subscription, daily_quota, quota_reset_at, confirmed)
       VALUES ($1, $2, $3, 'user', 'free', 5, $4, true)`,
      [id, profile.email, bcrypt.hashSync(randomPassword, 10), getQuotaResetDay()]
    );
    user = await getUserById(id);
  }

  const token = generateToken(user);
  res.json({ token, user: sanitizeUser(user) });
});

router.get('/auth/me', authenticate, async (req, res) => {
  const user = await getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
  await checkAndResetQuota(user);
  const refreshed = await getUserById(user.id);
  res.json({ user: sanitizeUser(refreshed) });
});

router.get('/premium/settings', authenticate, async (req, res) => {
  const user = await getUserById(req.user.id);
  if (!user || !user.active) return res.status(403).json({ error: 'Compte désactivé.' });
  if (!['monthly', 'yearly'].includes(user.subscription)) {
    return res.status(403).json({ error: 'Fonctionnalité premium réservée aux abonnés.' });
  }

  res.json({
    autoSyncEnabled: user.auto_sync_enabled === 1 || user.auto_sync_enabled === true,
    documentPreferences: parseJsonField(user.document_preferences, [
      'CV',
      'Lettres de motivation',
      'Contrats',
      'Factures',
      'Rapports',
      'Documents administratifs',
      'Documents scolaires',
      'Tous les documents',
    ]),
    customRules: parseJsonField(user.custom_rules, []),
  });
});

router.post('/premium/settings', authenticate, async (req, res) => {
  const { autoSyncEnabled, documentPreferences, customRules } = req.body || {};
  const user = await getUserById(req.user.id);
  if (!user || !user.active) return res.status(403).json({ error: 'Compte désactivé.' });
  if (!['monthly', 'yearly'].includes(user.subscription)) {
    return res.status(403).json({ error: 'Fonctionnalité premium réservée aux abonnés.' });
  }

  await query(
    'UPDATE users SET auto_sync_enabled = $1, document_preferences = $2, custom_rules = $3, updated_at = now() WHERE id = $4',
    [autoSyncEnabled ? true : false, JSON.stringify(documentPreferences || []), JSON.stringify(customRules || []), user.id]
  );

  res.json({ message: 'Paramètres premium mis à jour.' });
});

router.get('/premium/dashboard', authenticate, async (req, res) => {
  const user = await getUserById(req.user.id);
  if (!user || !user.active) return res.status(403).json({ error: 'Compte désactivé.' });
  if (!['monthly', 'yearly'].includes(user.subscription)) {
    return res.status(403).json({ error: 'Fonctionnalité premium réservée aux abonnés.' });
  }

  const totalDocs = await query('SELECT COUNT(*) AS count FROM analyses WHERE user_id = $1', [user.id]);
  const humanizedDocs = await query('SELECT COUNT(*) AS count FROM analyses WHERE user_id = $1 AND is_humanized = $2', [user.id, true]);
  const analysisHistory = await query('SELECT id, text_excerpt, classification, score, action_type, created_at FROM analyses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10', [user.id]);

  res.json({
    emailsAnalyzed: 0,
    documentsRetrieved: Number(totalDocs.rows[0]?.count || 0),
    documentsClassified: Number(totalDocs.rows[0]?.count || 0),
    documentsHumanized: Number(humanizedDocs.rows[0]?.count || 0),
    history: analysisHistory.rows || [],
  });
});

router.get('/email/status', authenticate, async (req, res) => {
  const user = await getUserById(req.user.id);
  if (!user || !user.active) return res.status(403).json({ error: 'Compte désactivé.' });
  if (!['monthly', 'yearly'].includes(user.subscription)) {
    return res.status(403).json({ error: 'Intégration de boîte mail réservée aux abonnés premium.' });
  }
  res.json({ connected: user.email_connected === 1 || user.email_connected === true, provider: user.email_provider || null });
});

router.post('/email/connect', authenticate, async (req, res) => {
  const { provider } = req.body || {};
  const user = await getUserById(req.user.id);
  if (!user || !user.active) return res.status(403).json({ error: 'Compte désactivé.' });
  if (!['monthly', 'yearly'].includes(user.subscription)) {
    return res.status(403).json({ error: 'Intégration de boîte mail réservée aux abonnés premium.' });
  }
  if (!provider || !['gmail', 'outlook', 'microsoft365', 'imap'].includes(provider)) {
    return res.status(400).json({ error: 'Fournisseur email invalide.' });
  }

  const connectUrl = `https://example.com/connect/${provider}`;
  await query('UPDATE users SET email_connected = $1, email_provider = $2, updated_at = now() WHERE id = $3', [true, provider, user.id]);
  res.json({ connected: true, provider, connectUrl });
});

router.get('/admin/users', authenticate, requireAdmin, async (req, res) => {
  const result = await query('SELECT id, email, role, subscription, email_connected, email_provider, active, created_at FROM users ORDER BY created_at DESC');
  res.json({ users: result.rows });
});

router.post('/admin/user/action', authenticate, requireAdmin, async (req, res) => {
  const { userId, action } = req.body || {};
  if (!userId || !action) return res.status(400).json({ error: 'userId et action requis.' });
  const user = await getUserById(userId);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

  switch (action) {
    case 'activate_basic':
      await query('UPDATE users SET subscription = $1, daily_quota = $2, updated_at = now() WHERE id = $3', ['free', getSubscriptionQuota('free'), userId]);
      break;
    case 'activate_premium':
      await query('UPDATE users SET subscription = $1, daily_quota = $2, updated_at = now() WHERE id = $3', ['monthly', getSubscriptionQuota('monthly'), userId]);
      break;
    case 'suspend':
      await query('UPDATE users SET active = $1, updated_at = now() WHERE id = $2', [false, userId]);
      break;
    case 'delete':
      await query('DELETE FROM users WHERE id = $1', [userId]);
      break;
    default:
      return res.status(400).json({ error: 'Action inconnue.' });
  }
  res.json({ message: 'Action administrateur exécutée.' });
});

router.get('/auth/confirm', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token de confirmation manquant.' });

  const result = await query('SELECT * FROM users WHERE confirmation_token = $1', [token]);
  const user = result.rows[0];
  if (!user) return res.status(400).json({ error: 'Token invalide ou expiré.' });
  if (user.confirmed) return res.json({ message: 'Votre adresse email est déjà confirmée.' });
  if (!user.confirmation_token_expires_at || new Date(user.confirmation_token_expires_at) < new Date()) {
    return res.status(400).json({ error: 'Le lien de confirmation a expiré.' });
  }

  await query('UPDATE users SET confirmed = true, confirmation_token = NULL, confirmation_token_expires_at = NULL, updated_at = now() WHERE id = $1', [user.id]);
  res.json({ message: 'Email confirmé avec succès. Vous pouvez maintenant vous connecter.' });
});

router.post('/auth/resend-confirmation', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email requis.' });

  const user = await getUserByEmail(email);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
  if (user.confirmed) return res.status(400).json({ error: 'Email déjà confirmé.' });

  const confirmationToken = uuidv4();
  const confirmationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await query('UPDATE users SET confirmation_token = $1, confirmation_token_expires_at = $2, updated_at = now() WHERE id = $3', [confirmationToken, confirmationExpiry, user.id]);

  try {
    await sendConfirmationEmail(user.email, confirmationToken);
  } catch (error) {
    console.error('SMTP send error:', error.message || error);
    return res.status(500).json({ error: 'Impossible d’envoyer l’email de confirmation. Veuillez réessayer plus tard.' });
  }

  res.json({ message: 'Un nouvel email de confirmation a été envoyé.' });
});

router.post('/subscription/buy', authenticate, async (req, res) => {
  const { plan } = req.body || {};
  if (!['monthly', 'yearly'].includes(plan)) {
    return res.status(400).json({ error: 'Plan invalide.' });
  }

  const user = await getUserById(req.user.id);
  if (!user || !user.active) return res.status(403).json({ error: 'Compte désactivé.' });

  const amount = plan === 'monthly' ? 1000 : 2500;
  const durationDays = plan === 'monthly' ? 30 : 365;
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + durationDays);

  await query(
    'UPDATE users SET subscription = $1, daily_quota = $2, subscription_end_at = $3, updated_at = now() WHERE id = $4',
    [plan, getSubscriptionQuota(plan), expiryDate.toISOString(), user.id]
  );

  const refreshed = await getUserById(user.id);
  res.json({ message: `Abonnement ${plan} activé.`, amount, subscription: plan, user: sanitizeUser(refreshed) });
});

router.post('/detect', authenticate, async (req, res) => {
  const { text, profile, docType } = req.body || {};
  const user = await getUserById(req.user.id);
  if (!user || !user.active) return res.status(403).json({ error: 'Compte désactivé.' });

  await checkAndResetQuota(user);
  if (user.daily_quota <= 0) return res.status(429).json({ error: 'Quota journalier épuisé. Réessayez demain après 08h.' });

  if (!text || typeof text !== 'string' || text.trim().length < 10) {
    return res.status(400).json({ error: 'Texte trop court (min 10 caractères).' });
  }

  const trimmed = text.trim();
  const result = detect(trimmed, profile || 'etudiant', docType || 'autre');
  await query('UPDATE users SET daily_quota = daily_quota - 1 WHERE id = $1', [user.id]);
  await createAnalysisLog(user.id, trimmed, result, profile || 'etudiant', docType || 'autre', 'detect');

  res.json({ ...result, quotaRemaining: user.daily_quota - 1 });
});

router.post('/detect/upload', authenticate, upload.array('file', 1), async (req, res) => {
  const { profile, docType } = req.body || {};
  const user = await getUserById(req.user.id);
  if (!user || !user.active) return res.status(403).json({ error: 'Compte désactivé.' });

  const files = req.files || [];
  if (files.length === 0) return res.status(400).json({ error: 'Aucun fichier envoyé.' });

  await checkAndResetQuota(user);
  if (user.daily_quota <= 0) return res.status(429).json({ error: 'Quota journalier épuisé. Réessayez demain après 08h.' });

  const parsed = await parseUploadFiles(files);
  const item = parsed[0];

  if (item.error) {
    return res.status(400).json({ error: item.error });
  }

  const result = detect(item.text, profile || 'etudiant', docType || 'autre');
  await query('UPDATE users SET daily_quota = daily_quota - 1 WHERE id = $1', [user.id]);
  await createAnalysisLog(user.id, item.text, result, profile || 'etudiant', docType || 'autre', 'detect');

  res.json({ ...result, quotaRemaining: user.daily_quota - 1, fileName: item.file.originalname });
});

router.post('/humanize', authenticate, async (req, res) => {
  const { text, profile } = req.body || {};
  const user = await getUserById(req.user.id);
  if (!user || !user.active) return res.status(403).json({ error: 'Compte désactivé.' });

  await checkAndResetQuota(user);
  if (user.daily_quota <= 0) return res.status(429).json({ error: 'Quota journalier épuisé. Réessayez demain après 08h.' });

  if (!text || typeof text !== 'string' || text.trim().length < 10) {
    return res.status(400).json({ error: 'Texte trop court (min 10 caractères).' });
  }

  const humanizedText = humanize(text.trim(), profile || 'professional');
  const result = detect(text.trim(), profile || 'professional', 'autre');
  await query('UPDATE users SET daily_quota = daily_quota - 1 WHERE id = $1', [user.id]);
  await createAnalysisLog(user.id, text.trim(), result, profile || 'professional', 'humanize', 'humanize', humanizedText);

  res.json({ original: text.trim(), humanized: humanizedText, quotaRemaining: user.daily_quota - 1 });
});

router.post('/humanize/upload', authenticate, upload.array('files', 5), async (req, res) => {
  const { profile } = req.body || {};
  const user = await getUserById(req.user.id);
  if (!user || !user.active) return res.status(403).json({ error: 'Compte désactivé.' });

  const files = req.files || [];
  if (files.length === 0) return res.status(400).json({ error: 'Aucun fichier envoyé pour humanisation.' });
  if (files.length > 5) return res.status(400).json({ error: 'Maximum 5 fichiers/documents à la fois.' });

  await checkAndResetQuota(user);
  if (user.daily_quota <= 0) return res.status(429).json({ error: 'Quota journalier épuisé. Réessayez demain après 08h.' });

  const parsed = await parseUploadFiles(files);
  const results = [];
  let successfulCount = 0;

  for (const item of parsed) {
    if (item.error) {
      results.push({ fileName: item.file.originalname, error: item.error });
      continue;
    }

    const humanizedText = humanize(item.text, profile || 'professional');
    const result = detect(item.text, profile || 'professional', 'autre');
    await createAnalysisLog(user.id, item.text, result, profile || 'professional', 'autre', 'humanize', humanizedText);
    results.push({
      fileName: item.file.originalname,
      original: item.text,
      humanized: humanizedText,
      classification: result.classification,
      score: result.score,
    });
    successfulCount += 1;
  }

  if (successfulCount > 0) {
    await query('UPDATE users SET daily_quota = daily_quota - $1 WHERE id = $2', [successfulCount, user.id]);
  }

  res.json({ results, quotaRemaining: user.daily_quota - successfulCount });
});

router.post('/classify', authenticate, async (req, res) => {
  const { text } = req.body || {};
  const user = await getUserById(req.user.id);
  if (!user || !user.active) return res.status(403).json({ error: 'Compte désactivé.' });

  await checkAndResetQuota(user);
  if (user.daily_quota <= 0) return res.status(429).json({ error: 'Quota journalier épuisé. Réessayez demain après 08h.' });

  if (!text || typeof text !== 'string' || text.trim().length < 10) {
    return res.status(400).json({ error: 'Texte trop court (min 10 caractères).' });
  }

  const classification = detect(text.trim(), 'professional', 'classify');
  await query('UPDATE users SET daily_quota = daily_quota - 1 WHERE id = $1', [user.id]);
  await createAnalysisLog(user.id, text.trim(), classification, 'professional', 'classify', 'classify');

  res.json({ classification: classification.classification, score: classification.score, confidence: classification.confidence || 0, quotaRemaining: user.daily_quota - 1 });
});

router.get('/history', authenticate, async (req, res) => {
  const result = await query('SELECT id, text_excerpt, score, classification, profile, doc_type, action_type, created_at FROM analyses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [req.user.id]);
  res.json({ history: result.rows });
});

router.get('/dashboard', authenticate, async (req, res) => {
  const [userResult, countResult] = await Promise.all([
    query('SELECT id, email, subscription, daily_quota, quota_reset_at FROM users WHERE id = $1', [req.user.id]),
    query('SELECT COUNT(*)::int as total_analyses FROM analyses WHERE user_id = $1', [req.user.id]),
  ]);
  const user = userResult.rows[0];
  res.json({ user: sanitizeUser(user), analytics: countResult.rows[0] });
});

router.get('/admin/stats', authenticate, requireAdmin, async (req, res) => {
  const totalUsers = await query('SELECT COUNT(*)::int as count FROM users');
  const totalAnalyses = await query('SELECT COUNT(*)::int as count FROM analyses');
  const premiumUsers = await query("SELECT COUNT(*)::int as count FROM users WHERE subscription != 'free'");
  res.json({ totalUsers: totalUsers.rows[0].count, totalAnalyses: totalAnalyses.rows[0].count, premiumUsers: premiumUsers.rows[0].count });
});

// ── AVATAR & PROFILE ────────────────────────────────────────────────

// Upload avatar
router.post('/profile/avatar', authenticate, upload.single('avatar'), async (req, res) => {
  const user = await getUserById(req.user.id);
  if (!user || !user.active) return res.status(403).json({ error: 'Compte désactivé.' });

  if (!req.file) return res.status(400).json({ error: 'Aucun fichier envoyé.' });

  // Store as base64 data URI for simplicity (could use file upload service in prod)
  const base64 = req.file.buffer.toString('base64');
  const mime = req.file.mimetype || 'image/png';
  const dataUri = `data:${mime};base64,${base64}`;

  await query('UPDATE users SET avatar_url = $1, updated_at = now() WHERE id = $2', [dataUri, user.id]);
  res.json({ avatar_url: dataUri, message: 'Avatar mis à jour.' });
});

// Update avatar color
router.post('/profile/avatar-color', authenticate, async (req, res) => {
  const { color } = req.body || {};
  const user = await getUserById(req.user.id);
  if (!user || !user.active) return res.status(403).json({ error: 'Compte désactivé.' });
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return res.status(400).json({ error: 'Couleur invalide (format hex #RRGGBB).' });

  await query('UPDATE users SET avatar_color = $1, updated_at = now() WHERE id = $2', [color, user.id]);
  res.json({ avatar_color: color });
});

// ── BACKGROUND COLOR ────────────────────────────────────────────────

router.post('/profile/background-color', authenticate, async (req, res) => {
  const { color } = req.body || {};
  const user = await getUserById(req.user.id);
  if (!user || !user.active) return res.status(403).json({ error: 'Compte désactivé.' });
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return res.status(400).json({ error: 'Couleur invalide (format hex #RRGGBB).' });

  await query('UPDATE users SET background_color = $1, updated_at = now() WHERE id = $2', [color, user.id]);
  res.json({ background_color: color });
});

// ── OLLAMA / AI STATUS ──────────────────────────────────────────────

router.get('/ai/status', async (req, res) => {
  const available = await checkOllama();
  res.json({
    ollamaAvailable: available,
    model: process.env.OLLAMA_MODEL || 'hopeveri-fable5',
  });
});

// Enhanced detect with AI (Ollama) — falls back to rule-based
router.post('/detect/ai', authenticate, async (req, res) => {
  const { text, profile, docType } = req.body || {};
  const user = await getUserById(req.user.id);
  if (!user || !user.active) return res.status(403).json({ error: 'Compte désactivé.' });

  await checkAndResetQuota(user);
  if (user.daily_quota <= 0) return res.status(429).json({ error: 'Quota journalier épuisé.' });
  if (!text || typeof text !== 'string' || text.trim().length < 10) {
    return res.status(400).json({ error: 'Texte trop court (min 10 caractères).' });
  }

  const trimmed = text.trim();
  let result = await detectWithAI(trimmed, profile, docType);

  if (!result) {
    // Fallback to rule-based
    result = detect(trimmed, profile || 'etudiant', docType || 'autre');
    result.aiEnhanced = false;
  } else {
    result.aiEnhanced = true;
  }

  await query('UPDATE users SET daily_quota = daily_quota - 1 WHERE id = $1', [user.id]);
  await createAnalysisLog(user.id, trimmed, result, profile || 'etudiant', docType || 'autre', 'detect_ai');

  res.json({ ...result, quotaRemaining: user.daily_quota - 1 });
});

// Enhanced hopeIA chat (Ollama) — falls back to rule-based
router.post('/hopeia/chat', authenticate, async (req, res) => {
  const { text, profile } = req.body || {};
  const user = await getUserById(req.user.id);
  if (!user || !user.active) return res.status(403).json({ error: 'Compte désactivé.' });

  await checkAndResetQuota(user);
  if (user.daily_quota <= 0) return res.status(429).json({ error: 'Quota journalier épuisé.' });
  if (!text || typeof text !== 'string' || text.trim().length < 10) {
    return res.status(400).json({ error: 'Texte trop court (min 10 caractères).' });
  }

  const trimmed = text.trim();
  let humanizedText = await humanizeWithAI(trimmed, profile);

  if (!humanizedText) {
    humanizedText = humanize(trimmed, profile || 'professional');
  }

  const result = detect(trimmed, profile || 'professional', 'autre');
  await query('UPDATE users SET daily_quota = daily_quota - 1 WHERE id = $1', [user.id]);
  await createAnalysisLog(user.id, trimmed, result, profile || 'professional', 'humanize', 'humanize_ai', humanizedText);

res.json({ original: trimmed, humanized: humanizedText, quotaRemaining: user.daily_quota - 1 });
});

// Enhanced humanize with AI (Ollama) — falls back to rule-based
router.post('/humanize/ai', authenticate, async (req, res) => {
  // Backward compatibility for the existing humanize-with-AI endpoint.
  const { text, profile } = req.body || {};
  const user = await getUserById(req.user.id);
  if (!user || !user.active) return res.status(403).json({ error: 'Compte désactivé.' });

  await checkAndResetQuota(user);
  if (user.daily_quota <= 0) return res.status(429).json({ error: 'Quota journalier épuisé.' });
  if (!text || typeof text !== 'string' || text.trim().length < 10) {
    return res.status(400).json({ error: 'Texte trop court (min 10 caractères).' });
  }

  const trimmed = text.trim();
  let humanizedText = await humanizeWithAI(trimmed, profile);

  if (!humanizedText) {
    humanizedText = humanize(trimmed, profile || 'professional');
  }

  const result = detect(trimmed, profile || 'professional', 'autre');
  await query('UPDATE users SET daily_quota = daily_quota - 1 WHERE id = $1', [user.id]);
  await createAnalysisLog(user.id, trimmed, result, profile || 'professional', 'humanize', 'humanize_ai', humanizedText);

  res.json({ original: trimmed, humanized: humanizedText, quotaRemaining: user.daily_quota - 1 });
});

module.exports = router;
