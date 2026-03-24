'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  PlayCircle,
  Settings,
  Tag,
  Users,
} from "lucide-react";

const navItems = [
  {
    href: "/dashboard",
    label: "Início",
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/settings",
    label: "Conta",
    icon: Settings,
  },
  {
    href: "/dashboard/equipe",
    label: "Equipe",
    icon: Users,
    minRole: "GERENTE",
  },
  {
    href: "/dashboard/topics",
    label: "Temas",
    icon: Tag,
    minRole: "GERENTE",
  },
  {
    href: "/webinar/new",
    label: "Novo webinar",
    icon: PlayCircle,
    minRole: "GERENTE",
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data } = useSession();
  const role = (data?.user as { role?: string } | undefined)?.role ?? "VENDEDOR";

  return (
    <aside className="hidden border-r border-sidebar-border/60 bg-sidebar/90 px-4 py-6 backdrop-blur-xl md:flex md:w-64 md:flex-col">
      <div className="mb-8 flex items-center gap-3">
        <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-primary to-[#424769] shadow-[0_8px_28px_rgba(249,177,122,0.35)]" />
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/70">
            WebinarPro
          </span>
          <p className="text-xs text-sidebar-foreground/50">
            Painel de controle
          </p>
        </div>
      </div>

      <nav className="space-y-1 text-sm text-sidebar-foreground/70">
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
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "group flex items-center gap-2 rounded-xl px-3 py-2 transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-[0_10px_28px_rgba(249,177,122,0.35)] motion-safe:transition-transform motion-safe:hover:translate-x-0.5"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground motion-transition",
              ].join(" ")}
            >
              <Icon
                className={[
                  "h-4 w-4",
                  active ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/70",
                ].join(" ")}
              />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}

      </nav>

      <div className="mt-auto space-y-2 pt-6 text-[11px] text-sidebar-foreground/40">
        <p>Pronto para o próximo webinar.</p>
        {role === "VENDEDOR" && (
          <p className="rounded-lg border border-sidebar-border/40 bg-sidebar/30 px-2 py-2 text-[10px] leading-snug">
            <strong className="text-sidebar-foreground/70">Vendedor:</strong> seus webinars na lista ao lado.
            Gestor cria temas; peça o link de operação ao vivo ao seu gestor se necessário.
          </p>
        )}
        {(role === "GERENTE" || role === "ADMIN") && (
          <p className="rounded-lg border border-primary/25 bg-primary/10 px-2 py-2 text-[10px] leading-snug text-foreground/90">
            <strong className="text-primary">Gestor/Admin:</strong> vincule vendedores em{" "}
            <Link href="/dashboard/equipe" className="underline hover:text-primary">
              Equipe
            </Link>
            .
          </p>
        )}
      </div>
    </aside>
  );
}

