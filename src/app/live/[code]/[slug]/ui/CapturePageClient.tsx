"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import type { WebinarConfig } from "@/lib/webinar-templates";
import {
  applyMergeFields,
  type PublicCopyOverrides,
} from "@/lib/public-copy-personalization";
import { computePublicWatchPhase, webinarCountdownTarget } from "@/lib/webinar-timing";

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
  replayEnabled: boolean;
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
  copyOverrides = { headline: null, subtitle: null, description: null, formSubtitle: null },
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
  const overlayTintRaw = capturePage?.overlayTintColor?.trim() ?? "#000000";
  const overlayTintColor = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(overlayTintRaw)
    ? overlayTintRaw
    : "#000000";
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
    const { phase } = computePublicWatchPhase({
      startDate: webinar.startDate,
      startTime: webinar.startTime,
      replayEnabled: webinar.replayEnabled,
      status: webinar.status,
    });
    const next =
      phase === "waiting"
        ? `/live/${webinar.code}/${webinar.slug}/waiting`
        : `/live/${webinar.code}/${webinar.slug}/watch`;
    router.push(`${next}${q}`);
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

  const builtInDefaultSubtitle = "Preencha os dados para acessar a transmissão.";
  const rawFormSubtitle =
    copyOverrides.formSubtitle !== null
      ? copyOverrides.formSubtitle
      : (capturePage?.formSubtitle !== undefined
          ? capturePage.formSubtitle
          : builtInDefaultSubtitle);
  const formHelpLine =
    rawFormSubtitle.trim() === ""
      ? null
      : applyMergeFields(rawFormSubtitle, mergeCtx);

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
      if (!target) return;
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
      <div
        className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12"
        style={{ backgroundColor: webinar.config.layout.bgColor }}
      >
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div
            className="absolute -left-[20%] top-1/3 h-[28rem] w-[28rem] rounded-full blur-[100px] opacity-40"
            style={{
              background: `radial-gradient(circle, ${primaryColor} 0%, transparent 65%)`,
            }}
          />
          <div className="absolute -right-[15%] bottom-0 h-80 w-80 rounded-full bg-violet-500/20 blur-[90px]" />
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)
              `,
              backgroundSize: "40px 40px",
            }}
          />
        </div>
        <form
          onSubmit={handlePasswordSubmit}
          className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950/70 p-8 shadow-[0_24px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-10"
          style={{ "--capture-primary": primaryColor } as React.CSSProperties}
        >
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] shadow-inner">
              <Lock className="h-7 w-7 text-white/90" aria-hidden />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              Acesso restrito
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/55">
              Este webinar exige senha. Digite a chave fornecida pelo organizador.
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <label htmlFor="capture-password" className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
                Senha
              </label>
              <input
                id="capture-password"
                type="password"
                value={passwordInput}
                autoComplete="current-password"
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError(false);
                }}
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 text-sm text-white outline-none transition-all placeholder:text-white/30 focus:border-[var(--capture-primary)] focus:bg-white/[0.08] focus:ring-2 focus:ring-white/15"
                placeholder="••••••••"
              />
              {passwordError && (
                <p className="mt-2 text-xs font-medium text-red-400" role="alert">
                  Senha incorreta. Tente novamente.
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={passwordChecking}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white shadow-lg transition-all hover:brightness-110 hover:shadow-xl disabled:opacity-55"
              style={{ backgroundColor: primaryColor }}
            >
              {passwordChecking && <Loader2 className="h-4 w-4 animate-spin" />}
              {passwordChecking ? "Verificando..." : "Entrar no webinar"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Página de captura principal — opacidade do véu configurável (0.1–1)
  const veilOpacity = webinar.regBgImage
    ? Math.min(1, Math.max(0.1, overlayOpacity))
    : 1;

  return (
    <div
      className="relative min-h-screen overflow-hidden text-white antialiased selection:bg-white/15 lg:flex"
      style={{ "--capture-primary": primaryColor } as React.CSSProperties}
    >
      <style>{`
        @keyframes captureFadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes captureFadeLeft {
          from { opacity: 0; transform: translateX(-24px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes captureFadeRight {
          from { opacity: 0; transform: translateX(24px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes captureFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        .capture-enter-left {
          animation: captureFadeLeft 620ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .capture-enter-right {
          animation: captureFadeRight 620ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .capture-enter-item {
          animation: captureFadeUp 540ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .capture-logo-float {
          animation: captureFloat 4.2s ease-in-out infinite;
        }
        @keyframes captureDecoDrift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          40% { transform: translate(1.5%, -2%) scale(1.04); }
          70% { transform: translate(-1%, 1%) scale(0.97); }
        }
        @keyframes captureDecoDriftSlow {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(-2%, 1.5%) rotate(2deg); }
        }
        .capture-deco-drift {
          animation: captureDecoDrift 22s ease-in-out infinite;
        }
        .capture-deco-drift-alt {
          animation: captureDecoDrift 28s ease-in-out infinite reverse;
        }
        .capture-deco-frame {
          animation: captureDecoDriftSlow 32s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .capture-enter-left,
          .capture-enter-right,
          .capture-enter-item,
          .capture-logo-float,
          .capture-deco-drift,
          .capture-deco-drift-alt,
          .capture-deco-frame {
            animation: none !important;
          }
        }
      `}</style>

      {/* Fundo único em tela cheia — brilhos só à esquerda; base escura só quando não há foto de capa */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        {!webinar.regBgImage && <div className="absolute inset-0 bg-[#0a0a0c]" />}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-full overflow-hidden lg:w-[50%]">
          <div
            className="capture-deco-drift absolute -left-[20%] top-[12%] h-[min(100vw,28rem)] w-[min(100vw,28rem)] rounded-full blur-[110px]"
            style={{
              background: `radial-gradient(circle at 35% 40%, ${primaryColor}45 0%, transparent 65%)`,
            }}
          />
          <div
            className="capture-deco-drift absolute left-[15%] top-[38%] h-[min(90vw,24rem)] w-[min(90vw,24rem)] rounded-full blur-[100px] opacity-40"
            style={{
              background: `radial-gradient(circle at 50% 50%, ${primaryColor}35 0%, transparent 68%)`,
            }}
          />
          <div className="capture-deco-frame absolute left-[5%] top-[12%] h-32 w-32 rotate-12 rounded-2xl border border-white/10 shadow-[0_0_40px_rgba(255,255,255,0.05)] sm:h-36 sm:w-36" />
          <div className="absolute bottom-[26%] left-[6%] h-px w-40 rotate-[32deg] bg-gradient-to-r from-transparent via-white/20 to-transparent sm:w-48" />
          <div
            className="absolute inset-0 opacity-[0.1]"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)
              `,
              backgroundSize: "42px 42px",
            }}
          />
        </div>
        {!webinar.regBgImage && (
          <>
            <div className="pointer-events-none absolute inset-y-0 left-1/2 right-0 hidden bg-[#0a0a0c] lg:block" />
            <div
              className="pointer-events-none absolute inset-y-0 left-0 w-full opacity-[0.08] lg:left-1/2 lg:w-1/2"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
                `,
                backgroundSize: "40px 40px",
              }}
            />
            <div className="pointer-events-none absolute inset-y-0 left-1/2 right-0 hidden bg-gradient-to-t from-black/20 via-transparent to-transparent lg:block" aria-hidden />
          </>
        )}
        {webinar.regBgImage && (
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)
              `,
              backgroundSize: "40px 40px",
            }}
          />
        )}
      </div>

      {/* Imagem de capa em tela cheia OU tinte à esquerda sem foto */}
      {webinar.regBgImage ? (
        <>
          <div
            className="pointer-events-none absolute inset-0 z-[1] bg-cover bg-no-repeat"
            style={{
              backgroundImage: `url(${webinar.regBgImage})`,
              backgroundPosition: bgPositionCss,
            }}
          />
          {/* Véu configurável (cor + opacidade) em tela cheia */}
          <div
            className="pointer-events-none absolute inset-0 z-[1]"
            style={{
              background: `linear-gradient(to bottom right, color-mix(in srgb, ${overlayTintColor} 72%, transparent), color-mix(in srgb, ${overlayTintColor} 42%, transparent), color-mix(in srgb, ${overlayTintColor} 48%, transparent))`,
              opacity: veilOpacity,
            }}
            aria-hidden
          />
        </>
      ) : (
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-full lg:w-1/2"
          style={{
            background: `linear-gradient(90deg, ${webinar.config.layout.bgColor} 0%, color-mix(in srgb, ${webinar.config.layout.bgColor} 22%, transparent) 55%, transparent 100%)`,
          }}
        />
      )}

      <section className="capture-enter-left relative z-10 flex min-h-[40vh] flex-1 items-center overflow-hidden px-5 py-8 sm:px-8 lg:min-h-screen lg:w-1/2 lg:items-center lg:p-10">
        <div className="relative z-10 flex h-fit w-full max-w-xl flex-col gap-7 rounded-2xl border border-zinc-200/90 bg-white p-6 shadow-[0_22px_50px_-12px_rgba(15,23,42,0.18)] ring-1 ring-black/[0.04] transition-shadow duration-300 hover:shadow-[0_28px_60px_-12px_rgba(15,23,42,0.22)] sm:p-7 lg:p-8">
          <div className="space-y-5 capture-enter-item" style={{ animationDelay: "90ms" }}>
            <div className="flex w-full justify-center">
              {webinar.regLogoUrl ? (
                <img
                  src={webinar.regLogoUrl}
                  alt="Logo"
                  className={`${logoSizeClass} capture-logo-float w-auto max-w-[16rem] object-contain drop-shadow-sm`}
                />
              ) : (
                <div className="h-10 w-28 rounded-lg bg-gradient-to-br from-zinc-200 to-zinc-300" />
              )}
            </div>
            {subtitleLine && (
              <p className="text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                {subtitleLine}
              </p>
            )}
            <p className="max-w-xl text-[15px] leading-[1.65] text-zinc-700">{leftColumnText}</p>
            {dateOnlyCountdown && minutesUntilStart !== null && (
              <div
                className="inline-flex w-fit items-baseline gap-2 rounded-xl border px-3.5 py-2.5 shadow-sm"
                style={{
                  borderColor: `${primaryColor}40`,
                  background: `linear-gradient(135deg, rgba(255,255,255,0.95), ${primaryColor}12)`,
                }}
              >
                {minutesUntilStart > 0 ? (
                  <>
                    <span className="text-2xl font-black tabular-nums text-zinc-900">{minutesUntilStart.toLocaleString("pt-BR")}</span>
                    <span className="text-xs font-medium uppercase tracking-wide text-zinc-600">min para começar</span>
                  </>
                ) : (
                  <span className="text-sm font-bold uppercase tracking-wider text-emerald-600">É hoje</span>
                )}
              </div>
            )}
          </div>
          {webinar.regSponsors.some((s) => Boolean(s.logoUrl)) && (
            <div className="space-y-4 capture-enter-item" style={{ animationDelay: "160ms" }}>
              <div className="space-y-3 border-t border-zinc-200/90 pt-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400">Patrocinadores</p>
                <div className="flex flex-wrap items-center gap-4">
                  {webinar.regSponsors.map((s, i) =>
                    s.logoUrl ? (
                      <img
                        key={i}
                        src={s.logoUrl}
                        alt={s.name || "Logo patrocinador"}
                        className="h-5 w-auto object-contain opacity-90"
                      />
                    ) : null,
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="capture-enter-right relative z-10 flex min-h-[60vh] flex-1 items-center overflow-hidden px-6 py-12 sm:px-10 lg:min-h-screen lg:w-1/2 lg:px-14">
        <form
          onSubmit={handleSubmit}
          className="relative z-10 mx-auto flex w-full max-w-md flex-col gap-6 rounded-2xl border border-white/10 bg-zinc-900 p-7 shadow-[0_24px_56px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-8"
        >
          <div className="capture-enter-item space-y-3" style={{ animationDelay: "90ms" }}>
            <h2 className="text-balance text-2xl font-bold leading-tight tracking-tight text-white sm:text-[1.65rem]">
              {formTitle}
            </h2>
            {formHelpLine ? (
              <p className="text-sm leading-relaxed text-white/45">{formHelpLine}</p>
            ) : null}
          </div>
          <div className="capture-enter-item space-y-5" style={{ animationDelay: "150ms" }}>
            <div className="space-y-2">
              <label htmlFor="capture-name" className="block text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
                Nome *
              </label>
              <input
                id="capture-name"
                type="text"
                name="name"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition-all placeholder:text-white/30 focus:border-[var(--capture-primary)] focus:bg-white/[0.07] focus:ring-2 focus:ring-white/10"
                placeholder="Seu nome completo"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="capture-email" className="block text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
                Email *
              </label>
              <input
                id="capture-email"
                type="email"
                name="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white outline-none transition-all placeholder:text-white/30 focus:border-[var(--capture-primary)] focus:bg-white/[0.07] focus:ring-2 focus:ring-white/10"
                placeholder="nome@email.com"
              />
            </div>
          </div>
          {webinar.lgpdEnabled && (
            <label
              className="capture-enter-item flex cursor-pointer items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs leading-relaxed text-white/65 transition-colors hover:border-white/10 hover:bg-white/[0.04]"
              style={{ animationDelay: "210ms" }}
            >
              <input
                type="checkbox"
                required
                checked={lgpd}
                onChange={(e) => setLgpd(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/25 bg-zinc-950 accent-[var(--capture-primary)] focus:ring-2 focus:ring-[var(--capture-primary)] focus:ring-offset-0 focus:ring-offset-zinc-950"
              />
              <span>{webinar.lgpdText || "Aceito a Política de Privacidade."}</span>
            </label>
          )}
          <button
            type="submit"
            disabled={loading}
            className="capture-enter-item mt-1 flex h-[3.25rem] w-full items-center justify-center gap-2 rounded-xl text-sm font-bold uppercase tracking-[0.12em] text-white shadow-lg outline-none transition-all hover:-translate-y-px hover:brightness-105 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 active:translate-y-0 disabled:translate-y-0 disabled:opacity-55"
            style={{ backgroundColor: primaryColor, animationDelay: "260ms" }}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Aguarde..." : webinar.regCtaText || "Ir para o webinar!"}
          </button>
        </form>
      </section>
    </div>
  );
}
