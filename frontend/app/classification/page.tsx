'use client';

import { useState } from 'react';
import { Sidebar } from '../../components/ui/Sidebar';
import { useAuth } from '../../context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export default function ClassificationPage() {
  const { token } = useAuth();
  const [text, setText] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setResult(null);
    if (!token) {
      setError('Connecte-toi pour classifier un texte.');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/classify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Erreur de classification.');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de classifier le texte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface text-white px-6 py-10 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[280px_1fr]">
        <Sidebar />

        <main className="rounded-[28px] border border-white/10 bg-white/5 p-8 shadow-soft backdrop-blur-xl">
          <h1 className="text-3xl font-semibold text-white">Classification intelligente</h1>
          <p className="mt-4 max-w-2xl text-slate-300">Analyse rapidement un texte pour déterminer son usage et sa classe métier.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <label className="block">
              <span className="text-sm text-slate-300">Texte à classifier</span>
              <textarea
                rows={10}
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Colle ton texte ici..."
                className="mt-2 w-full rounded-3xl border border-white/10 bg-surface/90 px-4 py-4 text-white outline-none focus:border-cyan-400"
              />
            </label>

            {error ? <p className="text-sm text-rose-400">{error}</p> : null}

            <button type="submit" disabled={loading} className="inline-flex items-center rounded-3xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-surface transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? 'Classification...' : 'Classifier'}
            </button>
          </form>

          {result ? (
            <div className="mt-10 rounded-[24px] border border-white/10 bg-surface/80 p-6">
              <h2 className="text-2xl font-semibold text-white">Résultat</h2>
              <div className="mt-4 space-y-3 text-slate-200">
                <p><span className="font-semibold text-white">Catégorie :</span> {result.classification}</p>
                <p><span className="font-semibold text-white">Score :</span> {result.score}</p>
                <p><span className="font-semibold text-white">Confiance :</span> {result.confidence || 'N/A'}</p>
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}
