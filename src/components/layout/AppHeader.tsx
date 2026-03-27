"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  userLabel?: string;
}

export function AppHeader({ title, subtitle, userLabel }: AppHeaderProps) {
  const pathname = usePathname();

  const segments = pathname
    .split("?")[0]
    .split("/")
    .filter(Boolean);

  return (
    <header className="border-b border-border/70 bg-card/50 px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
            {segments.length === 0 ? (
              <span>Início</span>
            ) : (
              <>
                <Link href="/dashboard" className="hover:text-foreground">
                  Dashboard
                </Link>
                {segments.map((segment, index) => {
                  const href = "/" + segments.slice(0, index + 1).join("/");
                  const isLast = index === segments.length - 1;
                  return (
                    <span key={href} className="flex items-center gap-2">
                      <span className="text-border">/</span>
                      {isLast ? (
                        <span className="text-muted-foreground">{decodeURIComponent(segment)}</span>
                      ) : (
                        <Link href={href} className="hover:text-foreground">
                          {decodeURIComponent(segment)}
                        </Link>
                      )}
                    </span>
                  );
                })}
              </>
            )}
          </div>
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {userLabel && (
            <div className="flex items-center gap-2 rounded-full bg-muted/60 px-3 py-1 text-xs text-foreground/90 ring-1 ring-border/70">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary to-muted text-[10px] font-semibold text-primary-foreground">
                {userLabel
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <span className="max-w-[150px] truncate">{userLabel}</span>
            </div>
          )}
          <Link
            href="/api/auth/signout"
            className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm motion-transition hover:border-primary/50 hover:text-foreground hover:shadow-[0_0_20px_rgba(249,177,122,0.2)]"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </Link>
        </div>
      </div>
    </header>
  );
}

