'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sidebar } from '../../components/ui/Sidebar';
import { useAuth } from '../../context/AuthContext';

const plans = [
  {
    name: 'Mensuel',
    id: 'monthly',
    price: 1000,
    description: 'Accès complet aux workflows premium, exports et quota élargi.',
  },
  {
    name: 'Annuel',
    id: 'yearly',
    price: 2500,
    description: 'Utilisation prolongée, quotas boostés et rapport élargi.',
  },
];

const documentTypes = [
  'CV',
  'Lettres de motivation',
  'Contrats',
  'Factures',
  'Rapports',
  'Documents administratifs',
  'Tous les documents',
];

export default function AbonnementPage() {
  const { user, token, subscribePlan } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [emailStatus, setEmailStatus] = useState<{ connected: boolean; provider: string | null } | null>(null);
  const [selectedProvider, setSelectedProvider] = useState('gmail');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [documentPreferences, setDocumentPreferences] = useState<string[]>(documentTypes);

  useEffect(() => {
    if (!token) return;

    const fetchStatus = async () => {
      const response = await fetch(`/api/email/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setEmailStatus(data);
      }
    };

    const fetchPremiumSettings = async () => {
      const response = await fetch(`/api/premium/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setAutoSyncEnabled(data.autoSyncEnabled ?? false);
        setDocumentPreferences(data.documentPreferences?.length ? data.documentPreferences : documentTypes);
      }
    };

    fetchStatus().catch(() => {});
    fetchPremiumSettings().catch(() => {});
  }, [token]);

  const handlePurchase = async (planId: 'monthly' | 'yearly') => {
    setError('');
    setMessage('');
    if (!token) {
      setError('Connecte-toi pour souscrire.');
      return;
    }

    try {
      setLoading(true);
      await subscribePlan(planId);
      setMessage(`Abonnement ${planId === 'monthly' ? 'mensuel' : 'annuel'} activé avec succès.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de souscrire pour le moment.');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectEmail = async () => {
    setError('');
    setMessage('');
    if (!token) {
      setError('Connecte-toi pour connecter une boîte mail.');
      return;
    }

    const response = await fetch(`/api/email/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ provider: selectedProvider }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'Impossible de connecter la boîte mail.');
      return;
    }

    setEmailStatus({ connected: true, provider: data.provider });
    setMessage(`Connexion ${data.provider} activée.`);
  };

  const handleSaveSettings = async () => {
    setError('');
    setMessage('');
    if (!token) {
      setError('Connecte-toi pour enregistrer les paramètres.');
      return;
    }

    const response = await fetch(`/api/premium/settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ autoSyncEnabled, documentPreferences, customRules: [] }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'Impossible d’enregistrer les paramètres.');
      return;
    }

    setMessage(data.message || 'Paramètres enregistrés.');
  };

  const toggleDocument = (documentType: string) => {
    setDocumentPreferences((current) =>
      current.includes(documentType)
        ? current.filter((item) => item !== documentType)
        : [...current, documentType]
    );
  };

  return (
    <div className="min-h-screen bg-surface text-white px-6 py-10 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[280px_1fr]">
        <Sidebar />

        <main className="space-y-8 rounded-[28px] border border-white/10 bg-white/5 p-8 shadow-soft backdrop-blur-xl">
          <div>
            <h1 className="text-3xl font-semibold text-white">Abonnement premium</h1>
            <p className="mt-4 max-w-2xl text-slate-300">
              Active ton assistant documentaire et profite de l’analyse automatique des documents depuis ta messagerie.
            </p>
          </div>

          {!token ? (
            <div className="rounded-[24px] border border-cyan-500/20 bg-surface/70 p-6 text-slate-200">
              <p>Tu dois être connecté pour activer un abonnement.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/login" className="rounded-3xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-surface">
                  Se connecter
                </Link>
                <Link href="/register" className="rounded-3xl border border-white/10 px-5 py-3 text-sm text-white">
                  Créer un compte
                </Link>
              </div>
            </div>
          ) : null}

          <section className="grid gap-6 xl:grid-cols-2">
            {plans.map((plan) => (
              <div key={plan.id} className="rounded-[24px] border border-white/10 bg-surface/80 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">{plan.name}</p>
                    <p className="mt-3 text-4xl font-semibold text-white">{plan.price} CFA</p>
                  </div>
                  <span className="rounded-3xl bg-white/5 px-4 py-2 text-sm text-slate-300">
                    {plan.id === 'monthly' ? 'Plan Pro' : 'Plan Annuel'}
                  </span>
                </div>
                <p className="mt-6 text-slate-300">{plan.description}</p>
                <button
                  type="button"
                  onClick={() => handlePurchase(plan.id as 'monthly' | 'yearly')}
                  disabled={loading}
                  className="mt-8 inline-flex w-full items-center justify-center rounded-3xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-surface transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Traitement...' : `Souscrire à ${plan.name}`}
                </button>
              </div>
            ))}
          </section>

          {user ? (
            <section className="rounded-[24px] border border-white/10 bg-white/5 p-6">
              <div className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-[24px] border border-white/10 bg-surface/80 p-6">
                  <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">Statut du compte</p>
                  <p className="mt-3 text-white">Email : {user.email}</p>
                  <p className="text-slate-300">Abonnement : {user.subscription}</p>
                  <p className="text-slate-300">Quota journalier : {user.daily_quota}</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-surface/80 p-6">
                  <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">Connexion email</p>
                  <p className="mt-3 text-white">{emailStatus?.connected ? 'Connecté' : 'Non connecté'}</p>
                  <p className="text-slate-300">Fournisseur : {emailStatus?.provider || 'Aucun'}</p>
                </div>
              </div>
            </section>
          ) : null}

          {user ? (
            <section className="grid gap-6 xl:grid-cols-2 rounded-[24px] border border-white/10 bg-surface/80 p-6">
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">Connexion mail</h2>
                <p className="text-slate-300">Connecte Gmail, Outlook ou IMAP pour importer automatiquement tes documents premium.</p>
                <label className="flex flex-col gap-3 text-slate-300">
                  <span>Fournisseur</span>
                  <select
                    value={selectedProvider}
                    onChange={(event) => setSelectedProvider(event.target.value)}
                    className="rounded-3xl border border-white/10 bg-surface/90 px-4 py-3 text-white outline-none focus:border-cyan-400"
                  >
                    <option value="gmail">Gmail</option>
                    <option value="outlook">Outlook</option>
                    <option value="microsoft365">Microsoft 365</option>
                    <option value="imap">IMAP professionnel</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={handleConnectEmail}
                  className="inline-flex w-full items-center justify-center rounded-3xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-surface transition hover:bg-cyan-400"
                >
                  {emailStatus?.connected ? 'Reconnecter la boîte mail' : 'Connecter ma boîte mail'}
                </button>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-white">Préférences</h2>
                <p className="text-slate-300">Choisis les types de documents que HopeVeri doit récupérer automatiquement.</p>
                <div className="grid gap-3">
                  {documentTypes.map((doc) => (
                    <label key={doc} className="flex items-center gap-3 rounded-3xl border border-white/10 bg-surface/85 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={documentPreferences.includes(doc)}
                        onChange={() => toggleDocument(doc)}
                        className="h-4 w-4 accent-cyan-400"
                      />
                      <span className="text-sm text-slate-200">{doc}</span>
                    </label>
                  ))}
                </div>
                <label className="flex items-center gap-3 rounded-3xl border border-white/10 bg-surface/85 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={autoSyncEnabled}
                    onChange={() => setAutoSyncEnabled((current) => !current)}
                    className="h-4 w-4 accent-cyan-400"
                  />
                  <span className="text-sm text-slate-200">Activer la synchronisation automatique des emails</span>
                </label>
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  className="inline-flex w-full items-center justify-center rounded-3xl bg-violet-500 px-5 py-3 text-sm font-semibold text-surface transition hover:bg-violet-400"
                >
                  Enregistrer les paramètres
                </button>
              </div>
            </section>
          ) : null}

          {message ? <p className="text-emerald-300">{message}</p> : null}
          {error ? <p className="text-rose-400">{error}</p> : null}
        </main>
      </div>
    </div>
  );
}
