/**
 * Text humanizer — transforms AI-like text into more human-like text.
 * Introduces controlled imperfections, style variation, and natural phrasing.
 */

const casualOpeners = [
  'Franchement,', 'En vrai,', 'Pour être honnête,', 'Écoute,', 'Bon,', 'Tu vois,',
  'Je trouve que', "À mon avis,", "Je dirais que", "D'après moi,",
];

const hesitationFillers = [
  '', '', '', '', '', 'euh', 'enfin', 'disons', 'genre', 'quoi', 'tu vois',
];

const sentenceStarters = [
  'C\'est', 'On peut dire que', 'Ce qui est intéressant, c\'est que',
  'Le truc, c\'est que', 'Il faut quand même dire que', 'Je pense que',
  'En tout cas,', 'Du coup,', 'Après,', 'Bref,',
];

const profilePrefixes = {
  eleve: ['Tu sais,', 'Honnêtement,', 'En tant qu\'élève,'],
  etudiant: ['En tant qu\'étudiant,', 'Pour un étudiant,', 'Dans mon cas,'],
  travailleur: ['Dans le cadre professionnel,', 'Au travail,', 'Sur le plan métier,'],
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalizeSentence(sentence) {
  let s = sentence.trim();
  if (!s) return s;
  s = s.replace(/\s+/g, ' ');
  if (!/[.!?]$/.test(s)) s += '.';
  return s;
}

function softenFormalExpression(text) {
  return text
    .replace(/\b(cependant|néanmoins|toutefois)\b/gi, () => pick(['mais', 'en fait', 'après']))
    .replace(/\b(par conséquent|en conséquence)\b/gi, () => pick(['donc', 'du coup', 'alors']))
    .replace(/\b(en outre|de surcroît|par ailleurs)\b/gi, () => pick(['en plus', 'aussi', 'et puis']))
    .replace(/\b(en définitive|finalement|pour conclure)\b/gi, () => pick(['au final', 'bref', 'en gros']));
}

function humanizeSentence(sentence) {
  let s = sentence.trim();
  if (!s) return s;

  if (Math.random() < 0.4) {
    s = softenFormalExpression(s);
  }

  if (Math.random() < 0.35) {
    s = pick(casualOpeners) + ' ' + s.charAt(0).toLowerCase() + s.slice(1);
  }

  if (Math.random() < 0.2) {
    const filler = pick(hesitationFillers);
    if (filler) {
      const words = s.split(' ');
      const pos = Math.min(words.length - 1, Math.max(1, Math.floor(Math.random() * words.length)));
      words.splice(pos, 0, filler);
      s = words.join(' ');
    }
  }

  if (Math.random() < 0.15) {
    const starter = pick(sentenceStarters);
    s = starter + ' ' + s.charAt(0).toLowerCase() + s.slice(1);
  }

  return normalizeSentence(s);
}

function rewriteParagraph(paragraph, profile) {
  const sentences = paragraph.split(/(?<=[.!?])\s+/).filter(Boolean).map(normalizeSentence);
  const prefix = pick(profilePrefixes[profile] || []);
  let transformed = sentences.map((sentence) => humanizeSentence(sentence));

  if (transformed.length > 1 && Math.random() < 0.35) {
    transformed = shuffle(transformed);
  }

  let output = transformed.join(' ');
  if (prefix && Math.random() < 0.4) {
    output = `${prefix} ${output}`;
  }

  return output.replace(/\s+/g, ' ').trim();
}

function humanize(text, profile = 'etudiant') {
  const trimmed = String(text || '').trim();
  const paragraphs = trimmed.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  if (paragraphs.length === 0) return trimmed;

  const result = paragraphs.map((paragraph) => {
    if (paragraph.length < 80) {
      return humanizeSentence(paragraph);
    }
    return rewriteParagraph(paragraph, profile);
  });

  let output = result.join('\n\n');
  output = softenFormalExpression(output);
  output = output.replace(/\s{2,}/g, ' ');
  output = output.replace(/\b(je\s+serais|je\s+serai)\b/gi, 'je serai');
  if (Math.random() < 0.3) {
    output = output.replace(/\./g, (match) => (Math.random() < 0.08 ? '...' : match));
  }

  return output.trim();
}

module.exports = { humanize };
