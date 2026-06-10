'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '../../components/ui/Sidebar';
import { useAuth } from '../../context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export default function HistoriquePage() {
  const { token } = useAuth();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      if (!token) {
        setError('Connecte-toi pour voir ton historique.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/history`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'Impossible de charger l’historique.');
        setHistory(data.history || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Impossible de charger l’historique.');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [token]);

  return (
    <div className="min-h-screen bg-surface text-white px-6 py-10 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[280px_1fr]">
        <Sidebar />

        <main className="rounded-[28px] border border-white/10 bg-white/5 p-8 shadow-soft backdrop-blur-xl">
          <h1 className="text-3xl font-semibold text-white">Historique</h1>
          <p className="mt-4 max-w-2xl text-slate-300">Visualise les dernières actions, scores IA et types d’analyse réalisés sur ton compte.</p>

          {loading ? (
            <p className="mt-8 text-slate-300">Chargement de l’historique…</p>
          ) : error ? (
            <p className="mt-8 text-rose-400">{error}</p>
          ) : history.length === 0 ? (
            <p className="mt-8 text-slate-300">Aucun historique trouvé pour le moment.</p>
          ) : (
            <div className="mt-8 space-y-4">
              {history.map((item) => (
                <div key={item.id} className="rounded-3xl border border-white/10 bg-surface/80 p-5">
                  <p className="text-sm text-slate-400">{new Date(item.created_at).toLocaleString('fr-FR')}</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">{item.action_type}</h2>
                  <p className="mt-2 text-slate-300">{item.text_excerpt}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-400">
                    <span>{item.classification || 'Sans classification'}</span>
                    <span>{item.profile}</span>
                    <span>{item.doc_type}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
