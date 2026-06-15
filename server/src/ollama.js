/**
 * Ollama integration for HopeVeri
 * Uses a fine-tuned Fable 5 model for enhanced text detection & humanization.
 */

const http = require('http');
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'hopeveri-fable5';

function ollamaRequest(endpoint, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, OLLAMA_HOST);
    const data = JSON.stringify(body);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
      timeout: 30000,
    };

    const req = http.request(options, (res) => {
      let chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        try {
          const text = Buffer.concat(chunks).toString();
          resolve(JSON.parse(text));
        } catch (e) {
          resolve({ error: 'Invalid JSON response from Ollama' });
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.on('timeout', () => { req.destroy(); reject(new Error('Ollama timeout')); });
    req.write(data);
    req.end();
  });
}

let ollamaAvailable = false;

async function checkOllama() {
  try {
    const res = await ollamaRequest('/api/tags', {});
    ollamaAvailable = !res.error;
    return ollamaAvailable;
  } catch {
    ollamaAvailable = false;
    return false;
  }
}

async function detectWithAI(text, profile = 'etudiant', docType = 'autre') {
  if (!ollamaAvailable) {
    await checkOllama();
  }
  if (!ollamaAvailable) return null;

  const prompt = `Analyse ce texte français et détermine s'il a été écrit par un humain ou une IA.

Texte: "${text.slice(0, 2000)}"

Réponds UNIQUEMENT avec un JSON valide: {
  "score": (0-100, plus élevé = plus IA),
  "classification": ("Humain probable"|"Mix IA + humain"|"IA probable"),
  "confidence": (0-100),
  "explication": "explication brève"
}`;

  try {
    const result = await ollamaRequest('/api/generate', {
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      options: { temperature: 0.1, num_predict: 256 },
    });

    if (result?.response) {
      const jsonMatch = result.response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }
  } catch {
    // Fallback to rule-based
  }
  return null;
}

async function humanizeWithAI(text, profile = 'etudiant') {
  if (!ollamaAvailable) {
    await checkOllama();
  }
  if (!ollamaAvailable) return null;

  const profileLabels = {
    eleve: 'un élève (langage simple, naturel)',
    etudiant: 'un étudiant (naturel, quelques variations)',
    travailleur: 'un professionnel (formel mais authentique)',
  };

  const prompt = `Réécris ce texte français pour qu'il sonne comme écrit par ${profileLabels[profile] || 'un humain'}.

Règles:
- Ajoute des imperfections naturelles (hésitations, petites répétitions)
- Varie la longueur des phrases
- Utilise un ton naturel et authentique
- Garde le sens exact
- Supprime les connecteurs trop formels

Texte original: "${text}"

Réponds UNIQUEMENT avec le texte réécrit, sans explication ni guillemets.`;

  try {
    const result = await ollamaRequest('/api/generate', {
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      options: { temperature: 0.7, num_predict: 2048 },
    });

    if (result?.response) {
      return result.response.trim();
    }
  } catch {
    // Fallback
  }
  return null;
}

async function generateAvatarDescription(text) {
  if (!ollamaAvailable) {
    await checkOllama();
  }
  if (!ollamaAvailable) return null;

  const prompt = `Basé sur ce texte, génère une courte description de profil (max 15 mots) en français: "${text.slice(0, 500)}"

Réponds UNIQUEMENT avec la description, sans guillemets.`;

  try {
    const result = await ollamaRequest('/api/generate', {
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      options: { temperature: 0.5, num_predict: 64 },
    });

    if (result?.response) {
      return result.response.trim().slice(0, 200);
    }
  } catch {
    // Fallback
  }
  return null;
}

module.exports = {
  checkOllama,
  detectWithAI,
  humanizeWithAI,
  generateAvatarDescription,
  get ollamaAvailable() { return ollamaAvailable; },
};
