import type { LucideIcon } from 'lucide-react';

export function ModuleCard({ title, description, icon: Icon }: { title: string; description: string; icon: LucideIcon }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-surface/70 p-6 shadow-soft backdrop-blur-xl transition hover:-translate-y-1 hover:border-cyan-400/30">
      <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-violet-500/10 text-violet-300 shadow-lg shadow-violet-500/10">
        <Icon size={24} />
      </div>
      <h3 className="mt-5 text-xl font-semibold text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-300">{description}</p>
    </div>
  );
}
