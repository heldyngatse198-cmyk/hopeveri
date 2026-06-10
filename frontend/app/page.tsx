'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Cpu, Feather, Layers, ShieldCheck, Sparkles, UploadCloud, Zap } from 'lucide-react';
import { ActionCard } from '../components/ui/ActionCard';
import { StatCard } from '../components/ui/StatCard';
import { Sidebar } from '../components/ui/Sidebar';
import { ModuleCard } from '../components/ui/ModuleCard';

const ACTIONS = [
  { name: 'Détecter IA', icon: Cpu, description: 'Analyse instantanée de la présence IA dans un texte.' },
  { name: 'Humaniser', icon: Feather, description: 'Transforme ton texte pour le rendre naturel et fluide.' },
  { name: 'Réécrire', icon: Sparkles, description: 'Réécriture complète pour un contenu professionnel.' },
  { name: 'Classifier', icon: Layers, description: 'Classe automatiquement ton document selon son usage.' },
];

const STATS = [
  { label: 'Crédits disponibles', value: '280', accent: true },
  { label: 'Analyses effectuées', value: '1 320' },
  { label: 'Documents humanisés', value: '712' },
  { label: 'Documents réécrits', value: '483' },
  { label: 'Score moyen de confiance', value: '92.4%' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-surface text-white">
      <div className="relative isolate overflow-hidden px-6 py-10 lg:px-10">
        <div className="absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-r from-sky-500/20 via-violet-600/15 to-cyan-400/10 blur-3xl" />
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[320px_1fr] lg:items-start">
          <aside className="space-y-8 rounded-[20px] border border-white/10 bg-white/5 p-6 shadow-soft backdrop-blur-xl lg:sticky lg:top-10">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-white/90">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 text-surface shadow-lg shadow-cyan-500/20">
                  <Zap size={24} />
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-cyan-200/80">HopeVeri</p>
                  <h1 className="text-2xl font-semibold tracking-tight">AI Workspace</h1>
                </div>
              </div>
              <p className="text-sm leading-6 text-slate-300">
                Interface premium pour la détection IA, l’humanisation et la réécriture professionnelle de documents.
              </p>
            </div>
            <nav className="space-y-2">
              {[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Analyses', href: '/analyses' },
                { label: 'Humanisation', href: '/humanisation' },
                { label: 'Réécriture', href: '/reecriture' },
                { label: 'Classification', href: '/classification' },
                { label: 'Historique', href: '/historique' },
                { label: 'Abonnement', href: '/abonnement' },
                { label: 'Paramètres', href: '/parametres' },
              ].map((item) => (
                <Link key={item.label} href={item.href} className="block rounded-2xl border border-white/10 bg-surface/80 px-4 py-3 text-sm text-slate-200 transition hover:border-cyan-400/25 hover:bg-surface/90">
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>

          <main className="space-y-10">
            <section className="rounded-[20px] border border-white/10 bg-white/5 p-8 shadow-soft backdrop-blur-xl">
              <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl space-y-5">
                  <p className="text-sm font-medium uppercase tracking-[0.35em] text-cyan-300/80">HopeVeri AI Workspace</p>
                  <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                    Détection IA, Humanisation et Réécriture Professionnelle de Documents
                  </h2>
                  <p className="max-w-2xl text-lg leading-8 text-slate-300">
                    Un espace intelligent et sécurisé pour analyser, enrichir et exporter tous vos documents avec une qualité SaaS haut de gamme.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-surface transition hover:bg-cyan-400">
                      Accéder au dashboard <ArrowRight size={18} />
                    </Link>
                    <Link href="/register" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-6 py-3 text-sm text-slate-100 transition hover:border-cyan-400/30">
                      Créer un compte
                    </Link>
                    <Link href="/login" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-6 py-3 text-sm text-slate-100 transition hover:border-cyan-400/30">
                      Se connecter
                    </Link>
                  </div>
                </div>

                <div className="min-w-[300px] rounded-[20px] border border-white/10 bg-surface/80 p-6 text-slate-200 shadow-soft backdrop-blur-xl">
                  <p className="text-sm uppercase tracking-[0.3em] text-cyan-200/80">Statistiques rapides</p>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {STATS.slice(0, 4).map((stat) => (
                      <div key={stat.label} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                        <p className="text-sm text-slate-400">{stat.label}</p>
                        <p className="mt-3 text-2xl font-semibold text-white">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[20px] border border-white/10 bg-white/5 p-6 shadow-soft backdrop-blur-xl">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">Actions principales</p>
                    <h3 className="mt-3 text-2xl font-semibold text-white">Sélection rapide</h3>
                  </div>
                  <UploadCloud size={32} className="text-cyan-300" />
                </div>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {ACTIONS.map((action) => (
                    <ActionCard key={action.name} title={action.name} description={action.description} icon={action.icon} href={
                      action.name === 'Détecter IA' ? '/analyses' :
                      action.name === 'Humaniser' ? '/humanisation' :
                      action.name === 'Réécrire' ? '/reecriture' :
                      '/classification'
                    } />
                  ))}
                </div>
              </div>

              <div className="rounded-[20px] border border-white/10 bg-white/5 p-6 shadow-soft backdrop-blur-xl">
                <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">Performance intelligente</p>
                <h3 className="mt-3 text-2xl font-semibold text-white">Score de confiance avancé</h3>
                <p className="mt-4 text-slate-300">
                  HopeVeri combine des métriques de perplexité, burstiness et style rédactionnel pour livrer des rapports de diagnostic clairs.
                </p>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {STATS.map((stat) => (
                    <StatCard key={stat.label} label={stat.label} value={stat.value} accent={stat.accent} />
                  ))}
                </div>
              </div>
            </section>

            <section id="dashboard" className="rounded-[20px] border border-white/10 bg-white/5 p-8 shadow-soft backdrop-blur-xl">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">Aperçu du dashboard</p>
                  <h3 className="mt-3 text-3xl font-semibold text-white">Tableau de bord premium</h3>
                </div>
                <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-2xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-400">
                  Ouvrir le Tableau de bord <ArrowRight size={18} />
                </Link>
              </div>
              <div className="mt-8 grid gap-6 lg:grid-cols-3">
                <ModuleCard title="Upload intelligent" description="Glisser-déposer PDF, DOCX, TXT, JPG, PNG et visualiser l’extraction." icon={UploadCloud} />
                <ModuleCard title="Rapport IA" description="Analyse détaillée de répétitions, perplexité et structure de phrases." icon={ShieldCheck} />
                <ModuleCard title="Export premium" description="Génère instantanément PDF, DOCX et TXT à partir du document réécrit." icon={ArrowRight} />
              </div>
            </section>

            <section id="plans" className="rounded-[20px] border border-white/10 bg-surface/80 p-8 shadow-soft backdrop-blur-xl">
              <div className="grid gap-8 lg:grid-cols-3">
                <div className="rounded-[20px] border border-white/10 bg-white/5 p-6">
                  <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">Gratuit</p>
                  <p className="mt-5 text-4xl font-semibold text-white">Base</p>
                  <p className="mt-4 text-slate-300">Jusqu’à 5 analyses gratuites par jour.</p>
                  <ul className="mt-6 space-y-3 text-slate-300">
                    <li>Détection IA</li>
                    <li>Humanisation légère</li>
                    <li>Historiques basiques</li>
                  </ul>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-gradient-to-br from-cyan-500/20 to-violet-600/20 p-6">
                  <p className="text-sm uppercase tracking-[0.35em] text-cyan-100">Mensuel</p>
                  <p className="mt-5 text-4xl font-semibold text-white">Pro</p>
                  <p className="mt-4 text-slate-200">Accès complet aux workflows premium, exports et intégrations.</p>
                  <ul className="mt-6 space-y-3 text-slate-200">
                    <li>Crédits avancés</li>
                    <li>Export PDF/DOCX/TXT</li>
                    <li>Intégrations Gmail / Outlook</li>
                  </ul>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-white/5 p-6">
                  <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">Annuel</p>
                  <p className="mt-5 text-4xl font-semibold text-white">Entreprise</p>
                  <p className="mt-4 text-slate-300">Solutions sur mesure avec statistiques et support prioritaire.</p>
                  <ul className="mt-6 space-y-3 text-slate-300">
                    <li>Quota illimité</li>
                    <li>Historique complet</li>
                    <li>API & intégrations</li>
                  </ul>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
