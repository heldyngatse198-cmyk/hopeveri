'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

type AdminStats = {
  totalUsers: number;
  totalAnalyses: number;
  premiumUsers: number;
};

type AdminUser = {
  id: string;
  email: string;
  role: string;
  subscription: string;
  email_connected: boolean;
  email_provider: string | null;
  active: boolean;
  created_at: string;
};

export default function AdminPage() {
  const { token, user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || user?.role !== 'admin') return;

    const fetchStats = async () => {
      const [statsRes, usersRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const statsData = await statsRes.json();
      const usersData = await usersRes.json();

      if (!statsRes.ok) setError(statsData.error || 'Impossible de charger les statistiques.');
      if (!usersRes.ok) setError(usersData.error || 'Impossible de charger les utilisateurs.');

      if (statsRes.ok) setStats(statsData);
      if (usersRes.ok) setUsers(usersData.users || []);
    };

    fetchStats().catch((err) => setError(err.message || 'Erreur serveur.'));
  }, [token, user]);

  const handleAction = async (userId: string, action: string) => {
    if (!token) return;
    setError('');
    setMessage('');
    const response = await fetch(`${API_URL}/api/admin/user/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId, action }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'Action échouée.');
      return;
    }
    setMessage(data.message || 'Action exécutée.');
    setUsers((current) => current.map((item) => (item.id === userId ? { ...item, active: action !== 'suspend', subscription: action === 'activate_premium' ? 'monthly' : action === 'activate_basic' ? 'free' : item.subscription } : item)));
  };

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-surface text-white px-6 py-10 lg:px-10">
        <div className="mx-auto max-w-3xl rounded-[30px] border border-white/10 bg-white/5 p-10 shadow-soft backdrop-blur-xl">
          <h1 className="text-4xl font-semibold text-white">Admin Panel</h1>
          <p className="mt-4 text-slate-300">Accès réservé aux administrateurs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-white px-6 py-10 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr]">
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-8 shadow-soft backdrop-blur-xl">
          <h1 className="text-4xl font-semibold text-white">Admin Panel</h1>
          <p className="mt-3 text-slate-300">Gère les comptes, les abonnements et surveille l’activité globale.</p>

          {message ? <p className="mt-6 text-emerald-300">{message}</p> : null}
          {error ? <p className="mt-6 text-rose-400">{error}</p> : null}

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-surface/80 p-5">
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">Utilisateurs</p>
              <p className="mt-4 text-3xl font-semibold text-white">{stats?.totalUsers ?? '...'}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-surface/80 p-5">
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">Analyses totales</p>
              <p className="mt-4 text-3xl font-semibold text-white">{stats?.totalAnalyses ?? '...'}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-surface/80 p-5">
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">Premium</p>
              <p className="mt-4 text-3xl font-semibold text-white">{stats?.premiumUsers ?? '...'}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-white/5 p-8 shadow-soft backdrop-blur-xl">
          <h2 className="text-3xl font-semibold text-white">Utilisateurs</h2>
          <div className="mt-6 space-y-4">
            {users.length === 0 ? (
              <p className="text-slate-300">Aucun utilisateur trouvé.</p>
            ) : (
              users.map((item) => (
                <div key={item.id} className="rounded-3xl border border-white/10 bg-surface/80 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">{item.email}</p>
                      <p className="text-sm text-slate-400">{item.role} · {item.subscription} · {item.active ? 'Actif' : 'Suspendu'}</p>
                      <p className="text-sm text-slate-400">Email connecté: {item.email_connected ? item.email_provider : 'Non'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => handleAction(item.id, 'activate_basic')} className="rounded-2xl bg-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-600">Basic</button>
                      <button onClick={() => handleAction(item.id, 'activate_premium')} className="rounded-2xl bg-cyan-500 px-4 py-2 text-sm text-white hover:bg-cyan-400">Premium</button>
                      <button onClick={() => handleAction(item.id, 'suspend')} className="rounded-2xl bg-rose-500 px-4 py-2 text-sm text-white hover:bg-rose-400">Suspendre</button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
