'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { LayoutDashboard, PlayCircle, Tag, Users } from "lucide-react";
import type { ComponentType } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  minRole?: "GERENTE";
};

const navItems: NavItem[] = [
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

export function AppTopNav() {
  const pathname = usePathname();
  const { data } = useSession();
  const role = (data?.user as { role?: string } | undefined)?.role ?? "VENDEDOR";

  return (
    <nav className="border-b border-border/70 bg-card/50 px-4 py-2 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-4 overflow-x-auto">
        <div className="flex shrink-0 items-center gap-3">
          <div className="h-8 w-8 rounded-2xl bg-gradient-to-br from-primary to-[#424769] shadow-[0_8px_28px_rgba(249,177,122,0.35)]" />
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/70">
              WebinarPro
            </div>
            <div className="text-xs text-muted-foreground">Painel de controle</div>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {navItems
            .filter((item) => {
              if (!item.minRole) return true;
              return item.minRole === "GERENTE"
                ? role === "GERENTE" || role === "ADMIN"
                : true;
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
                    "group inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-primary text-primary-foreground shadow-[0_10px_28px_rgba(249,177,122,0.35)]"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  ].join(" ")}
                >
                  <Icon
                    className={[
                      "h-4 w-4",
                      active ? "text-primary-foreground" : "text-muted-foreground",
                    ].join(" ")}
                  />
                  <span className="whitespace-nowrap font-medium">{item.label}</span>
                </Link>
              );
            })}
        </div>
      </div>
    </nav>
  );
}
