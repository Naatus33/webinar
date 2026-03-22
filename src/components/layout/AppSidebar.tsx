'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  PlayCircle,
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
  // #region agent log
  fetch("http://127.0.0.1:7890/ingest/61bd3893-904e-42a5-a9f0-b0555de820c3", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "47a313",
    },
    body: JSON.stringify({
      sessionId: "47a313",
      runId: "pre-fix",
      hypothesisId: "H1",
      location: "AppSidebar.tsx:27",
      message: "AppSidebar render start",
      data: {},
      // eslint-disable-next-line react-hooks/purity
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion agent log

  const pathname = usePathname();
  const { data } = useSession();
  const role = (data?.user as { role?: string } | undefined)?.role ?? "VENDEDOR";

  return (
    <aside className="hidden border-r border-sidebar-border/60 bg-sidebar/80 px-4 py-6 backdrop-blur-xl md:flex md:w-64 md:flex-col">
      <div className="mb-8 flex items-center gap-3">
        <div className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-violet-500 to-indigo-500 shadow-[0_0_30px_rgba(94,92,255,0.7)]" />
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
                  ? "bg-gradient-to-r from-violet-600/90 to-indigo-600/90 text-sidebar-primary-foreground shadow-[0_10px_30px_rgba(79,70,229,0.55)]"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
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
          <p className="rounded-lg border border-violet-500/20 bg-violet-950/20 px-2 py-2 text-[10px] leading-snug text-violet-200/80">
            <strong className="text-violet-200">Gestor/Admin:</strong> vincule vendedores em{" "}
            <Link href="/dashboard/equipe" className="underline hover:text-violet-100">
              Equipe
            </Link>
            .
          </p>
        )}
      </div>
    </aside>
  );
}

