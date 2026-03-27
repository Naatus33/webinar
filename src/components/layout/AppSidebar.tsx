"use client";

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
    <aside className="sticky top-0 z-50 hidden h-screen w-72 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar md:flex">
      <div className="p-8">
        <div className="group flex cursor-pointer items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 shadow-2xl shadow-primary/10 transition-transform group-hover:scale-110">
            <Zap className="h-6 w-6 fill-primary/20 text-primary" />
          </div>
          <div>
            <span className="text-sm font-black uppercase tracking-[0.3em] text-sidebar-foreground">
              WebinarPro
            </span>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Enterprise v2.0
            </p>
          </div>
        </div>
      </div>

      <nav className="scrollbar-hide flex-1 space-y-2 overflow-y-auto px-4">
        <div className="pb-4">
          <p className="mb-4 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            Menu Principal
          </p>
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
              const active =
                pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 transition-all ${
                    active
                      ? "border-primary/30 bg-primary/10 text-primary shadow-lg shadow-primary/5"
                      : "border-transparent text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground group-hover:text-sidebar-accent-foreground"}`}
                    />
                    <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
                  </div>
                  {active && <ChevronRight className="h-4 w-4" />}
                </Link>
              );
            })}
        </div>

        {(role === "GERENTE" || role === "ADMIN") && (
          <div className="border-t border-sidebar-border pt-4">
            <p className="mb-4 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              Ações Rápidas
            </p>
            <Link
              href="/webinar/new"
              className="flex items-center gap-3 rounded-2xl bg-primary px-4 py-4 text-primary-foreground shadow-2xl shadow-primary/20 transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <PlayCircle className="h-5 w-5" />
              <span className="text-xs font-black uppercase tracking-widest">Novo Webinar</span>
            </Link>
          </div>
        )}
      </nav>

      <div className="mt-auto border-t border-sidebar-border bg-sidebar-accent/30 p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-muted font-black text-muted-foreground">
            {userName.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-black uppercase text-sidebar-foreground">{userName}</p>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-bold uppercase text-muted-foreground">{role}</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => signOut()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-all hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" /> Sair do Sistema
        </button>
      </div>
    </aside>
  );
}
