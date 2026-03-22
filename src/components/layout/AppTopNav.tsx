'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LayoutDashboard, PlayCircle, Tag, Users } from 'lucide-react';
import type { ComponentType } from 'react';

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  minRole?: 'GERENTE';
};

const navItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Início',
    icon: LayoutDashboard,
  },
  {
    href: '/dashboard/equipe',
    label: 'Equipe',
    icon: Users,
    minRole: 'GERENTE',
  },
  {
    href: '/dashboard/topics',
    label: 'Temas',
    icon: Tag,
    minRole: 'GERENTE',
  },
  {
    href: '/webinar/new',
    label: 'Novo webinar',
    icon: PlayCircle,
    minRole: 'GERENTE',
  },
];

export function AppTopNav() {
  const pathname = usePathname();
  const { data } = useSession();
  const role = (data?.user as { role?: string } | undefined)?.role ?? 'VENDEDOR';

  return (
    <nav className="border-b border-slate-800/70 bg-slate-900/40 backdrop-blur-xl px-4 py-2">
      <div className="mx-auto flex max-w-7xl items-center gap-4 overflow-x-auto">
        <div className="flex items-center gap-3 shrink-0">
          <div className="h-8 w-8 rounded-2xl bg-gradient-to-tr from-violet-500 to-indigo-500 shadow-[0_0_30px_rgba(94,92,255,0.7)]" />
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-200/70">WebinarPro</div>
            <div className="text-xs text-slate-200/50">Painel de controle</div>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {navItems
            .filter((item) => {
              if (!item.minRole) return true;
              return item.minRole === 'GERENTE' ? role === 'GERENTE' || role === 'ADMIN' : true;
            })
            .map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    'group inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors shrink-0',
                    active
                      ? 'bg-gradient-to-r from-violet-600/90 to-indigo-600/90 text-white shadow-[0_10px_30px_rgba(79,70,229,0.55)]'
                      : 'text-slate-200/70 hover:bg-slate-200/5 hover:text-white',
                  ].join(' ')}
                >
                  <Icon className={['h-4 w-4', active ? 'text-white' : 'text-slate-200/70'].join(' ')} />
                  <span className="font-medium whitespace-nowrap">{item.label}</span>
                </Link>
              );
            })}
        </div>
      </div>
    </nav>
  );
}

