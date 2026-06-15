'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ArrowRight, Eye, EyeOff, LogIn, Lock, Mail } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la connexion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface text-white px-6 py-10 lg:px-10">
      <div className="mx-auto max-w-3xl rounded-[30px] border border-white/10 bg-white/5 p-10 shadow-soft backdrop-blur-xl">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 text-surface shadow-lg shadow-cyan-500/20">
              <LogIn size={22} />
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Connexion</h1>
              <p className="mt-1 text-sm text-slate-300">Accédez à votre espace HopeVeri</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium uppercase tracking-[0.1em] text-slate-300">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="ton@email.com"
                className="w-full rounded-2xl border border-white/10 bg-surface/70 px-10 py-3 text-sm text-white placeholder:text-slate-400 outline-none focus:border-cyan-400/40"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium uppercase tracking-[0.1em] text-slate-300">Mot de passe</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full rounded-2xl border border-white/10 bg-surface/70 px-10 py-3 text-sm text-white placeholder:text-slate-400 outline-none focus:border-cyan-400/40"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-1 text-slate-300/70 hover:text-white"
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm font-semibold text-rose-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500 to-violet-500 px-5 py-3 text-sm font-semibold text-surface shadow-soft transition hover:opacity-95 disabled:opacity-60"
          >
            {loading ? 'Connexion...' : (
              <>
                <LogIn size={16} /> Se connecter
              </>
            )}
          </button>

          <div className="flex items-center justify-between gap-4 pt-2">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-cyan-400/30"
            >
              Créer un compte <ArrowRight size={16} />
            </Link>

            <div className="text-xs text-slate-400">Astuce : vérifie NEXT_PUBLIC_API_URL (backend).</div>
          </div>
        </form>
      </div>
    </div>
  );
}

