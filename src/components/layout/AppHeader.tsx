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
    <header className="border-b border-slate-800/70 bg-slate-900/40 px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
            {segments.length === 0 ? (
              <span>Início</span>
            ) : (
              <>
                <Link href="/dashboard" className="hover:text-slate-300">
                  Dashboard
                </Link>
                {segments.map((segment, index) => {
                  const href = "/" + segments.slice(0, index + 1).join("/");
                  const isLast = index === segments.length - 1;
                  return (
                    <span key={href} className="flex items-center gap-2">
                      <span className="text-slate-700">/</span>
                      {isLast ? (
                        <span className="text-slate-400">{decodeURIComponent(segment)}</span>
                      ) : (
                        <Link href={href} className="hover:text-slate-300">
                          {decodeURIComponent(segment)}
                        </Link>
                      )}
                    </span>
                  );
                })}
              </>
            )}
          </div>
          <h1 className="text-lg font-semibold text-slate-50">{title}</h1>
          {subtitle && (
            <p className="text-xs text-slate-400">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {userLabel && (
            <div className="flex items-center gap-2 rounded-full bg-slate-900/60 px-3 py-1 text-xs text-slate-300 ring-1 ring-slate-700/70">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-violet-500 to-indigo-500 text-[10px] font-semibold text-white">
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
            className="inline-flex items-center gap-1 rounded-full border border-slate-700/70 bg-slate-900/70 px-3 py-1 text-xs font-medium text-slate-300 shadow-sm transition hover:border-violet-500/70 hover:text-white hover:shadow-[0_0_20px_rgba(79,70,229,0.55)]"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </Link>
        </div>
      </div>
    </header>
  );
}

