/**
 * Rule-based AI text detector - Version améliorée
 * Returns a score 0–100, where higher = more likely AI-generated.
 * 
 * Cet algorithme analyse plusieurs caractéristiques stylistiques et linguistiques
 * pour détecter les textes générés par IA.
 */

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-zàâäéèêëîïôöùûüç0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function sentences(text) {
  return text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
}

function averageWordLength(tokens) {
  if (tokens.length === 0) return 0;
  return tokens.reduce((sum, word) => sum + word.length, 0) / tokens.length;
}

function typeTokenRatio(tokens) {
  if (tokens.length === 0) return 0;
  return new Set(tokens).size / tokens.length;
}

function avgSentenceLength(sentencesArr) {
  if (sentencesArr.length === 0) return 0;
  return sentencesArr.reduce((sum, sentence) => sum + sentence.split(/\s+/).length, 0) / sentencesArr.length;
}

function sentenceLengthVariation(sentencesArr) {
  if (sentencesArr.length < 2) return 0;
  const lengths = sentencesArr.map((sentence) => sentence.split(/\s+/).length);
  const mean = lengths.reduce((acc, value) => acc + value, 0) / lengths.length;
  const variance = lengths.reduce((sum, length) => sum + (length - mean) ** 2, 0) / lengths.length;
  return Math.sqrt(variance) / Math.max(mean, 1);
}

// Marqueurs de style IA courants en français
const AI_FORMAL_MARKERS = [
  'en conclusion', 'en outre', 'par ailleurs', 'cependant', 'néanmoins',
  'toutefois', 'de plus', 'en effet', 'ainsi', 'il est important de',
  'il convient de', 'il faut souligner que', 'notons que', 'soulignons que',
  'dans un monde', 'à l\'ère du', 'de nos jours', 'il est essentiel de',
  'il est crucial de', 'force est de constater', 'en guise de conclusion',
  'pour conclure', 'en définitive', 'finalement', 'en somme', 'somme toute',
  'd\'une part', 'd\'autre part', 'par conséquent', 'en revanche',
  'en ce qui concerne', 'quant à', 'en matière de', 'dans le contexte de',
  'il est à noter que', 'on peut observer que', 'il convient de noter',
  'plus précisément', 'en particulier', 'notamment', 'spécifiquement',
  'de manière générale', 'globalement', 'dans l\'ensemble',
  'il existe', 'on constate', 'on observe', 'il appert',
  'en premier lieu', 'en second lieu', 'en dernier lieu',
  'par ailleurs', 'en outre', 'de surcroît', 'qui plus est',
];

// Marqueurs de style humain (plus informels)
const HUMAN_MARKERS = [
  'je pense', 'je crois', 'à mon avis', 'perso', 'franchement',
  'en fait', 'du coup', 'voilà', 'bon', 'bah', 'hein', 'quoi',
  'tu vois', 'tu sais', 'enfin', 'bref', 'genre', 'euh',
  'je trouve', 'moi je', 'moi aussi', 'pas vraiment', 'un peu',
  'c\'est ça', 'oui oui', 'non non', 'peut-être', 'surement',
  'je sais pas', 'je ne sais pas', 'j\'aime', 'j\'adore',
  'c\'est dommage', 'c\'est bien', 'c\'est mal', 'je me dis',
  'je me demande', 'je me souviens', 'je me disais',
];

