'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const data = await register(email, password);
      setMessage(data?.message || 'Compte créé. Vérifie ton email pour confirmer ton adresse avant connexion.');
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de l’inscription.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface text-white px-6 py-10 lg:px-10">
      <div className="mx-auto max-w-3xl rounded-[30px] border border-white/10 bg-white/5 p-10 shadow-soft backdrop-blur-xl">
        <h1 className="text-4xl font-semibold text-white">Créer un compte</h1>
        <p className="mt-3 text-slate-300">Inscris-toi pour accéder aux analyses IA, à l’humanisation et aux offres premium.</p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="mt-2 w-full rounded-3xl border border-white/10 bg-surface/90 px-4 py-3 text-white outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="mt-2 w-full rounded-3xl border border-white/10 bg-surface/90 px-4 py-3 text-white outline-none focus:border-cyan-400"
            />
          </div>

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-300">{message}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-3xl bg-violet-500 px-6 py-3 text-sm font-semibold text-surface transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Enregistrement...' : 'Créer mon compte'}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-400">
          Déjà inscrit ?{' '}
          <Link href="/login" className="font-semibold text-cyan-300 hover:text-cyan-200">
            Connecte-toi
          </Link>
        </p>
      </div>
    </div>
  );
}
