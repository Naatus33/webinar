"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { WebinarConfig } from "@/lib/webinar-templates";
import {
  applyMergeFields,
  type PublicCopyOverrides,
} from "@/lib/public-copy-personalization";
import {
  formatWebinarStartLabelPtBr,
  webinarCountdownTarget,
} from "@/lib/webinar-timing";

interface Sponsor {
  name: string;
  logoUrl: string;
}

interface WebinarData {
  id: string;
  name: string;
  code: string;
  slug: string;
  status: string;
  startDate: string | null;
  startTime: string | null;
  lgpdEnabled: boolean;
  lgpdText: string | null;
  passwordEnabled: boolean;
  hasCapturePassword: boolean;
  regBgImage: string | null;
  regLogoUrl: string | null;
  regDescription: string | null;
  regTitle: string | null;
  regCtaText: string | null;
  regSponsors: Sponsor[];
  config: WebinarConfig;
}

interface CapturePageClientProps {
  webinar: WebinarData;
  copyOverrides?: PublicCopyOverrides;
}

const captureTokenStorageKey = (webinarId: string) => `capture_access_${webinarId}`;

export function CapturePageClient({
  webinar,
  copyOverrides = { headline: null, subtitle: null, description: null },
}: CapturePageClientProps) {
  const router = useRouter();
  const needsPasswordGate = webinar.passwordEnabled && webinar.hasCapturePassword;
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordOk, setPasswordOk] = useState(!needsPasswordGate);
  const [passwordError, setPasswordError] = useState(false);
  const [passwordChecking, setPasswordChecking] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [lgpd, setLgpd] = useState(false);
  const [loading, setLoading] = useState(false);

  const { branding, capturePage } = webinar.config;
  const primaryColor = branding.primaryColor;
  const overlayOpacity = capturePage?.overlayOpacity ?? 0.5;
  const bgPosition = capturePage?.backgroundPosition ?? { x: 0.5, y: 0.5 };
  const bgPositionCss =
    bgPosition &&
    Number.isFinite(bgPosition.x) &&
    Number.isFinite(bgPosition.y)
      ? `${bgPosition.x * 100}% ${bgPosition.y * 100}%`
      : "center";
  const logoSize = capturePage?.logoSize ?? "md";
  const logoSizeClass =
    logoSize === "sm" ? "h-8" : logoSize === "lg" ? "h-14" : "h-10";

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordChecking(true);
    setPasswordError(false);
    try {
      const res = await fetch("/api/webinars/verify-capture-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: webinar.code,
          slug: webinar.slug,
          password: passwordInput,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { token?: string };
      if (res.ok && data.token) {
        try {
          sessionStorage.setItem(captureTokenStorageKey(webinar.id), data.token);
        } catch {
          // sessionStorage indisponível
        }
        setPasswordOk(true);
      } else {
        setPasswordError(true);
      }
    } catch {
      setPasswordError(true);
    } finally {
      setPasswordChecking(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    let captureAccessToken: string | undefined;
    try {
      captureAccessToken = sessionStorage.getItem(captureTokenStorageKey(webinar.id)) ?? undefined;
    } catch {
      captureAccessToken = undefined;
    }

    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        webinarId: webinar.id,
        name,
        email,
        lgpdConsent: lgpd,
        captureAccessToken,
      }),
    });

    setLoading(false);

    if (!res.ok) return;

    const data = await res.json();
    // O player/monitoramento usa sessionStorage para associar presença ao lead.
    sessionStorage.setItem("lead_id", data.id);
    sessionStorage.setItem("lead_name", name);
    try {
      sessionStorage.setItem("lead_email", email);
    } catch {
      // ignore
    }
    const q = typeof window !== "undefined" ? window.location.search : "";
    router.push(`/live/${webinar.code}/${webinar.slug}/watch${q}`);
  }

  const mergeCtx = {
    name: name.trim() || undefined,
    email: email.trim() || undefined,
  };

  const formTitle = applyMergeFields(
    copyOverrides.headline ?? webinar.regTitle ?? "Inscreva-se gratuitamente",
    mergeCtx,
  );

  const leftColumnText = applyMergeFields(
    copyOverrides.description ?? webinar.regDescription ?? webinar.name,
    mergeCtx,
  );

  const subtitleLine = copyOverrides.subtitle
    ? applyMergeFields(copyOverrides.subtitle, mergeCtx)
    : null;

  const eventStartLabel = formatWebinarStartLabelPtBr(webinar.startDate, webinar.startTime);
  const showCaptureTopBanner =
    Boolean(
      webinar.config.countdown.enabled &&
        webinar.config.countdown.showOnCapture &&
        webinar.startDate,
    ) || Boolean(eventStartLabel);

  const dateOnlyCountdown =
    Boolean(webinar.startDate) && !webinar.startTime?.trim();

  const [minutesUntilStart, setMinutesUntilStart] = useState<number | null>(null);

  useEffect(() => {
    if (!dateOnlyCountdown) {
      setMinutesUntilStart(null);
      return;
    }
    const target = webinarCountdownTarget(webinar.startDate, webinar.startTime);
    if (!target) {
      setMinutesUntilStart(null);
      return;
    }
    function tick() {
      const ms = target.getTime() - Date.now();
      setMinutesUntilStart(Math.max(0, Math.ceil(ms / 60_000)));
    }
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [dateOnlyCountdown, webinar.startDate, webinar.startTime]);

  // Tela de senha
  if (!passwordOk) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: webinar.config.layout.bgColor }}>
        <form onSubmit={handlePasswordSubmit} className="w-full max-w-sm rounded-2xl bg-white/10 p-8 backdrop-blur-md">
          <h2 className="mb-4 text-lg font-semibold text-white">Este webinar é protegido por senha</h2>
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
            className="mb-3 h-10 w-full rounded-md border border-white/20 bg-white/10 px-3 text-sm text-white outline-none"
            placeholder="Digite a senha"
          />
          {passwordError && <p className="mb-2 text-xs text-red-400">Senha incorreta.</p>}
          <button
            type="submit"
            disabled={passwordChecking}
            className="h-10 w-full rounded-md font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: primaryColor }}
          >
            {passwordChecking ? "Verificando..." : "Entrar"}
          </button>
        </form>
      </div>
    );
  }

  // Página de captura principal
  return (
    <div
      className={`relative flex min-h-screen items-center justify-center p-4 ${
        showCaptureTopBanner ? "pt-24 sm:pt-28" : ""
      } ${dateOnlyCountdown ? "pb-10 sm:pb-12" : ""}`}
      style={{
        backgroundImage: webinar.regBgImage ? `url(${webinar.regBgImage})` : undefined,
        backgroundSize: "cover",
      backgroundPosition: webinar.regBgImage ? bgPositionCss : undefined,
        backgroundColor: webinar.regBgImage ? undefined : webinar.config.layout.bgColor,
      }}
    >
      {webinar.regBgImage && (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity})` }}
        />
      )}

      {/* Contagem + data/hora de início (alinhado ao preview do wizard) */}
      {showCaptureTopBanner && (
        <div className="absolute top-4 left-1/2 z-10 w-[90%] max-w-xl -translate-x-1/2 space-y-1 text-center">
          {webinar.config.countdown.enabled &&
            webinar.config.countdown.showOnCapture &&
            webinar.startDate && (
              <p className="text-sm text-white/80">{webinar.config.countdown.message}</p>
            )}
          {eventStartLabel && (
            <p className="text-xs text-white/65">Início: {eventStartLabel}</p>
          )}
        </div>
      )}

      <div
        className={`relative z-10 flex w-full max-w-3xl flex-col items-stretch gap-6 sm:items-center ${
          dateOnlyCountdown && minutesUntilStart !== null ? "sm:gap-8" : ""
        }`}
      >
        {dateOnlyCountdown && minutesUntilStart !== null && (
          <div className="w-full rounded-2xl border border-white/20 bg-black/25 px-4 py-8 text-center shadow-[0_0_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:px-8 sm:py-10">
            {minutesUntilStart > 0 ? (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55 sm:text-xs">
                  Faltam
                </p>
                <p
                  className="my-2 text-6xl font-black tabular-nums leading-none tracking-tight text-white sm:text-7xl md:text-8xl"
                  style={{ textShadow: "0 4px 40px rgba(0,0,0,0.45)" }}
                >
                  {minutesUntilStart.toLocaleString("pt-BR")}
                </p>
                <p className="text-lg font-medium text-white/85 sm:text-xl">minutos</p>
                {eventStartLabel && (
                  <p className="mt-4 text-sm text-white/55">até o início do dia do evento ({eventStartLabel})</p>
                )}
              </>
            ) : (
              <>
                <p
                  className="text-4xl font-black tracking-tight text-white sm:text-5xl md:text-6xl"
                  style={{ textShadow: "0 4px 40px rgba(0,0,0,0.45)" }}
                >
                  É hoje!
                </p>
                <p className="mx-auto mt-3 max-w-md text-sm text-white/70">
                  Dia do evento — o horário exato pode ser divulgado em breve. Fique atento ao e-mail.
                </p>
              </>
            )}
          </div>
        )}

        <div className="flex w-full gap-5 flex-col sm:flex-row">
        {/* Left card */}
        <div className="flex flex-1 flex-col gap-4 rounded-2xl bg-white/10 p-6 backdrop-blur-sm text-white">
          {webinar.regLogoUrl ? (
            <img
              src={webinar.regLogoUrl}
              alt="Logo"
              className={`${logoSizeClass} w-auto object-contain`}
            />
          ) : (
            <div className="h-10 w-28 rounded bg-white/20" />
          )}
          {subtitleLine && (
            <p className="text-xs font-medium uppercase tracking-wide text-white/60">{subtitleLine}</p>
          )}
          <p className="text-sm leading-relaxed text-white/80">{leftColumnText}</p>
          {webinar.regSponsors.some((s) => Boolean(s.logoUrl)) && (
            <div className="flex flex-wrap items-center justify-center gap-3 border-t border-white/20 pt-3">
              <span className="text-xs text-white/50">Realização:</span>
              {webinar.regSponsors.map((s, i) =>
                s.logoUrl ? (
                  <img
                    key={i}
                    src={s.logoUrl}
                    alt={s.name || "Logo patrocinador"}
                    className="h-5 w-auto"
                  />
                ) : null
              )}
            </div>
          )}
          {/* Capture counter */}
          {webinar.config.captureCounter.enabled && (
            <p className="mt-auto text-xs text-white/50">
              {webinar.config.captureCounter.mode === "fake"
                ? `Mais de ${webinar.config.captureCounter.fakeBase.toLocaleString("pt-BR")} pessoas já se inscreveram`
                : "Centenas de pessoas já se inscreveram"}
            </p>
          )}
        </div>

        {/* Right form */}
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 rounded-2xl bg-white p-6 shadow-xl">
          <h2 className="text-lg font-bold text-slate-800">{formTitle}</h2>
          <div className="space-y-1">
            <label className="block text-xs text-slate-500">Nome *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:ring-2"
              style={{ "--tw-ring-color": primaryColor } as React.CSSProperties}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-slate-500">E-mail *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:ring-2"
            />
          </div>
          {webinar.lgpdEnabled && (
            <label className="flex items-start gap-2 text-xs text-slate-500">
              <input
                type="checkbox"
                required
                checked={lgpd}
                onChange={(e) => setLgpd(e.target.checked)}
                className="mt-0.5"
              />
              <span>{webinar.lgpdText || "Aceito a Política de Privacidade."}</span>
            </label>
          )}
          <button
            type="submit"
            disabled={loading}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white disabled:opacity-60"
            style={{ backgroundColor: primaryColor }}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Aguarde..." : webinar.regCtaText || "Ir para o webinar!"}
          </button>
        </form>
        </div>
      </div>
    </div>
  );
}
