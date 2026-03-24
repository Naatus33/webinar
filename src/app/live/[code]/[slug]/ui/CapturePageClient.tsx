"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle, Calendar } from "lucide-react";
import type { WebinarConfig } from "@/lib/webinar-templates";
import {
  applyMergeFields,
  type PublicCopyOverrides,
} from "@/lib/public-copy-personalization";

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
  const [confirmed, setConfirmed] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [leadId, setLeadId] = useState<string | null>(null);

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
    setLeadId(data.id);
    // O player/monitoramento usa sessionStorage para associar presença ao lead.
    // Assim, após o cliente acessar "/{slug}", a captura cria o lead e o watch consegue vincular os pings.
    sessionStorage.setItem("lead_id", data.id);
    sessionStorage.setItem("lead_name", name);
    try {
      sessionStorage.setItem("lead_email", email);
    } catch {
      // ignore
    }
    setConfirmed(true);
  }

  function handleWatchNow() {
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

  function buildGoogleCalendarUrl() {
    if (!webinar.startDate) return null;
    const start = new Date(webinar.startDate);
    if (webinar.startTime) {
      const [h, m] = webinar.startTime.split(":");
      start.setHours(parseInt(h), parseInt(m));
    }
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/-|:|\.\d{3}/g, "");
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(webinar.name)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(`Acesse: ${window.location.origin}/live/${webinar.code}/${webinar.slug}/watch`)}`;
  }

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

  // Tela de confirmação
  if (confirmed) {
    const calUrl = buildGoogleCalendarUrl();
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: webinar.config.layout.bgColor }}>
        <div className="w-full max-w-md rounded-2xl bg-white/10 p-8 text-center backdrop-blur-md">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-emerald-400" />
          <h2 className="mb-1 text-xl font-bold text-white">Você está inscrito!</h2>
          {webinar.startDate && (
            <p className="mb-5 text-sm text-white/70">
              O webinar começa em{" "}
              {new Date(webinar.startDate).toLocaleDateString("pt-BR")}
              {webinar.startTime && ` às ${webinar.startTime}`}
            </p>
          )}
          {calUrl && (
            <a href={calUrl} target="_blank" rel="noopener noreferrer"
              className="mb-3 flex items-center justify-center gap-2 rounded-lg border border-white/20 px-4 py-2.5 text-sm text-white hover:bg-white/10">
              <Calendar className="h-4 w-4" /> Adicionar ao Google Calendar
            </a>
          )}
          <button onClick={handleWatchNow}
            className="mt-2 flex h-10 w-full items-center justify-center rounded-lg font-medium text-white"
            style={{ backgroundColor: primaryColor }}>
            Assistir agora
          </button>
          <p className="mt-3 text-xs text-white/50">Enviamos um e-mail de confirmação para você.</p>
        </div>
      </div>
    );
  }

  // Página de captura principal
  return (
    <div
      className="relative flex min-h-screen items-center justify-center p-4"
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

      {/* Countdown */}
      {webinar.config.countdown.enabled && webinar.config.countdown.showOnCapture && webinar.startDate && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 text-center">
          <p className="text-sm text-white/70">{webinar.config.countdown.message}</p>
        </div>
      )}

      <div className="relative z-10 flex w-full max-w-3xl gap-5 flex-col sm:flex-row">
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
  );
}
