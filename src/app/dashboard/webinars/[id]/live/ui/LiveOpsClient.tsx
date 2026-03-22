"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MessageCircle,
  BarChart2,
  PlayCircle,
  PauseCircle,
  SkipForward,
  Trash2,
  Pin,
  RefreshCcw,
  Timer,
  AlertTriangle,
} from "lucide-react";

import type { WebinarConfig } from "@/lib/webinar-templates";
import { PollAdmin } from "@/components/polls/PollAdmin";
import { computePublicWatchPhase, webinarStartDateTime } from "@/lib/webinar-timing";
import { useChatSse } from "@/lib/useChatSse";

// Prisma enums nem sempre aparecem como export de tipo no client.
// Mantemos uma união local para tipar estado e inputs do LiveOps.
type WebinarStatus = "DRAFT" | "SCHEDULED" | "LIVE" | "REPLAY" | "FINISHED";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReactPlayer = dynamic(() => import("react-player"), { ssr: false }) as any;

interface LiveOpsClientProps {
  webinarId: string;
  webinarName: string;
  webinarCode: string;
  webinarSlug: string;
  initialStatus: WebinarStatus;
  videoUrl: string;
  startDate: string | null;
  startTime: string | null;
  replayEnabled: boolean;
  config: WebinarConfig;
}

