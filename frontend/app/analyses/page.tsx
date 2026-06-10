'use client';

import { useState } from 'react';
import { Sidebar } from '../../components/ui/Sidebar';
import { useAuth } from '../../context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export default function AnalysesPage() {
  const { token } = useAuth();
  const [text, setText] = useState('');
  const [docType, setDocType] = useState('autre');
  const [profile, setProfile] = useState('etudiant');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setResult(null);
    if (!token) {
      setError('Connecte-toi pour lancer une analyse.');
      return;
    }

    if (!text.trim()) {
      setError('Veuillez entrer du texte ou uploader un fichier.');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/detect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text, docType, profile }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Erreur lors de l\'analyse.');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d\'analyser le texte.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!token) {
      setError('Connecte-toi pour uploader un fichier.');
      return;
    }

    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg', 'text/plain'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(txt|pdf|docx|png|jpg|jpeg)$/i)) {
      setError('Type de fichier non supporté. Utilisez PDF, DOCX, PNG, JPG ou TXT.');
      return;
    }

    try {
      setUploading(true);
      setError('');
      setResult(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('profile', profile);
      formData.append('docType', docType);

      const response = await fetch(`${API_URL}/api/detect/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Erreur lors de l\'analyse du fichier.');

      setResult(data);
      setUploadedFileName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d\'analyser le fichier.');
    } finally {
      setUploading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score <= 40) return 'text-emerald-400';
    if (score <= 60) return 'text-yellow-400';
    return 'text-rose-400';
  };

  const getScoreLabel = (score: number) => {
    if (score <= 40) return 'Humain';
    if (score <= 60) return 'Mixte';
    return 'IA';
  };

  return (
    <div className="min-h-screen bg-surface text-white px-6 py-10 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[280px_1fr]">
        <Sidebar />

        <main className="rounded-[28px] border border-white/10 bg-white/5 p-8 shadow-soft backdrop-blur-xl">
          <h1 className="text-3xl font-semibold text-white">Analyse de texte</h1>
          <p className="mt-4 max-w-2xl text-slate-300">
            Analysez un texte pour détecter s\'il a été généré par une IA. Vous pouvez coller du texte ou uploader un document (PDF, DOCX, image ou texte).
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm text-slate-300">Type de document</span>
                <select
                  value={docType}
                  onChange={(event) => setDocType(event.target.value)}
                  className="mt-2 w-full rounded-3xl border border-white/10 bg-surface/90 px-4 py-3 text-white outline-none focus:border-cyan-400"
                >
                  <option value="autre">Autre</option>
                  <option value="devoir">Devoir</option>
                  <option value="cv">CV</option>
                  <option value="lettre">Lettre</option>
                  <option value="article">Article</option>
                  <option value="rapport">Rapport</option>
                  <option value="courrier">Courrier</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm text-slate-300">Profil</span>
                <select
                  value={profile}
                  onChange={(event) => setProfile(event.target.value)}
                  className="mt-2 w-full rounded-3xl border border-white/10 bg-surface/90 px-4 py-3 text-white outline-none focus:border-cyan-400"
                >
                  <option value="eleve">Élève</option>
                  <option value="etudiant">Étudiant</option>
                  <option value="travailleur">Professionnel</option>
                </select>
              </label>
            </div>

            {/* File Upload Section */}
            <div className="rounded-3xl border border-white/10 bg-surface/50 p-6">
              <span className="text-sm text-slate-300">Uploader un fichier</span>
              <div className="mt-3 flex items-center gap-4">
                <label className="flex-1 cursor-pointer rounded-3xl border-2 border-dashed border-white/20 bg-surface/90 px-4 py-6 text-center transition hover:border-cyan-400">
                  <input
                    type="file"
                    accept=".txt,.pdf,.docx,.png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  <div className="text-slate-400">
                    {uploading ? (
                      <span>Analyse en cours...</span>
                    ) : (
                      <span>Cliquez pour sélectionner un fichier (PDF, DOCX, PNG, JPG, TXT)</span>
                    )}
                  </div>
                </label>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-surface px-4 text-slate-400">ou coller du texte</span>
              </div>
            </div>

            <label className="block">
              <span className="text-sm text-slate-300">Texte à analyser</span>
              <textarea
                rows={10}
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Collez votre texte ici (minimum 10 caractères)..."
                className="mt-2 w-full rounded-3xl border border-white/10 bg-surface/90 px-4 py-4 text-white outline-none focus:border-cyan-400"
              />
            </label>

            {error ? <p className="text-sm text-rose-400">{error}</p> : null}

            <button
              type="submit"
              disabled={loading || uploading}
              className="inline-flex items-center rounded-3xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-surface transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Analyse en cours...' : 'Lancer l\'analyse'}
            </button>
          </form>

          {result ? (
            <div className="mt-10 rounded-[24px] border border-white/10 bg-surface/80 p-6">
              <h2 className="text-2xl font-semibold text-white">
                Résultat{uploadedFileName && ` - ${uploadedFileName}`}
              </h2>

              {/* Score Display */}
              <div className="mt-6 flex items-center gap-6">
                <div className="relative">
                  <div className="h-32 w-32 rounded-full border-4 border-white/10 bg-surface flex items-center justify-center">
                    <div className="text-center">
                      <p className={`text-4xl font-bold ${getScoreColor(result.score)}`}>
                        {result.score}
                      </p>
                      <p className="text-xs text-slate-400">/ 100</p>
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="rounded-3xl bg-white/5 p-4">
                    <p className="text-sm text-slate-400">Classification</p>
                    <p className={`mt-1 text-2xl font-semibold ${getScoreColor(result.score)}`}>
                      {result.classification}
                    </p>
                    <p className="text-sm text-slate-500">
                      Confiance : {result.confidence}%
                    </p>
                  </div>
                  <div className="mt-3 rounded-3xl bg-white/5 p-4">
                    <p className="text-sm text-slate-400">Score humain</p>
                    <p className="mt-1 text-2xl font-semibold text-emerald-400">
                      {result.humanScore}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Quota */}
              <div className="mt-6 rounded-3xl bg-white/5 p-4">
                <p className="text-sm text-slate-400">Quota restant</p>
                <p className="mt-1 text-2xl font-semibold text-white">
                  {result.quotaRemaining} analyses
                </p>
              </div>

              {/* Details */}
              {result.details && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-white">Détails de l'analyse</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-3xl bg-white/5 p-4">
                      <p className="text-sm text-slate-400">Tokens</p>
                      <p className="mt-1 text-lg font-semibold text-white">
                        {result.details.tokens}
                      </p>
                    </div>
                    <div className="rounded-3xl bg-white/5 p-4">
                      <p className="text-sm text-slate-400">Phrases</p>
                      <p className="mt-1 text-lg font-semibold text-white">
                        {result.details.sentences}
                      </p>
                    </div>
                    <div className="rounded-3xl bg-white/5 p-4">
                      <p className="text-sm text-slate-400">Longueur moyenne des mots</p>
                      <p className="mt-1 text-lg font-semibold text-white">
                        {result.details.avgWordLen} caractères
                      </p>
                    </div>
                    <div className="rounded-3xl bg-white/5 p-4">
                      <p className="text-sm text-slate-400">Longueur moyenne des phrases</p>
                      <p className="mt-1 text-lg font-semibold text-white">
                        {result.details.avgSentLen} mots
                      </p>
                    </div>
                  </div>

                  {/* Breakdown */}
                  {result.details.breakdown && (
                    <div className="mt-6 space-y-3">
                      <h4 className="text-md font-semibold text-white">Analyse détaillée</h4>
                      {result.details.breakdown.map((item: { label: string; note: string }, index: number) => (
                        <div key={index} className="rounded-3xl bg-white/5 p-4">
                          <p className="text-sm font-semibold text-cyan-300">{item.label}</p>
                          <p className="mt-1 text-sm text-slate-300">{item.note}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}