'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  PlayCircle,
  Settings,
  Tag,
  Users,
  Zap,
  LogOut,
  ChevronRight,
  ShieldCheck,
  BarChart3,
  ShoppingCart
} from "lucide-react";

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/equipe",
    label: "Minha Equipe",
    icon: Users,
    minRole: "GERENTE",
  },
  {
    href: "/dashboard/topics",
    label: "Temas & Design",
    icon: Tag,
    minRole: "GERENTE",
  },
  {
    href: "/dashboard/settings",
    label: "Configurações",
    icon: Settings,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? "VENDEDOR";
  const userName = session?.user?.name ?? "Usuário";

  return (
    <aside className="hidden md:flex flex-col w-72 bg-slate-950 border-r border-slate-800/60 h-screen sticky top-0 z-50 overflow-hidden">
      
      {/* Logo Area */}
      <div className="p-8">
        <div className="flex items-center gap-4 group cursor-pointer">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-2xl shadow-primary/10 group-hover:scale-110 transition-transform">
            <Zap className="h-6 w-6 text-primary fill-primary/20" />
          </div>
          <div>
            <span className="text-sm font-black uppercase tracking-[0.3em] text-white">
              WebinarPro
            </span>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
              Enterprise v2.0
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto scrollbar-hide">
        <div className="pb-4">
          <p className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4">Menu Principal</p>
          {navItems
            .filter((item) => {
              if (!("minRole" in item)) return true;
              if (item.minRole === "GERENTE") {
                return role === "GERENTE" || role === "ADMIN";
              }
              return true;
            })
            .map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl transition-all border ${
                    active
                      ? "bg-primary/10 border-primary/30 text-primary shadow-lg shadow-primary/5"
                      : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-5 w-5 ${active ? "text-primary" : "text-slate-500 group-hover:text-slate-300"}`} />
                    <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
                  </div>
                  {active && <ChevronRight className="h-4 w-4" />}
                </Link>
              );
            })}
        </div>

        {/* Quick Actions */}
        {(role === "GERENTE" || role === "ADMIN") && (
          <div className="pt-4 border-t border-slate-800/60">
            <p className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4">Ações Rápidas</p>
            <Link
              href="/webinar/new"
              className="flex items-center gap-3 px-4 py-4 rounded-2xl bg-primary text-white shadow-2xl shadow-primary/20 hover:brightness-110 transition-all active:scale-[0.98]"
            >
              <PlayCircle className="h-5 w-5" />
              <span className="text-xs font-black uppercase tracking-widest">Novo Webinar</span>
            </Link>
          </div>
        )}
      </nav>

      {/* User Profile & Logout */}
      <div className="p-6 mt-auto border-t border-slate-800/60 bg-slate-900/20">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-10 w-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 font-black">
            {userName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-white uppercase truncate">{userName}</p>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3 text-emerald-500" />
              <span className="text-[10px] text-slate-500 font-bold uppercase">{role}</span>
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => signOut()}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 transition-all text-[10px] font-black uppercase tracking-widest"
        >
          <LogOut className="h-4 w-4" /> Sair do Sistema
        </button>
      </div>
    </aside>
  );
}
