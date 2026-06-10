export function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-3xl border border-white/10 p-5 ${accent ? 'bg-gradient-to-br from-cyan-500/15 to-violet-500/10' : 'bg-white/5'}`}>
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}