// Expressions typiques des IA pour structurer le texte
const AI_STRUCTURE_PATTERNS = [
  /\b(d\'abord|premièrement|deuxièmement|troisièmement|finalement)\b/gi,
  /\b(d\'une part.*d\'autre part)\b/gi,
  /\b(d\'un côté.*de l\'autre côté)\b/gi,
  /\b(non seulement.*mais aussi|mais encore)\b/gi,
  /\b(que ce soit.*ou)\b/gi,
  /\b(que l\'on soit.*ou)\b/gi,
];

// Mots de liaison excessifs (signe d\'écriture IA)
const EXCESSIVE_CONNECTORS = [
  'cependant', 'néanmoins', 'toutefois', 'par ailleurs', 'en outre',
  'de surcroît', 'qui plus est', 'en revanche', 'par contre',
  'en effet', 'ainsi', 'donc', 'par conséquent', 'en conséquence',
  'de ce fait', 'de sorte que', 'si bien que',
];

function detectRepetitiveStructures(text) {
  const lowered = text.toLowerCase();
  let count = 0;
  for (const pattern of AI_FORMAL_MARKERS) {
    const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = lowered.match(regex);
    if (matches) count += matches.length;
  }
  return Math.min(count / Math.max(sentences(text).length, 1), 1);
}

function detectHumanMarkers(text) {
  const lowered = text.toLowerCase();
  let count = 0;
  for (const marker of HUMAN_MARKERS) {
    const regex = new RegExp(`\\b${marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const matches = lowered.match(regex);
    if (matches) count += matches.length;
  }
  return count;
}

function countExcessiveConnectors(text) {
  const lowered = text.toLowerCase();
  let count = 0;
  for (const connector of EXCESSIVE_CONNECTORS) {
    const regex = new RegExp(`\\b${connector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const matches = lowered.match(regex);
    if (matches) count += matches.length;
  }
  return count;
}

function complexityScore(tokens) {
  const markers = ['parce', 'afin', 'toutefois', 'néanmoins', 'cependant', 'de sorte que', 'en revanche'];
  const joined = tokens.join(' ');
  const count = markers.reduce((total, marker) => {
    const matches = joined.match(new RegExp(`\\b${marker}\\b`, 'gi'));
    return total + (matches ? matches.length : 0);
  }, 0);
  return Math.min((count / Math.max(tokens.length, 1)) * 200, 15);
}

function lexicalDiversityScore(tokens) {
  const ttr = typeTokenRatio(tokens);
  // Les IA ont tendance à avoir un vocabulaire plus diversifié mais de manière artificielle
  return Math.min(Math.max((ttr - 0.35) * 100, 0), 35);
}

function structureRegularityScore(sentencesArr) {
  const variation = sentenceLengthVariation(sentencesArr);
  // Les IA ont tendance à avoir des phrases de longueur très régulière
  return Math.min(Math.max((1 - variation) * 30, 0), 30);
}

function connectorDensityScore(sentencesArr, tokens) {
  const connectors = EXCESSIVE_CONNECTORS;
  const joined = tokens.join(' ');
  const count = connectors.reduce((total, connector) => {
    const matches = joined.match(new RegExp(`\\b${connector}\\b`, 'gi'));
    return total + (matches ? matches.length : 0);
  }, 0);
  return Math.min((count / Math.max(sentencesArr.length, 1)) * 20, 20);
}

function repetitivePatternScore(text) {
  return Math.min(detectRepetitiveStructures(text) * 30, 30);
}

function lengthInfluence(tokens) {
  if (tokens.length > 450) return 10;
  if (tokens.length < 35) return -6;
  return 0;
}

function profileAdjustment(score, profile) {
  const adjustments = {
    eleve: -4,
    etudiant: 0,
    travailleur: 5,
  };
  return score + (adjustments[profile] || 0);
}

function docTypeAdjustment(score, docType) {
  const adjustments = {
    devoir: 2,
    cv: -3,
    lettre: 0,
    article: 4,
    rapport: 4,
    courrier: 3,
    autre: 0,
  };
  return score + (adjustments[docType] || 0);
}

function classify(score) {
  if (score <= 40) return 'Humain probable';
  if (score <= 60) return 'Mix IA + humain';
  return 'IA probable';
}

function scoreSummary(score) {
  if (score <= 40) return 'Style naturel et peu documenté. Les marqueurs humains sont présents.';
  if (score <= 60) return 'Texte à risque mixte, surveillez les passages formels et les connecteurs.';
  return 'Style fortement structuré, présence de marqueurs typiques des IA génératives.';
}

function confidenceFromScore(score, tokens) {
  let base = Math.max(45, Math.min(95, 30 + Math.abs(score - 50) * 0.9));
  if (tokens < 60) base -= 5;
  if (tokens > 250) base += 5;
  return Math.round(Math.max(40, Math.min(98, base)));
}

// Nouvelle fonction pour détecter les patterns de structure IA
function aiStructureScore(text) {
  let score = 0;
  for (const pattern of AI_STRUCTURE_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) score += matches.length;
  }
  return Math.min(score * 5, 15);
}

// Nouvelle fonction pour détecter le manque de marqueurs humains
function humanMarkerDeficit(text, tokens) {
  const humanCount = detectHumanMarkers(text);
  const ratio = humanCount / Math.max(tokens.length, 1);
  // Moins il y a de marqueurs humains, plus le score est élevé
  return Math.min(Math.max((0.02 - ratio) * 500, 0), 20);
}

// Nouvelle fonction pour analyser la densité de connecteurs
function connectorOveruseScore(text, sentencesArr) {
  const count = countExcessiveConnectors(text);
  const density = count / Math.max(sentencesArr.length, 1);
  // Les humains utilisent en moyenne 0.5-1 connecteur par phrase
  // Les IA en utilisent souvent 1.5-3
  if (density > 1.5) return Math.min((density - 1.5) * 15, 20);
  return 0;
}

// Analyse de la ponctuation (les IA utilisent moins de variations)
function punctuationVarietyScore(text) {
  const punctuationMarks = text.match(/[.,;:!?«»""''()\-]/g) || [];
  const uniqueMarks = new Set(punctuationMarks).size;
  const totalMarks = punctuationMarks.length;
  
  if (totalMarks === 0) return 5; // Pas de ponctuation = suspect
  
  // Les humains utilisent une plus grande variété de ponctuation
  const varietyRatio = uniqueMarks / Math.min(totalMarks, 10);
  return Math.min(Math.max((1 - varietyRatio) * 10, 0), 10);
}

// Analyse de la longueur des paragraphes (les IA ont des paragraphes très réguliers)
function paragraphRegularityScore(text) {
  const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 0);
  if (paragraphs.length < 2) return 0;
  
  const lengths = paragraphs.map(p => p.trim().split(/\s+/).length);
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, len) => sum + (len - mean) ** 2, 0) / lengths.length;
  const cv = Math.sqrt(variance) / Math.max(mean, 1); // Coefficient de variation
  
  // Les IA ont des paragraphes de longueur très similaire (CV faible)
  return Math.min(Math.max((0.5 - cv) * 20, 0), 15);
}

function detect(text, profile = 'etudiant', docType = 'autre') {
  const tokens = tokenize(text);
  const sentencesArr = sentences(text);

  if (tokens.length < 10) {
    return {
      score: 50,
      classification: 'Mix IA + humain',
      confidence: 52,
      humanScore: 50,
      details: {
        tokens: tokens.length,
        sentences: sentencesArr.length,
        avgWordLen: averageWordLength(tokens).toFixed(1),
        avgSentLen: avgSentenceLength(sentencesArr).toFixed(1),
        breakdown: [
          { label: 'Confiance', note: 'Texte trop court pour une analyse fiable (minimum 10 mots).' },
        ],
      },
    };
  }

  const tokensCount = tokens.length;
  const sentencesCount = sentencesArr.length;
  const avgWordLen = averageWordLength(tokens);

  // Scores individuels
  const lexical = lexicalDiversityScore(tokens);
  const structure = structureRegularityScore(sentencesArr);
  const connector = connectorDensityScore(sentencesArr, tokens);
  const repetition = repetitivePatternScore(text);
  const complexity = complexityScore(tokens);
  const lengthBonus = lengthInfluence(tokens);
  
  // Nouveaux scores
  const aiStructure = aiStructureScore(text);
  const humanDeficit = humanMarkerDeficit(text, tokens);
  const connectorOveruse = connectorOveruseScore(text, sentencesArr);
  const punctuationVariety = punctuationVarietyScore(text);
  const paragraphRegularity = paragraphRegularityScore(text);

  // Calcul du score final avec pondération améliorée
  let score = 
    lexical * 0.8 +           // Richesse lexicale
    structure * 0.7 +         // Régularité de structure
    connector * 1.0 +         // Densité de connecteurs (important)
    repetition * 0.9 +        // Motifs répétitifs
    complexity * 0.6 +        // Complexité syntaxique
    lengthBonus * 0.5 +       // Influence de la longueur
    aiStructure * 1.2 +       // Patterns de structure IA (très important)
    humanDeficit * 1.1 +      // Manque de marqueurs humains (important)
    connectorOveruse * 1.0 +  // Usage excessif de connecteurs
    punctuationVariety * 0.5 + // Variété de ponctuation
    paragraphRegularity * 0.6; // Régularité des paragraphes

  score = profileAdjustment(score, profile);
  score = docTypeAdjustment(score, docType);
  score = Math.round(Math.max(0, Math.min(100, score)));

  const humanScore = Math.round(Math.max(0, Math.min(100, 100 - score + (tokensCount > 80 ? 2 : 0))));
  const confidence = confidenceFromScore(score, tokensCount);

  // Calcul des compteurs pour le breakdown
  const aiMarkerCount = countExcessiveConnectors(text) + Math.floor(repetition * 5);
  const humanMarkerCount = detectHumanMarkers(text);

  const breakdown = [
    {
      label: 'Richesse lexicale',
      note: `Ratio type/token de ${(typeTokenRatio(tokens) * 100).toFixed(1)}%. Un ratio élevé peut indiquer un vocabulaire artificiellement diversifié.`,
    },
    {
      label: 'Régularité de structure',
      note: `Variation de longueur des phrases : ${sentenceLengthVariation(sentencesArr).toFixed(2)}. Les IA ont tendance à uniformiser.`,
    },
    {
      label: 'Connecteurs formels',
      note: `${connector.toFixed(1)} points. Présence de ${countExcessiveConnectors(text)} connecteurs formels détectés.`,
    },
    {
      label: 'Motifs répétitifs',
      note: repetition > 0 ? `${aiMarkerCount} expressions typiques des IA détectées.` : 'Peu de répétitions détectées.',
    },
    {
      label: 'Marqueurs humains',
      note: humanMarkerCount > 0 
        ? `${humanMarkerCount} marqueurs de style humain détectés (bon signe).` 
        : 'Aucun marqueur de style humain détecté (suspect).',
    },
    {
      label: 'Patterns de structure IA',
      note: aiStructure > 0 
        ? `${aiMarkerCount} patterns de structure typiques des IA identifiés.` 
        : 'Aucun pattern de structure IA majeur détecté.',
    },
    {
      label: 'Complexité syntaxique',
      note: complexity > 5 ? 'Texte dense et structuré, typique des générations IA.' : 'Syntaxe plutôt fluide et naturelle.',
    },
    {
      label: 'Conclusion',
      note: scoreSummary(score),
    },
  ];

  return {
    score,
    classification: classify(score),
    confidence,
    humanScore,
    details: {
      tokens: tokensCount,
      sentences: sentencesCount,
      avgWordLen: avgWordLen.toFixed(1),
      avgSentLen: avgSentenceLength(sentencesArr).toFixed(1),
      aiMarkers: aiMarkerCount,
      humanMarkers: humanMarkerCount,
      breakdown,
    },
  };
}

module.exports = { detect };