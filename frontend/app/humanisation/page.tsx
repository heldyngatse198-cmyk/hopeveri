'use client';

import { useState } from 'react';
import { Sidebar } from '../../components/ui/Sidebar';
import { useAuth } from '../../context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export default function HumanisationPage() {
  const { token } = useAuth();
  const [text, setText] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [profile, setProfile] = useState('professional');
  const [result, setResult] = useState<string | null>(null);
  const [fileResults, setFileResults] = useState<Array<any> | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setResult(null);
    setFileResults(null);
    if (!token) {
      setError('Connecte-toi pour utiliser l’humanisation.');
      return;
    }

    try {
      setLoading(true);
      let response;
      let data;

      if (files && files.length > 0) {
        const formData = new FormData();
        Array.from(files).forEach((file) => formData.append('files', file));
        formData.append('profile', profile);

        response = await fetch(`${API_URL}/api/humanize/upload`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });
        data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'Erreur pendant l’humanisation de fichiers.');
        setFileResults(data.results || []);
      } else {
        if (!text.trim()) {
          throw new Error('Saisis un texte ou téléverse un document.');
        }
        response = await fetch(`${API_URL}/api/humanize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text, profile }),
        });
        data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'Erreur pendant l’humanisation.');
        setResult(data.humanized);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d’humaniser le texte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface text-white px-6 py-10 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[280px_1fr]">
        <Sidebar />

        <main className="rounded-[28px] border border-white/10 bg-white/5 p-8 shadow-soft backdrop-blur-xl">
          <h1 className="text-3xl font-semibold text-white">Humanisation</h1>
          <p className="mt-4 max-w-2xl text-slate-300">Transforme un texte pour qu’il paraisse naturel, fluide et professionnel.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <label className="block">
              <span className="text-sm text-slate-300">Niveau d’humanisation</span>
              <select value={profile} onChange={(event) => setProfile(event.target.value)} className="mt-2 w-full rounded-3xl border border-white/10 bg-surface/90 px-4 py-3 text-white outline-none">
                <option value="professional">Professionnel</option>
                <option value="advanced">Avancé</option>
                <option value="light">Léger</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm text-slate-300">Texte à humaniser</span>
              <textarea
                rows={10}
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Colle ton texte ici..."
                className="mt-2 w-full rounded-3xl border border-white/10 bg-surface/90 px-4 py-4 text-white outline-none focus:border-cyan-400"
              />
            </label>

            <label className="block">
              <span className="text-sm text-slate-300">Document ou image</span>
              <input
                type="file"
                accept=".pdf,.docx,.png,.jpg,.jpeg,.txt"
                multiple
                onChange={(event) => setFiles(event.target.files)}
                className="mt-2 w-full rounded-3xl border border-white/10 bg-surface/90 px-4 py-3 text-white outline-none file:mr-4 file:rounded-full file:border-0 file:bg-cyan-500 file:px-4 file:py-2 file:text-sm file:font-semibold"
              />
              <p className="mt-2 text-xs text-slate-400">Téléverse jusqu’à 5 fichiers ou images pour humaniser automatiquement le contenu.</p>
            </label>

            {files && files.length > 0 ? (
              <p className="text-sm text-slate-300">Fichiers sélectionnés : {files.length}</p>
            ) : null}

            {error ? <p className="text-sm text-rose-400">{error}</p> : null}

            <button type="submit" disabled={loading} className="inline-flex items-center rounded-3xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-surface transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? 'Humanisation...' : 'Humaniser'}
            </button>
          </form>

          {result ? (
            <div className="mt-10 space-y-4 rounded-[24px] border border-white/10 bg-surface/80 p-6">
              <h2 className="text-2xl font-semibold text-white">Texte humanisé</h2>
              <p className="whitespace-pre-line text-slate-200">{result}</p>
            </div>
          ) : null}

          {fileResults ? (
            <div className="mt-10 space-y-6 rounded-[24px] border border-white/10 bg-surface/80 p-6">
              <h2 className="text-2xl font-semibold text-white">Résultats d’humanisation</h2>
              {fileResults.map((item) => (
                <div key={item.fileName} className="rounded-2xl border border-white/10 bg-surface-90 p-4">
                  <h3 className="text-lg font-semibold text-white">{item.fileName}</h3>
                  {item.error ? (
                    <p className="mt-2 text-sm text-rose-400">{item.error}</p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      <p className="text-sm text-slate-300">Texte détecté :</p>
                      <p className="whitespace-pre-line text-slate-200">{item.original}</p>
                      <p className="text-sm text-slate-300">Texte humanisé :</p>
                      <p className="whitespace-pre-line text-slate-200">{item.humanized}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
