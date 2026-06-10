import type { LucideIcon } from 'lucide-react';

export function DashboardStat({ title, value, icon: Icon }: { title: string; value: string; icon: LucideIcon }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-surface/80 p-6 shadow-soft backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-cyan-500/10 text-cyan-300">
          <Icon size={20} />
        </div>
        <div>
          <p className="text-sm text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}