export function LiveOpsClient({
  webinarId,
  webinarName,
  webinarCode,
  webinarSlug,
  initialStatus,
  videoUrl,
  startDate,
  startTime,
  replayEnabled,
  config,
}: LiveOpsClientProps) {
  const [status, setStatus] = useState<WebinarStatus>(initialStatus);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "offer" | "scarcity" | "alerts">("chat");
  const [showOffer, setShowOffer] = useState<boolean>(config.offer.active);
  const [showScarcity, setShowScarcity] = useState<boolean>(config.scarcity.enabled);
  const [showVideoControls, setShowVideoControls] = useState<boolean>(!config.video.hideControls);

  const [phase, setPhase] = useState<"waiting" | "live" | "replay">("live");
  const [countdown, setCountdown] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
  const [webinarSeconds, setWebinarSeconds] = useState(0);
  const [playerSeconds, setPlayerSeconds] = useState(0);
  const [hasPlayerProgress, setHasPlayerProgress] = useState(false);
  const [playerActive, setPlayerActive] = useState(false);

  const debugFirstProgressRef = useRef(false);
  const debugProgressBucketRef = useRef<number>(-1);
  const debugOverlayBucketRef = useRef<number>(-1);
  const debugLastActiveTabRef = useRef<typeof activeTab>("chat");

  const [macros] = useState<string[]>([
    "Seja bem-vindo! De onde você está falando?",
    "Coloque aqui suas dúvidas que vamos responder no final.",
    "Quem ficar até o fim vai receber uma condição especial.",
  ]);

  const chatEnabled = config.chat.enabled;
  const { messages, connected } = useChatSse(webinarId, chatEnabled, 1500);
  const loadingChat = chatEnabled && connected && messages.length === 0;

  const pinned = messages.find((m) => m.pinned);

  async function changeStatus(next: WebinarStatus) {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/webinars/${webinarId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) {
        const data = (await res.json()) as { status: WebinarStatus };
        setStatus(data.status);
      }
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function sendMacro(content: string) {
    await fetch(`/api/webinars/${webinarId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        author: "Equipe",
        content,
        timestamp: config.chat.mode === "replay" ? Math.floor(playerSeconds) : undefined,
      }),
    });
  }

  async function pinMessage(id: string) {
    await fetch(`/api/webinars/${webinarId}/chat/${id}`, { method: "PATCH" });
  }

  async function deleteMessage(id: string) {
    await fetch(`/api/webinars/${webinarId}/chat/${id}`, { method: "DELETE" });
  }

  const PHASE_COLORS = useMemo(
    () => ({
      green: "#10B981",
      yellow: "#EAB308",
      orange: "#F97316",
      red: "#EF4444",
    }),
    [],
  );

  const computeStartDateTime = useCallback(
    () => webinarStartDateTime(startDate, startTime),
    [startDate, startTime],
  );

  const updatePhase = useCallback(() => {
    const { phase: p, secondsUntilStart, secondsSinceStart } = computePublicWatchPhase({
      startDate,
      startTime,
      replayEnabled,
      status,
    });
    setPhase(p);
    if (secondsUntilStart != null && secondsUntilStart > 0) {
      const hours = Math.floor(secondsUntilStart / 3600);
      const minutes = Math.floor((secondsUntilStart % 3600) / 60);
      const seconds = secondsUntilStart % 60;
      setCountdown({ hours, minutes, seconds });
      setWebinarSeconds(0);
    } else {
      setCountdown(null);
      setWebinarSeconds(p === "waiting" ? 0 : secondsSinceStart);
    }
  }, [startDate, startTime, replayEnabled, status]);

  useEffect(() => {
    updatePhase();
    const interval = setInterval(updatePhase, 1000);
    return () => clearInterval(interval);
  }, [updatePhase]);

  useEffect(() => {
    if (phase === "waiting") {
      setPlayerActive(false);
      setPlayerSeconds(0);
      setHasPlayerProgress(false);
    } else {
      // Espera o `onReady` do player para começar de verdade.
      setPlayerActive(false);
      setHasPlayerProgress(false);
    }
  }, [phase]);

  const overlaySeconds = hasPlayerProgress ? playerSeconds : webinarSeconds;

  // #region agent log
  useEffect(() => {
    if (debugLastActiveTabRef.current === activeTab) return;
    debugLastActiveTabRef.current = activeTab;
    fetch("http://127.0.0.1:7890/ingest/61bd3893-904e-42a5-a9f0-b0555de820c3", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "9b991b",
      },
      body: JSON.stringify({
        sessionId: "9b991b",
        runId: "pre-fix",
        hypothesisId: "H4_activeTabUI",
        location: "LiveOpsClient.tsx:activeTab",
        message: "Alternou aba no painel interno",
        data: {
          activeTab,
          showOffer,
          showScarcity,
          showVideoControls,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }, [activeTab, showOffer, showScarcity, showVideoControls]);
  // #endregion agent log

  // #region agent log
  useEffect(() => {
    const bucket = Math.floor(overlaySeconds / 30);
    if (bucket !== debugOverlayBucketRef.current && bucket <= 4) {
      debugOverlayBucketRef.current = bucket;
      fetch("http://127.0.0.1:7890/ingest/61bd3893-904e-42a5-a9f0-b0555de820c3", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "9b991b",
        },
        body: JSON.stringify({
          sessionId: "9b991b",
          runId: "pre-fix",
          hypothesisId: "H3_overlaySeconds",
          location: "LiveOpsClient.tsx:overlaySeconds",
          message: "overlaySeconds usado para oferta/escassez",
          data: {
            phase,
            hasPlayerProgress,
            playerSeconds,
            webinarSeconds,
            overlaySeconds,
            bucket,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    }
  }, [overlaySeconds, hasPlayerProgress, playerSeconds, webinarSeconds, phase]);
  // #endregion agent log

  const offerComputed = useMemo(() => {
    const offer = config.offer;
    if (!offer.colorTimer.enabled) {
      return {
        offerPhase: "green" as const,
        remainingSeconds: null,
        text: "Quero participar!",
        color: offer.active ? config.branding.primaryColor : config.branding.primaryColor,
      };
    }

    const phases = ["green", "yellow", "orange", "red"] as const;
    let cumulative = 0;
    for (const p of phases) {
      cumulative += offer.colorTimer.phases[p].seconds;
      if (overlaySeconds < cumulative) {
        const remainingSeconds = cumulative - overlaySeconds;
        return {
          offerPhase: p,
          remainingSeconds,
          text: offer.colorTimer.phases[p].text,
          color: PHASE_COLORS[p],
        };
      }
    }

    return {
      offerPhase: "red" as const,
      remainingSeconds: 0,
      text: offer.colorTimer.phases.red.text,
      color: PHASE_COLORS.red,
    };
  }, [PHASE_COLORS, config.branding.primaryColor, config.offer, overlaySeconds]);

  const scarcityComputed = useMemo(() => {
    const scarcity = config.scarcity;
    if (!scarcity.timer.enabled) {
      return {
        bg: PHASE_COLORS.green,
        remainingSeconds: null as number | null,
      };
    }

    const remainingSeconds = Math.max(0, scarcity.timer.totalSeconds - overlaySeconds);
    const { thresholds } = scarcity.timer;
    const bg =
      remainingSeconds >= thresholds.green.to
        ? PHASE_COLORS.green
        : remainingSeconds >= thresholds.yellow.to
          ? PHASE_COLORS.yellow
          : remainingSeconds >= thresholds.orange.to
            ? PHASE_COLORS.orange
            : PHASE_COLORS.red;

    return { bg, remainingSeconds };
  }, [PHASE_COLORS, config.scarcity, overlaySeconds]);

  const computeTargetSecondsNow = useCallback(() => {
    const startDateTime = computeStartDateTime();
    if (!startDateTime) return 0;
    return Math.max(0, Math.floor((Date.now() - startDateTime.getTime()) / 1000));
  }, [computeStartDateTime]);

  // #region agent log
  useEffect(() => {
    const startDateTime = computeStartDateTime();
    fetch("http://127.0.0.1:7890/ingest/61bd3893-904e-42a5-a9f0-b0555de820c3", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "9b991b",
      },
      body: JSON.stringify({
        sessionId: "9b991b",
        runId: "pre-fix",
        hypothesisId: "H1_phaseCalc",
        location: "LiveOpsClient.tsx:init",
        message: "Props timing do LiveOpsClient",
        data: {
          webinarId,
          hasVideoUrl: Boolean(videoUrl),
          startDate,
          startTime,
          replayEnabled,
          hasStartDateTime: Boolean(startDateTime),
          startDateTimeISO: startDateTime?.toISOString() ?? null,
          configOfferActive: config.offer.active,
          configScarcityEnabled: config.scarcity.enabled,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // #endregion agent log

  return (
    <div className="relative">
      {/* Player fixo no canto - sincronizado com o timing do webinar */}
      <div className="fixed bottom-3 right-3 z-40 w-[280px] h-[157px] sm:w-[320px] sm:h-[180px] md:w-[420px] md:h-[236px] rounded-2xl overflow-hidden bg-black shadow-2xl ring-1 ring-white/10">
        <div className="relative h-full w-full">
          {phase === "waiting" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/70 px-3 text-center">
              <div className="mb-4 h-14 w-14 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                <Timer className="h-7 w-7 text-white/60" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">O evento começará em breve</p>
              <h1 className="mt-3 text-sm font-semibold text-white/90 truncate">{webinarName}</h1>
              {countdown && (
                <div className="mt-4 flex items-center justify-center gap-3 text-white">
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-bold font-mono">{String(countdown.hours).padStart(2, "0")}</span>
                    <span className="text-[10px] text-white/60 uppercase">Horas</span>
                  </div>
                  <span className="text-white/30">:</span>
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-bold font-mono">{String(countdown.minutes).padStart(2, "0")}</span>
                    <span className="text-[10px] text-white/60 uppercase">Min</span>
                  </div>
                  <span className="text-white/30">:</span>
                  <div className="flex flex-col items-center">
                    <span className="text-lg font-bold font-mono">{String(countdown.seconds).padStart(2, "0")}</span>
                    <span className="text-[10px] text-white/60 uppercase">Seg</span>
                  </div>
                </div>
              )}
            </div>
          ) : videoUrl ? (
            <div className="absolute inset-0">
              <ReactPlayer
                url={videoUrl}
                width="100%"
                height="100%"
                className="absolute inset-0"
                playing={playerActive}
                muted
                controls={showVideoControls}
                onReady={(player: unknown) => {
                  const targetSeconds = computeTargetSecondsNow();
                  // #region agent log
                  fetch("http://127.0.0.1:7890/ingest/61bd3893-904e-42a5-a9f0-b0555de820c3", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "X-Debug-Session-Id": "9b991b",
                    },
                    body: JSON.stringify({
                      sessionId: "9b991b",
                      runId: "pre-fix",
                      hypothesisId: "H2_seekReady",
                      location: "LiveOpsClient.tsx:onReady",
                      message: "seekTo no onReady do player fixo",
                      data: {
                        phase,
                        targetSeconds,
                        replayEnabled,
                        startDate,
                        startTime,
                      },
                      timestamp: Date.now(),
                    }),
                  }).catch(() => {});
                  // #endregion agent log
                  const p = player as { seekTo: (seconds: number, type?: string) => void };
                  p.seekTo(targetSeconds, "seconds");
                  setPlayerActive(true);
                }}
                onProgress={({ playedSeconds }: { playedSeconds: number }) => {
                  setPlayerSeconds(Math.floor(playedSeconds));
                  setHasPlayerProgress(true);
                  const playedSecondsInt = Math.floor(playedSeconds);
                  if (!debugFirstProgressRef.current) {
                    debugFirstProgressRef.current = true;
                    // #region agent log
                    fetch("http://127.0.0.1:7890/ingest/61bd3893-904e-42a5-a9f0-b0555de820c3", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "X-Debug-Session-Id": "9b991b",
                      },
                      body: JSON.stringify({
                        sessionId: "9b991b",
                        runId: "pre-fix",
                        hypothesisId: "H2_seekReady",
                        location: "LiveOpsClient.tsx:onProgress:first",
                        message: "Primeiro onProgress do player",
                        data: {
                          phase,
                          playedSeconds,
                          playedSecondsInt,
                          playerActive,
                          webinarSeconds,
                        },
                        timestamp: Date.now(),
                      }),
                    }).catch(() => {});
                    // #endregion agent log
                  }

                  const bucket = Math.floor(playedSecondsInt / 30);
                  if (bucket !== debugProgressBucketRef.current && bucket <= 4) {
                    debugProgressBucketRef.current = bucket;
                    // #region agent log
                    fetch("http://127.0.0.1:7890/ingest/61bd3893-904e-42a5-a9f0-b0555de820c3", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "X-Debug-Session-Id": "9b991b",
                      },
                      body: JSON.stringify({
                        sessionId: "9b991b",
                        runId: "pre-fix",
                        hypothesisId: "H2_seekReady",
                        location: "LiveOpsClient.tsx:onProgress:bucket",
                        message: "onProgress bucket (~30s)",
                        data: {
                          phase,
                          bucket,
                          playedSecondsInt,
                          webinarSeconds,
                        },
                        timestamp: Date.now(),
                      }),
                    }).catch(() => {});
                    // #endregion agent log
                  }
                }}
                config={{
                  youtube: {
                    playerVars: {
                      controls: showVideoControls ? 1 : 0,
                      rel: 0,
                      modestbranding: 1,
                      autoplay: 0,
                    },
                  },
                }}
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 px-3 text-center">
              <p className="text-xs text-slate-300">Vídeo indisponível</p>
            </div>
          )}

          {/* Scarcity overlay */}
          {showScarcity && config.scarcity.enabled && phase !== "waiting" && (
            <div className="pointer-events-none absolute top-3 left-3 right-3">
              <div
                className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-white text-xs font-bold shadow"
                style={{ backgroundColor: scarcityComputed.bg }}
              >
                <AlertTriangle className="h-4 w-4" />
                <span className="truncate">{config.scarcity.message}</span>
                {config.scarcity.count > 0 && (
                  <span className="bg-black/20 px-2 py-0.5 rounded text-[11px] font-semibold">
                    {config.scarcity.count} vagas
                  </span>
                )}
                {config.scarcity.timer.enabled && scarcityComputed.remainingSeconds !== null && (
                  <span className="ml-1 text-[11px] font-mono">
                    {formatTime(scarcityComputed.remainingSeconds)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Offer overlay */}
          {showOffer && config.offer.active && phase !== "waiting" && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2">
              <a
                href={config.offer.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="pointer-events-auto flex items-center justify-center rounded-xl text-xs md:text-sm font-bold text-white shadow-2xl transition-all hover:brightness-110 active:scale-95 h-10 px-3 whitespace-nowrap"
                style={{ backgroundColor: offerComputed.color }}
              >
                {offerComputed.text}
                {config.offer.colorTimer.enabled && config.offer.colorTimer.showCountdown && offerComputed.remainingSeconds !== null && (
                  <span className="ml-2 text-white/90 font-mono text-[11px]">
                    {formatTime(offerComputed.remainingSeconds)}
                  </span>
                )}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Abas internas */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-800/70 pb-3">
          {(
            [
              { id: "chat", label: "CHAT", icon: MessageCircle },
              { id: "offer", label: "OFERTA", icon: PlayCircle },
              { id: "scarcity", label: "ESCASSEZ", icon: AlertTriangle },
              { id: "alerts", label: "AVISOS", icon: Timer },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={[
                  "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-widest whitespace-nowrap transition",
                  active
                    ? "border-violet-500 bg-violet-600/20 text-violet-200"
                    : "border-slate-800 bg-slate-900/70 text-slate-400 hover:border-slate-700 hover:text-slate-200",
                ].join(" ")}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          {/* Coluna esquerda: Resumo + Status + Macros */}
          <div className="space-y-4">
        <section className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Webinar
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-50">{webinarName}</h2>
              <p className="mt-1 text-xs text-slate-400">
                Link público:{" "}
                <span className="font-mono text-[11px] text-slate-300">
                  /live/{webinarCode}/{webinarSlug}
                </span>
              </p>
            </div>
            <a
              href={`/live/${webinarCode}/${webinarSlug}/watch`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500/90 px-4 py-2 text-xs font-semibold text-emerald-950 shadow hover:bg-emerald-400"
            >
              <PlayCircle className="h-4 w-4" />
              Abrir player
            </a>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 shadow-lg">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Status do webinar
              </p>
              <p className="text-sm text-slate-300">
                Controle rápido de DRAFT / SCHEDULED / LIVE / REPLAY / FINISHED.
              </p>
            </div>
            <button
              type="button"
              onClick={() => changeStatus(status)}
              className="inline-flex items-center gap-1 rounded-full border border-slate-700 px-2 py-1 text-[11px] text-slate-400 hover:border-slate-500"
            >
              <RefreshCcw className="h-3 w-3" />
              Recarregar
            </button>
          </header>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
            {(
              [
                "DRAFT",
                "SCHEDULED",
                "LIVE",
                "REPLAY",
                "FINISHED",
              ] as WebinarStatus[]
            ).map((s) => {
              const isActive = status === s;
              const Icon =
                s === "LIVE"
                  ? PlayCircle
                  : s === "SCHEDULED"
                  ? BarChart2
                  : s === "REPLAY"
                  ? SkipForward
                  : s === "FINISHED"
                  ? PauseCircle
                  : PlayCircle;

              return (
                <button
                  key={s}
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => changeStatus(s)}
                  className={`flex flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[11px] font-medium transition ${
                    isActive
                      ? "border-violet-500 bg-violet-600/20 text-violet-200"
                      : "border-slate-800 bg-slate-900/80 text-slate-400 hover:border-slate-600 hover:text-slate-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{s}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 shadow-lg">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Macros de mensagens
              </p>
              <p className="text-sm text-slate-300">
                Dispare mensagens prontas no chat com um clique.
              </p>
            </div>
          </header>

          <div className="space-y-2">
            {macros.map((macro) => (
              <button
                key={macro}
                type="button"
                onClick={() => sendMacro(macro)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-left text-xs text-slate-200 hover:border-violet-500 hover:bg-violet-600/10"
              >
                {macro}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800/80 bg-slate-950/60 shadow-lg">
          <PollAdmin webinarId={webinarId} />
        </section>
        </div>

          {/* Coluna direita: Conteúdo por aba */}
          <div className="space-y-4">
            {activeTab === "chat" && (
              <section className="flex min-h-[340px] flex-col rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 shadow-lg">
                <header className="mb-3 flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-600/20 text-violet-300">
                      <MessageCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-50">Chat ao vivo</p>
                      <p className="text-xs text-slate-400">
                        Veja, fixe e remova mensagens em tempo real.
                      </p>
                    </div>
                  </div>
                </header>

                {pinned && (
                  <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100">
                    <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest">
                      <Pin className="h-3 w-3" />
                      Mensagem fixada
                    </div>
                    <p className="font-semibold">{pinned.author}</p>
                    <p className="mt-1 text-amber-50/90">{pinned.content}</p>
                  </div>
                )}

                <div className="flex-1 space-y-2 overflow-y-auto pr-1 pb-28 text-xs">
                  {loadingChat && (
                    <p className="text-[11px] text-slate-500">Carregando mensagens...</p>
                  )}
                  {messages
                    .filter((m) => !m.pinned)
                    .map((m) => (
                      <div
                        key={m.id}
                        className="group rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2"
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <p className="text-[11px] font-semibold text-slate-100">{m.author}</p>
                          <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => pinMessage(m.id)}
                              className="rounded p-1 text-slate-500 hover:text-amber-400"
                              title="Fixar no player"
                            >
                              <Pin className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteMessage(m.id)}
                              className="rounded p-1 text-slate-500 hover:text-red-400"
                              title="Apagar"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-200">{m.content}</p>
                      </div>
                    ))}

                  {!loadingChat && messages.length === 0 && (
                    <p className="mt-4 text-center text-[11px] text-slate-500">
                      Nenhuma mensagem enviada ainda.
                    </p>
                  )}
                </div>
              </section>
            )}

            {activeTab === "offer" && (
              <section className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 shadow-lg">
                <div className="flex items-center gap-2">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-600/20 text-violet-300">
                    <PlayCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-50">Exibição de Oferta</p>
                    <p className="text-xs text-slate-400">Mostra ou oculta a oferta no player fixo.</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-3">
                  <div>
                    <p className="text-xs font-bold text-slate-200">Exibir Oferta</p>
                    <p className="text-[11px] text-slate-400">Gatilho local (layout do gestor).</p>
                  </div>
                  <button
                    type="button"
                    disabled={!config.offer.active}
                    onClick={() => setShowOffer((v) => !v)}
                    className={[
                      "inline-flex h-9 w-16 items-center justify-center rounded-full border text-xs font-bold transition",
                      showOffer ? "border-violet-500 bg-violet-600/20 text-violet-200" : "border-slate-800 bg-slate-900/80 text-slate-400",
                    ].join(" ")}
                  >
                    {showOffer ? "ON" : "OFF"}
                  </button>
                </div>

                <p className="mt-3 text-[11px] text-slate-400">
                  Se `config.offer.active` estiver desativado no webinar, a oferta não será exibida.
                </p>
              </section>
            )}

            {activeTab === "scarcity" && (
              <section className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 shadow-lg">
                <div className="flex items-center gap-2">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-300">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-50">Exibição de Escassez</p>
                    <p className="text-xs text-slate-400">Mostra ou oculta o banner de escassez no player fixo.</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-3">
                  <div>
                    <p className="text-xs font-bold text-slate-200">Exibir Escassez</p>
                    <p className="text-[11px] text-slate-400">Gatilho local (layout do gestor).</p>
                  </div>
                  <button
                    type="button"
                    disabled={!config.scarcity.enabled}
                    onClick={() => setShowScarcity((v) => !v)}
                    className={[
                      "inline-flex h-9 w-16 items-center justify-center rounded-full border text-xs font-bold transition",
                      showScarcity ? "border-amber-500 bg-amber-500/20 text-amber-200" : "border-slate-800 bg-slate-900/80 text-slate-400",
                    ].join(" ")}
                  >
                    {showScarcity ? "ON" : "OFF"}
                  </button>
                </div>

                {config.scarcity.timer.enabled && (
                  <p className="mt-3 text-[11px] text-slate-400">
                    O banner muda de cor conforme o tempo restante.
                  </p>
                )}
              </section>
            )}

            {activeTab === "alerts" && (
              <section className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 shadow-lg">
                <div className="flex items-center gap-2">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100/10 text-slate-300">
                    <Timer className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-50">Controles do Vídeo</p>
                    <p className="text-xs text-slate-400">Exibe/oculta a barra de controles do player fixo.</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-3">
                  <div>
                    <p className="text-xs font-bold text-slate-200">Exibir Controle do Vídeo</p>
                    <p className="text-[11px] text-slate-400">Atalho para o gestor acompanhar o player.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowVideoControls((v) => !v)}
                    className={[
                      "inline-flex h-9 w-16 items-center justify-center rounded-full border text-xs font-bold transition",
                      showVideoControls ? "border-violet-500 bg-violet-600/20 text-violet-200" : "border-slate-800 bg-slate-900/80 text-slate-400",
                    ].join(" ")}
                  >
                    {showVideoControls ? "ON" : "OFF"}
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const sec = totalSeconds % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

