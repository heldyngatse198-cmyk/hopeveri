'use client';

import Link from 'next/link';
import { Sidebar } from '../../components/ui/Sidebar';
import { useAuth } from '../../context/AuthContext';

export default function ParametresPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-surface text-white px-6 py-10 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[280px_1fr]">
        <Sidebar />

        <main className="rounded-[28px] border border-white/10 bg-white/5 p-8 shadow-soft backdrop-blur-xl">
          <h1 className="text-3xl font-semibold text-white">Paramètres</h1>
          <p className="mt-4 max-w-2xl text-slate-300">Gère ton compte, ton abonnement et tes préférences SaaS HopeVeri.</p>

          {user ? (
            <div className="mt-8 space-y-6 rounded-[24px] border border-white/10 bg-surface/80 p-6">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">Compte</p>
                <p className="mt-3 text-lg text-white">{user.email}</p>
                <p className="mt-1 text-slate-300">Abonnement : {user.subscription}</p>
                <p className="mt-1 text-slate-300">Quota journalier : {user.daily_quota}</p>
              </div>

              <button onClick={logout} className="inline-flex rounded-3xl bg-rose-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-400">
                Me déconnecter
              </button>
            </div>
          ) : (
            <div className="mt-8 rounded-[24px] border border-white/10 bg-surface/80 p-6 text-slate-300">
              <p>Tu n’es pas connecté.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/login" className="rounded-3xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-surface">
                  Se connecter
                </Link>
                <Link href="/register" className="rounded-3xl border border-white/10 px-5 py-3 text-sm text-white">
                  Créer un compte
                </Link>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
