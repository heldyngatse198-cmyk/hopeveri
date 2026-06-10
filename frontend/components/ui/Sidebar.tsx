'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Archive, BookOpen, CreditCard, LayoutDashboard, Mail, MessageSquare, Settings2, Sparkles, Users } from 'lucide-react';

const items = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Analyses', href: '/analyses', icon: BookOpen },
  { label: 'Humanisation', href: '/humanisation', icon: Sparkles },
  { label: 'Réécriture', href: '/reecriture', icon: Archive },
  { label: 'Classification', href: '/classification', icon: CreditCard },
  { label: 'Historique', href: '/historique', icon: MessageSquare },
  { label: 'Abonnement', href: '/abonnement', icon: Users },
  { label: 'Emails Premium', href: '/abonnement#email', icon: Mail },
  { label: 'Admin Panel', href: '/admin', icon: Settings2 },
  { label: 'Paramètres', href: '/parametres', icon: Settings2 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-8 hidden h-[calc(100vh-64px)] min-h-[720px] shrink-0 rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-soft backdrop-blur-xl lg:block">
      <div className="space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-cyan-500/20 to-violet-500/15 p-5 text-white shadow-lg shadow-cyan-500/10">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-100/80">HopeVeri</p>
          <h2 className="mt-3 text-2xl font-semibold">AI Workspace</h2>
        </div>
        <nav className="space-y-2">
          {items.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${isActive ? 'bg-cyan-500/15 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
