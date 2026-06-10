'use client';

import { motion } from 'framer-motion';
import { BarChart3, CheckCircle2, FileSearch, MessageSquare, Sparkles, Zap, UserCircle2 } from 'lucide-react';
import { DashboardStat } from '../../components/ui/DashboardStat';
import { Sidebar } from '../../components/ui/Sidebar';

const stats = [
  { label: 'Crédits restants', value: '280', icon: Zap },
  { label: 'Analyses cette semaine', value: '118', icon: BarChart3 },
  { label: 'Documents réécrits', value: '64', icon: Sparkles },
  { label: 'Niveau de confiance', value: '92.4%', icon: CheckCircle2 },
];

const features = [
  { title: 'Upload smart', subtitle: 'Glisser-déposer PDF, DOCX, TXT, JPG, PNG.', icon: FileSearch },
  { title: 'Historique robuste', subtitle: 'Cartes modernes avec score, date et actions.', icon: MessageSquare },
  { title: 'Plan premium', subtitle: 'Cartes offres gratuit, mensuel et annuel.', icon: UserCircle2 },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-surface px-6 py-8 text-white lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[280px_1fr]">
        <Sidebar />

        <section className="space-y-8">
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-8 shadow-soft backdrop-blur-xl">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">Tableau de bord</p>
                <h1 className="mt-3 text-4xl font-semibold text-white">HopeVeri Workspace</h1>
              </div>
              <button className="inline-flex items-center rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-surface transition hover:bg-cyan-400">
                Nouveau document
              </button>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <DashboardStat key={stat.label} title={stat.label} value={stat.value} icon={stat.icon} />
              ))}
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-8 shadow-soft backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">Gestion intelligente</p>
                  <h2 className="mt-3 text-3xl font-semibold text-white">Actions rapides</h2>
                </div>
                <div className="rounded-3xl border border-white/10 bg-surface/70 px-4 py-2 text-sm text-slate-300">Premium only</div>
              </div>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {features.map((feature) => (
                  <div key={feature.title} className="rounded-[20px] border border-white/10 bg-surface/80 p-6">
                    <feature.icon className="mb-4 h-8 w-8 text-cyan-300" />
                    <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                    <p className="mt-3 text-slate-300">{feature.subtitle}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-8 shadow-soft backdrop-blur-xl">
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">Upload intelligent</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">Glisser-déposer et aperçu instantané</h2>
              <p className="mt-4 text-slate-300">Support PDF, DOCX, TXT, JPG, PNG avec retour rapide sur taille, mots et type.</p>
              <div className="mt-8 rounded-[24px] border border-cyan-500/10 bg-surface/70 p-6">
                <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">Statistiques du dernier document</p>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl bg-white/5 p-4">Taille du fichier<br /><strong>1,4 Mo</strong></div>
                  <div className="rounded-3xl bg-white/5 p-4">Nombre de mots<br /><strong>1 280</strong></div>
                  <div className="rounded-3xl bg-white/5 p-4">Type détecté<br /><strong>PDF / Rapport</strong></div>
                  <div className="rounded-3xl bg-white/5 p-4">Progression<br /><strong>82%</strong></div>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/5 p-8 shadow-soft backdrop-blur-xl">
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">Historique récent</p>
              <h2 className="mt-3 text-3xl font-semibold text-white">Dernières analyses</h2>
              <div className="mt-6 space-y-4">
                {['Rapport marketing', 'Contrat administratif', 'Email professionnel'].map((item) => (
                  <div key={item} className="rounded-3xl border border-white/10 bg-surface/80 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-white">{item}</p>
                        <p className="text-sm text-slate-400">Score IA 28% · Réécriture · 2 juin 2026</p>
                      </div>
                      <button className="rounded-2xl border border-cyan-500/20 px-4 py-2 text-sm text-cyan-200">Télécharger</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
