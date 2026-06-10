'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

function ConfirmEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Vérification en cours...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Aucun token de confirmation trouvé.');
      return;
    }

    fetch(`${API_URL}/api/auth/confirm?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erreur de confirmation.');
        setStatus('success');
        setMessage(data.message || 'Email confirmé avec succès.');
      })
      .catch((error) => {
        setStatus('error');
        setMessage(error.message || 'Impossible de confirmer l\u0027email.');
      });
  }, [token]);

  return (
    <div className="min-h-screen bg-surface text-white px-6 py-10 lg:px-10">
      <div className="mx-auto max-w-3xl rounded-[30px] border border-white/10 bg-white/5 p-12 shadow-soft backdrop-blur-xl">
        <h1 className="text-4xl font-semibold text-white">Confirmation d'email</h1>
        <p className="mt-4 text-slate-300">{message}</p>
        <div className="mt-8 rounded-[24px] border border-white/10 bg-surface/80 p-6">
          <p className={status === 'success' ? 'text-emerald-300' : status === 'error' ? 'text-rose-400' : 'text-slate-300'}>
            {status === 'loading' ? 'Vérification en cours…' : status === 'success' ? 'Votre compte est maintenant confirmé.' : 'Une erreur est survenue pendant la confirmation.'}
          </p>
        </div>
      </div>
    </div>
  );
}

function ConfirmEmailLoading() {
  return (
    <div className="min-h-screen bg-surface text-white px-6 py-10 lg:px-10">
      <div className="mx-auto max-w-3xl rounded-[30px] border border-white/10 bg-white/5 p-12 shadow-soft backdrop-blur-xl">
        <h1 className="text-4xl font-semibold text-white">Confirmation d'email</h1>
        <p className="mt-4 text-slate-300">Chargement...</p>
      </div>
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={<ConfirmEmailLoading />}>
      <ConfirmEmailContent />
    </Suspense>
  );
}