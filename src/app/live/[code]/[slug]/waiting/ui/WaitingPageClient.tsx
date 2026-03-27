"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { WebinarConfig } from "@/lib/webinar-templates";
import { computePublicWatchPhase } from "@/lib/webinar-timing";
import { useWebinarSse } from "@/lib/useWebinarSse";

interface WebinarData {
  id: string;
  name: string;
  code: string;
  slug: string;
  status: string;
  startDate: string | null;
  startTime: string | null;
  replayEnabled: boolean;
  config: WebinarConfig;
}

export function WaitingPageClient({ webinar: initialWebinar }: { webinar: WebinarData }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const loginPath = `/live/${encodeURIComponent(initialWebinar.code)}/${encodeURIComponent(initialWebinar.slug)}`;
  const watchPath = `${loginPath}/watch`;
  const loginHref = useMemo(() => {
    const q = searchParams.toString();
    return q ? `${loginPath}?${q}` : loginPath;
  }, [loginPath, searchParams]);

  const watchHref = useMemo(() => {
    const q = searchParams.toString();
    return q ? `${watchPath}?${q}` : watchPath;
  }, [watchPath, searchParams]);

  /** Definida no 1º render no cliente (sessionStorage), sem setState — evita fechar/reabrir o EventSource (NS_BINDING_ABORTED). */
  const viewerKeyRef = useRef<string | null>(null);
  /* eslint-disable react-hooks/refs -- mesmo padrão que WatchPageClient: chave estável antes do 1º EventSource */
  if (typeof window !== "undefined" && viewerKeyRef.current === null) {
    try {
      let k = sessionStorage.getItem("watch_heart_key");
      if (!k) {
        k = crypto.randomUUID();
        sessionStorage.setItem("watch_heart_key", k);
      }
      viewerKeyRef.current = k;
    } catch {
      viewerKeyRef.current = crypto.randomUUID();
    }
  }
  const viewerKey = viewerKeyRef.current;
  /* eslint-enable react-hooks/refs */

  const { status: sseStatus, config: sseConfig } = useWebinarSse(
    initialWebinar.id,
    true,
    1500,
    viewerKey,
  );

  const config = sseConfig || initialWebinar.config;
  const currentStatus = sseStatus || initialWebinar.status;

  const [countdown, setCountdown] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useLayoutEffect(() => {
    try {
      const storedName = sessionStorage.getItem("lead_name")?.trim();
      const storedEmail = sessionStorage.getItem("lead_email")?.trim();
      if (storedName && storedEmail) {
        return;
      }
      router.replace(loginHref);
    } catch {
      router.replace(loginHref);
    }
  }, [router, loginHref]);

  const tick = useCallback(() => {
    const { phase: p, secondsUntilStart } = computePublicWatchPhase({
      startDate: initialWebinar.startDate,
      startTime: initialWebinar.startTime,
      replayEnabled: initialWebinar.replayEnabled,
      status: currentStatus,
    });
    if (p !== "waiting") {
      router.replace(watchHref);
      return;
    }
    if (secondsUntilStart != null && secondsUntilStart > 0) {
      const h = Math.floor(secondsUntilStart / 3600);
      const m = Math.floor((secondsUntilStart % 3600) / 60);
      const s = secondsUntilStart % 60;
      setCountdown({ hours: h, minutes: m, seconds: s });
    } else {
      setCountdown(null);
    }
  }, [initialWebinar, currentStatus, router, watchHref]);

  useEffect(() => {
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [tick]);

  const pad2 = (n: number) => String(n).padStart(2, "0");
  const subtitle =
    config.countdown.enabled && config.countdown.message.trim()
      ? config.countdown.message.trim()
      : null;

  return (
    <div className="min-h-[100svh] flex flex-col items-center justify-center gap-8 sm:gap-10 bg-background px-4 py-12 text-center">
      <div className="flex max-w-4xl flex-col items-center gap-3 sm:gap-4">
        <h1 className="text-[clamp(2rem,8vw,4.5rem)] font-black uppercase leading-none tracking-tight text-foreground">
          Iniciamos em
        </h1>
        {subtitle != null && (
          <p className="text-base font-semibold text-muted-foreground sm:text-lg">{subtitle}</p>
        )}
      </div>
      {countdown != null && (
        <div
          className="flex flex-wrap items-baseline justify-center gap-1 font-mono font-black tabular-nums leading-none tracking-tight text-foreground sm:gap-2 md:gap-3"
          style={{ fontSize: "clamp(3.5rem, 18vw, 14rem)" }}
          aria-live="polite"
          aria-label="Tempo restante até o início"
        >
          <span>{pad2(countdown.hours)}</span>
          <span className="pb-[0.08em] text-muted-foreground/40">:</span>
          <span>{pad2(countdown.minutes)}</span>
          <span className="pb-[0.08em] text-muted-foreground/40">:</span>
          <span>{pad2(countdown.seconds)}</span>
        </div>
      )}
      <p className="max-w-2xl text-lg font-semibold text-muted-foreground sm:text-xl">
        {config.content.title || initialWebinar.name}
      </p>
    </div>
  );
}
