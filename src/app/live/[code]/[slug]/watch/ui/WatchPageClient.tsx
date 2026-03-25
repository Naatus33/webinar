"use client";

import dynamic from "next/dynamic";
import { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { 
  MessageCircle, X, Users, AlertTriangle, ChevronUp, Pin, 
  Maximize2, Minimize2, Heart, Timer, Zap, Send, Share2,
  Trophy, Rocket, Flame, ThumbsUp, Bell, Monitor, Laptop,
  Volume2, VolumeX, Settings, Layout, ShoppingCart
} from "lucide-react";
import type { WebinarConfig } from "@/lib/webinar-templates";
import { computePublicWatchPhase } from "@/lib/webinar-timing";
import { useWebinarSse } from "@/lib/useWebinarSse";
import { PollDisplay } from "@/components/polls/PollDisplay";

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false }) as any;

interface WebinarData {
  id: string;
  name: string;
  code: string;
  slug: string;
  status: string;
  videoUrl: string;
  startDate: string | null;
  startTime: string | null;
  replayEnabled: boolean;
  redirectEnabled: boolean;
  redirectUrl: string | null;
  config: WebinarConfig;
}

const PHASE_COLORS: Record<string, string> = {
  green: "#10B981",
  yellow: "#EAB308",
  orange: "#F97316",
  red: "#EF4444",
};

const REACTION_ICONS = [
  { id: 'heart', Icon: Heart, color: 'text-red-500', key: '1' },
  { id: 'flame', Icon: Flame, color: 'text-orange-500', key: '2' },
  { id: 'rocket', Icon: Rocket, color: 'text-blue-500', key: '3' },
  { id: 'trophy', Icon: Trophy, color: 'text-yellow-500', key: '4' },
  { id: 'thumbsup', Icon: ThumbsUp, color: 'text-emerald-500', key: '5' },
];

const AVATAR_PALETTE = [
  "border-violet-500/35 bg-violet-500/20 text-violet-100",
  "border-sky-500/35 bg-sky-500/20 text-sky-100",
  "border-emerald-500/35 bg-emerald-500/20 text-emerald-100",
  "border-amber-500/35 bg-amber-500/20 text-amber-100",
  "border-rose-500/35 bg-rose-500/20 text-rose-100",
  "border-cyan-500/35 bg-cyan-500/20 text-cyan-100",
  "border-fuchsia-500/35 bg-fuchsia-500/20 text-fuchsia-100",
  "border-lime-500/35 bg-lime-500/20 text-lime-100",
  "border-indigo-500/35 bg-indigo-500/20 text-indigo-100",
  "border-orange-500/35 bg-orange-500/20 text-orange-100",
  "border-teal-500/35 bg-teal-500/20 text-teal-100",
  "border-pink-500/35 bg-pink-500/20 text-pink-100",
] as const;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getMentionQueryAtCursor(value: string, cursorPos: number): { start: number; query: string } | null {
  const before = value.slice(0, cursorPos);
  const at = before.lastIndexOf("@");
  if (at === -1) return null;
  if (at > 0 && !/\s/.test(before[at - 1]!)) return null;
  const query = before.slice(at + 1);
  if (/\s/.test(query)) return null;
  return { start: at, query };
}

function renderChatContentWithMentions(text: string) {
  const parts = text.split(/(@[^\s@]+)/g);
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="font-semibold text-primary/90">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function WatchPageClient({
  webinar: initialWebinar,
}: {
  webinar: WebinarData;
}) {
  const searchParams = useSearchParams();
  const [viewerKey, setViewerKey] = useState<string | null>(null);
  const { messages, polls, status: sseStatus, config: sseConfig, spots, connected } = useWebinarSse(
    initialWebinar.id,
    true,
    1500,
    viewerKey,
  );
  
  const config = sseConfig || initialWebinar.config;
  const currentStatus = sseStatus || initialWebinar.status;

  const [phase, setPhase] = useState<"waiting" | "live" | "replay">("live");
  const [countdown, setCountdown] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
  
  const [chatOpen, setChatOpen] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [playerSeconds, setPlayerSeconds] = useState(0);
  const playerWatchRef = useRef<any>(null);
  const watchVideoDurationRef = useRef(0);
  const playerSecondsRef = useRef(0);
  useEffect(() => { playerSecondsRef.current = playerSeconds; }, [playerSeconds]);

  function handleWatchEnded() {
    const dur = watchVideoDurationRef.current;
    if (dur <= 0) return; // duração ainda desconhecida, não faz seek
    const target = playerSecondsRef.current % dur;
    // Aguarda 300ms para o player aceitar o seek após onEnded
    setTimeout(() => {
      try { playerWatchRef.current?.seekTo(target, "seconds"); } catch {}
    }, 300);
  }
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [participants, setParticipants] = useState<number | null>(null);
  /** Começa mutado para autoplay funcionar na maioria dos navegadores (política de autoplay com áudio). */
  const [isMuted, setIsMuted] = useState(true);
  
  // Reações flutuantes
  const [floatingReactions, setFloatingReactions] = useState<{id: number, type: string, left: number}[]>([]);
  const reactionCounter = useRef(0);

  // Prova Social
  const [socialProof, setSocialProof] = useState<{ name: string, city: string } | null>(null);
  
  // Scroll do Chat
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  /** Uma cor aleatória da paleta por autor, estável durante a sessão nesta aba. */
  const avatarColorByAuthorRef = useRef<Record<string, string>>({});
  const [userIsScrolling, setUserIsScrolling] = useState(false);

  function pickAvatarClass(authorKey: string): string {
    const key = authorKey.trim() || "?";
    const map = avatarColorByAuthorRef.current;
    if (!map[key]) {
      const idx = Math.floor(Math.random() * AVATAR_PALETTE.length);
      map[key] = AVATAR_PALETTE[idx]!;
    }
    return map[key];
  }

  /** Estado inicial igual no SSR e no cliente — evita mismatch de hidratação (quebrava o input do chat). */
  const [participantName, setParticipantName] = useState<string | null>(null);
  const [participantEmail, setParticipantEmail] = useState<string | null>(null);
  const [showNameModal, setShowNameModal] = useState(true);
  const [modalNameDraft, setModalNameDraft] = useState("");
  const heartPendingRef = useRef<Set<string>>(new Set());
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionStart, setMentionStart] = useState(0);
  const [mentionHighlight, setMentionHighlight] = useState(0);

  const mentionCandidates = useMemo(() => {
    const names = [...new Set(messages.map((m) => m.author))].filter(
      (a) => a !== "Equipe" && (!participantName || a !== participantName),
    );
    return names.sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [messages, participantName]);

  const pinned = messages.find((m) => m.pinned);
  const activePoll = polls.find(p => !p.closed);

  const tickPhase = useCallback(() => {
    const { phase: p, secondsUntilStart, secondsSinceStart } = computePublicWatchPhase({
      startDate: initialWebinar.startDate,
      startTime: initialWebinar.startTime,
      replayEnabled: initialWebinar.replayEnabled,
      status: currentStatus,
    });
    setPhase(p);
    if (secondsUntilStart != null && secondsUntilStart > 0) {
      const h = Math.floor(secondsUntilStart / 3600);
      const m = Math.floor((secondsUntilStart % 3600) / 60);
      const s = secondsUntilStart % 60;
      setCountdown({ hours: h, minutes: m, seconds: s });
    } else {
      setCountdown(null);
    }
    
    if (p === "live" || p === "replay") {
      setPlayerSeconds((prev) => {
        if (secondsSinceStart <= 0) return prev;
        return prev < secondsSinceStart ? secondsSinceStart : prev;
      });
    } else {
      setPlayerSeconds(0);
    }
  }, [initialWebinar, currentStatus]);

  useEffect(() => {
    tickPhase();
    const timer = setInterval(tickPhase, 1000);
    return () => clearInterval(timer);
  }, [tickPhase]);

  // Nome/email: URL tem prioridade; senão sessionStorage (após hidratar, antes do paint quando possível)
  useLayoutEffect(() => {
    try {
      const urlName = searchParams.get("name")?.trim();
      const urlEmail = searchParams.get("email")?.trim();
      if (urlName) {
        sessionStorage.setItem("lead_name", urlName);
        setParticipantName(urlName);
        setShowNameModal(false);
        if (urlEmail) {
          sessionStorage.setItem("lead_email", urlEmail);
          setParticipantEmail(urlEmail);
        }
        return;
      }
      const storedName = sessionStorage.getItem("lead_name")?.trim();
      if (storedName) {
        setParticipantName(storedName);
        setShowNameModal(false);
      }
      if (urlEmail) {
        sessionStorage.setItem("lead_email", urlEmail);
        setParticipantEmail(urlEmail);
      } else {
        const em = sessionStorage.getItem("lead_email");
        if (em) setParticipantEmail(em);
      }
    } catch {
      /* private mode / storage bloqueado */
    }
  }, [searchParams]);

  /** Chave estável por aba para curtidas no servidor (uma por viewerKey). */
  useLayoutEffect(() => {
    try {
      let k = sessionStorage.getItem("watch_heart_key");
      if (!k) {
        k = crypto.randomUUID();
        sessionStorage.setItem("watch_heart_key", k);
      }
      setViewerKey(k);
    } catch {
      setViewerKey(`k-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    }
  }, []);

  // Heartbeat a cada 30s para rastrear presença
  useEffect(() => {
    if (!participantName) return;
    const sendHeartbeat = () => {
      const email = participantEmail ?? (typeof window !== "undefined" ? (sessionStorage.getItem("lead_email") ?? undefined) : undefined);
      fetch(`/api/webinars/${initialWebinar.id}/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: participantName, email }),
        keepalive: true,
      }).catch(() => {});
    };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 30_000);
    return () => clearInterval(interval);
  }, [participantName, participantEmail, initialWebinar.id]);

  // Scroll automático do chat — rola apenas o container, não a página
  useEffect(() => {
    if (!userIsScrolling && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, userIsScrolling]);

  // Simulação de participantes e prova social
  useEffect(() => {
    const base = config.participants.min;
    const range = config.participants.max - config.participants.min;
    setParticipants(base + Math.floor(Math.random() * range));
    
    const interval = setInterval(() => {
      setParticipants(prev => {
        if (prev === null) return base;
        const delta = Math.floor(Math.random() * 11) - 5;
        return Math.min(config.participants.max, Math.max(config.participants.min, prev + delta));
      });

      if (config.socialProof.enabled && Math.random() > 0.7) {
        const name = config.socialProof.fakeNames[Math.floor(Math.random() * config.socialProof.fakeNames.length)];
        const city = config.socialProof.fakeCities[Math.floor(Math.random() * config.socialProof.fakeCities.length)];
        setSocialProof({ name, city });
        setTimeout(() => setSocialProof(null), 6000);
      }
    }, 12000);
    return () => clearInterval(interval);
  }, [config.participants, config.socialProof]);

  // Atalhos de Teclado (Desktop)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const t = e.target;
      if (t instanceof HTMLElement) {
        if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") return;
        if (t.isContentEditable) return;
        const ce = t.closest("[contenteditable]");
        if (ce instanceof HTMLElement && ce.isContentEditable) return;
      }
      
      const reaction = REACTION_ICONS.find(r => r.key === e.key);
      if (reaction) addReaction(reaction.id);
      
      if (e.key.toLowerCase() === 'f') setFocusMode(prev => !prev);
      if (e.key.toLowerCase() === 'm') setIsMuted(prev => !prev);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [config.reactions.enabled]);

  const offerComputed = useMemo(() => {
    const offer = config.offer;
    if (!offer.colorTimer.enabled) {
      return {
        offerPhase: "green" as const,
        remainingSeconds: null,
        text: "Quero participar!",
        color: config.branding.primaryColor,
      };
    }

    const phases = ["green", "yellow", "orange", "red"] as const;
    let cumulative = 0;
    for (const p of phases) {
      cumulative += offer.colorTimer.phases[p].seconds;
      if (playerSeconds < cumulative) {
        return {
          offerPhase: p,
          remainingSeconds: cumulative - playerSeconds,
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
  }, [config.branding.primaryColor, config.offer, playerSeconds]);

  const addReaction = (type: string) => {
    if (!config.reactions.enabled) return;
    const id = reactionCounter.current++;
    const left = Math.random() * 80 + 10;
    setFloatingReactions(prev => [...prev, { id, type, left }]);
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== id));
    }, 3000);
  };

  async function toggleMessageHeart(msgId: string) {
    if (!viewerKey || heartPendingRef.current.has(msgId)) return;
    heartPendingRef.current.add(msgId);
    try {
      const res = await fetch(`/api/webinars/${initialWebinar.id}/chat/${msgId}/heart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewerKey }),
      });
      if (!res.ok) return;
    } finally {
      heartPendingRef.current.delete(msgId);
    }
  }

  function confirmParticipantName() {
    const n = modalNameDraft.trim();
    if (n.length < 1 || n.length > 80) return;
    try { sessionStorage.setItem("lead_name", n); } catch {}
    setParticipantName(n);
    setShowNameModal(false);
    setModalNameDraft("");
  }

  const mentionFiltered = useMemo(() => {
    if (!mentionOpen) return [];
    const tail = chatInput.slice(mentionStart + 1);
    const q = (tail.split(/\s/)[0] ?? "").toLowerCase();
    return mentionCandidates.filter((n) => n.toLowerCase().includes(q));
  }, [mentionOpen, chatInput, mentionStart, mentionCandidates]);

  useEffect(() => {
    if (mentionFiltered.length === 0) {
      setMentionHighlight(0);
      return;
    }
    setMentionHighlight((h) => Math.min(h, mentionFiltered.length - 1));
  }, [mentionFiltered.length]);

  function insertMentionPick(name: string) {
    const tail = chatInput.slice(mentionStart + 1);
    const qLen = tail.split(/\s/)[0]?.length ?? tail.length;
    const replaceEnd = mentionStart + 1 + qLen;
    const newVal = `${chatInput.slice(0, mentionStart)}@${name} ${chatInput.slice(replaceEnd)}`;
    setChatInput(newVal);
    setMentionOpen(false);
    const pos = mentionStart + name.length + 2;
    requestAnimationFrame(() => {
      const el = chatInputRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(pos, pos);
      }
    });
  }

  async function sendChatMessage() {
    if (!participantName?.trim() || !chatInput.trim() || chatSending) return;
    const content = chatInput.trim();
    setChatInput("");
    setMentionOpen(false);
    setChatSending(true);
    try {
      const res = await fetch(`/api/webinars/${initialWebinar.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: participantName.trim(),
          content,
          timestamp: Math.floor(playerSeconds),
        }),
      });
      if (!res.ok) {
        setChatInput(content);
      }
    } catch {
      setChatInput(content);
    } finally {
      setChatSending(false);
    }
  }

  // Efeito Ambilight Dinâmico
  const ambilightColor = config.offer.active ? 'rgba(249, 115, 22, 0.15)' : 'rgba(124, 58, 237, 0.05)';

  const showWaitingOverlay = phase === "waiting" && countdown !== null;
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const playerPlaying = phase !== "waiting";
  /** react-player v3+ usa `src`; `url` é ignorado e caía no player HTML5 sem fonte. */
  const watchSrc = initialWebinar.videoUrl?.trim() ?? "";

  const chatLocked = !participantName || showNameModal;

  return (
    <div className={`h-[100dvh] max-h-[100dvh] bg-slate-950 text-slate-200 flex flex-col overflow-hidden transition-all duration-1000 ${focusMode ? 'bg-black' : ''}`}>
      {showNameModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="watch-name-modal-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h2 id="watch-name-modal-title" className="text-lg font-black text-white">
              Como quer aparecer no chat?
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Use o mesmo nome da inscrição ou outro apelido. Isso vale só para esta sessão neste aparelho.
            </p>
            <input
              type="text"
              value={modalNameDraft}
              onChange={(e) => setModalNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  confirmParticipantName();
                }
              }}
              maxLength={80}
              placeholder="Seu nome"
              className="mt-4 h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm text-white outline-none ring-primary/30 focus:border-primary/50 focus:ring-2"
              autoFocus
            />
            <button
              type="button"
              onClick={confirmParticipantName}
              disabled={modalNameDraft.trim().length < 1}
              className="mt-4 h-11 w-full rounded-xl bg-primary text-sm font-black text-white transition-all hover:brightness-110 disabled:opacity-40"
            >
              Entrar na sala
            </button>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes reactionFloat {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          20% { transform: translateY(-20px) scale(1.4); opacity: 1; }
          100% { transform: translateY(-250px) scale(1); opacity: 0; }
        }
        .animate-reaction { animation: reactionFloat 3s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .glow-button { box-shadow: 0 0 20px rgba(var(--primary-rgb), 0.3); }
        .glow-button:hover { box-shadow: 0 0 40px rgba(var(--primary-rgb), 0.5); }
        .ambilight { background: radial-gradient(circle at center, ${ambilightColor} 0%, transparent 70%); }
        
        .player-container:hover .player-overlay {
          opacity: 1;
        }
        /* Bloqueador: sem controles nativos no embed; play/pause só via props (e som pelo botão da sala). */
        .player-wrapper > * {
          pointer-events: none;
        }
        .ytp-chrome-top, .ytp-show-cards-title, .ytp-share-button, .ytp-pause-overlay {
          display: none !important;
        }
      `}} />

      {/* Ambilight Background */}
      {config.layout.ambilight && (
        <div className="absolute inset-0 ambilight pointer-events-none z-0 transition-all duration-1000" />
      )}

      {/* Header Premium (compacto para caber vídeo + chat na viewport) */}
      {!focusMode && (
        <header className="h-14 shrink-0 border-b border-slate-800/40 bg-slate-900/60 backdrop-blur-2xl flex items-center justify-between px-4 md:px-6 z-50">
          <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
            {config.branding.logo ? (
              <img src={config.branding.logo} alt="Logo" className="h-8 w-auto shrink-0 object-contain transition-transform hover:scale-105 md:h-9" />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/20 border border-primary/30 shadow-lg shadow-primary/10 md:h-9 md:w-9">
                <Zap className="h-4 w-4 text-primary md:h-[18px] md:w-[18px]" />
              </div>
            )}
            <div className="min-w-0 flex flex-col gap-0.5">
              <h1 className="truncate font-black text-xs text-white tracking-tight md:text-sm">
                {config.content.title || initialWebinar.name}
              </h1>
              <div className="flex items-center gap-1.5">
                <span className="flex h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-400 tabular-nums md:text-[11px]">
                  {participants || 0} assistindo agora
                </span>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main: min-h-0 permite o flex encolher; bloco centralizado em telas largas */}
      <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row lg:justify-center">
        <div className="flex min-h-0 w-full max-w-[1600px] flex-1 flex-col overflow-hidden lg:flex-row lg:mx-auto">
        
        {/* Video Area — limita 16:9 para caber na altura útil (header já descontado) */}
        <div
          className={`relative flex min-h-0 flex-1 items-center justify-center bg-black transition-all duration-500 lg:min-w-0 ${
            focusMode ? "lg:p-0" : "p-2 lg:p-3"
          }`}
        >
          <div
            className={`relative mx-auto aspect-video w-full overflow-hidden shadow-2xl shadow-black/80 group player-container max-h-[min(50dvh,calc(100dvh-10rem))] max-w-[min(100%,calc(50dvh*16/9))] ${
              focusMode
                ? "lg:max-h-[calc(100dvh-1rem)] lg:max-w-[min(100%,calc((100dvh-1rem)*16/9))]"
                : "lg:max-h-[calc(100dvh-3.5rem)] lg:max-w-[min(100%,calc((100dvh-3.5rem)*16/9))]"
            }`}
          >
            
            {/* Player Wrapper */}
            <div className="w-full h-full player-wrapper">
              {watchSrc ? (
                <ReactPlayer
                  ref={playerWatchRef}
                  key={watchSrc}
                  url={watchSrc}
                  src={watchSrc}
                  width="100%"
                  height="100%"
                  playing={playerPlaying}
                  muted={isMuted}
                  controls={false}
                  playsInline
                  preload="auto"
                  onDuration={(d: number) => { watchVideoDurationRef.current = d; }}
                  onEnded={handleWatchEnded}
                  config={{
                    youtube: {
                      rel: 0,
                      iv_load_policy: 3,
                      disablekb: 1,
                    },
                    vimeo: {
                      controls: false,
                      byline: false,
                      portrait: false,
                      title: false,
                      dnt: true,
                      keyboard: false,
                    },
                  }}
                />
              ) : (
                <div className="flex h-full min-h-[200px] w-full flex-col items-center justify-center gap-3 bg-slate-950 px-6 text-center">
                  <Monitor className="h-12 w-12 text-slate-600" aria-hidden />
                  <p className="text-sm font-bold text-slate-400">
                    Nenhuma URL de vídeo configurada para este webinar.
                  </p>
                </div>
              )}
            </div>

            {showWaitingOverlay && countdown != null && (
              <div
                className="absolute inset-0 z-[40] flex flex-col items-center justify-center gap-3 bg-black/85 px-4 text-center backdrop-blur-md sm:gap-4"
                aria-live="polite"
                aria-label="Contagem regressiva até o início do evento"
              >
                <Timer className="h-10 w-10 text-primary sm:h-12 sm:w-12" aria-hidden />
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/60 sm:text-sm">
                  O evento começa em
                </p>
                <div className="flex items-baseline justify-center gap-1 font-mono text-5xl font-black tabular-nums tracking-tight text-white sm:gap-2 sm:text-7xl md:text-8xl">
                  <span>{pad2(countdown.hours)}</span>
                  <span className="pb-1 text-white/40">:</span>
                  <span>{pad2(countdown.minutes)}</span>
                  <span className="pb-1 text-white/40">:</span>
                  <span>{pad2(countdown.seconds)}</span>
                </div>
                <p className="max-w-md text-sm text-white/55">
                  {config.content.title || initialWebinar.name}
                </p>
              </div>
            )}

            {/* Overlay de Reações */}
            {config.reactions.enabled && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
                {floatingReactions.map(r => {
                  const Icon = REACTION_ICONS.find(i => i.id === r.type)?.Icon || Heart;
                  const color = REACTION_ICONS.find(i => i.id === r.type)?.color || 'text-red-500';
                  return (
                    <div 
                      key={r.id}
                      className={`absolute bottom-0 animate-reaction ${color}`}
                      style={{ left: `${r.left}%` }}
                    >
                      <Icon className="h-10 w-10 fill-current" />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Botão Unmute Inicial */}
            {isMuted && (
              <button 
                onClick={() => setIsMuted(false)}
                className="absolute inset-0 m-auto h-20 w-20 rounded-full bg-primary/90 text-white flex items-center justify-center animate-pulse shadow-2xl backdrop-blur-sm z-30"
              >
                <VolumeX className="h-10 w-10" />
              </button>
            )}
          </div>
        </div>

        {/* Sidebar (Chat & Oferta) — mais estreita para o vídeo caber na mesma viewport */}
        <aside
          className={`flex min-h-0 w-full flex-1 flex-col border-l border-slate-800/40 bg-slate-900/30 backdrop-blur-3xl transition-all duration-500 lg:w-80 lg:flex-none lg:shrink-0 xl:w-[22rem] ${
            focusMode ? "lg:translate-x-full lg:opacity-0" : ""
          }`}
        >
          
          {/* Botão Escassez (acima do chat, controlado pelo admin) */}
          {(config as any).scarcityButton?.enabled && (
            <div className="shrink-0 px-3 pb-0 pt-2">
              <button
                className={`w-full rounded-xl py-2.5 text-xs font-black uppercase tracking-widest shadow-lg transition-all md:text-sm ${
                  (config as any).scarcityButton?.color === "red"
                    ? "bg-red-500 text-white shadow-red-500/30 animate-pulse"
                    : (config as any).scarcityButton?.color === "yellow"
                    ? "bg-amber-500 text-white shadow-amber-500/30"
                    : "bg-emerald-500 text-white shadow-emerald-500/30"
                }`}
              >
                {(config as any).scarcityButton?.label || "Garanta sua vaga!"}
              </button>
            </div>
          )}

          {/* Botão de Oferta (Sempre Visível se Ativo) */}
          {config.offer.active && (
            <div className="border-b border-slate-800/40 bg-primary/5 p-3 animate-in slide-in-from-top duration-500">
              <a 
                href={config.offer.url} 
                target="_blank" 
                className="group relative flex w-full flex-col items-center gap-0.5 overflow-hidden rounded-xl bg-primary p-3 font-black text-white shadow-2xl shadow-primary/30 transition-all hover:brightness-110 active:scale-[0.98] md:rounded-2xl md:p-4 md:text-base"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                <div className="flex items-center gap-2 md:gap-3">
                  <ShoppingCart className="h-5 w-5 shrink-0 md:h-6 md:w-6" />
                  <span className="text-center text-sm md:text-base">{offerComputed.text}</span>
                </div>
                {spots.show && (
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] opacity-80 md:text-[10px] md:tracking-[0.2em]">Restam apenas {spots.count} vagas</span>
                )}
              </a>
              
              {/* Barra de Lote */}
              {spots.show && (
                <div className="mt-2 space-y-1.5 md:mt-3 md:space-y-2">
                  <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-500 md:text-[10px]">
                    <span>Progresso do Lote</span>
                    <span className="text-primary">{Math.round((1 - spots.count / spots.total) * 100)}% Vendido</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full border border-slate-800 bg-slate-950 md:h-2">
                    <div 
                      className="h-full bg-primary transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(124,58,237,0.6)]"
                      style={{ width: `${(1 - spots.count / spots.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Chat Area */}
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between border-b border-slate-800/40 bg-slate-900/40 px-3 py-2.5 md:px-4">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 shrink-0 text-primary md:h-5 md:w-5" />
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 md:text-xs md:tracking-[0.2em]">Chat ao Vivo</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setFocusMode(!focusMode)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-500 hover:text-white">
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {config.chat.enabled ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div
                  ref={chatContainerRef}
                  className="scrollbar-hide min-h-0 flex-1 space-y-3 overflow-y-auto p-3 md:space-y-4 md:p-4"
                  onScroll={(e) => {
                    const target = e.currentTarget;
                    const isAtBottom =
                      target.scrollHeight - target.scrollTop <= target.clientHeight + 100;
                    setUserIsScrolling(!isAtBottom);
                  }}
                >
                  {messages.length === 0 ? (
                    <p className="py-8 text-center text-sm font-medium text-slate-500">
                      Nenhuma mensagem ainda. Seja o primeiro a comentar.
                    </p>
                  ) : (
                    messages.map((m) => {
                      const adminDisplayName = (config as any).adminAvatar?.displayName || "Administrador";
                      const isAdmin = m.author === adminDisplayName || m.author === "Equipe" || m.author === "Administrador";
                      const isOwn = participantName != null && m.author === participantName;
                      const adminLogoUrl = (config as any).adminAvatar?.logoUrl;

                      const cardBase = "group relative rounded-2xl border px-3.5 py-3 animate-in fade-in slide-in-from-bottom-2 duration-300 transition-colors";
                      let cardVariant = "border-slate-800/50 bg-slate-900/40";
                      if ((m as any).type === "urgent") {
                        cardVariant = "border-red-500/30 bg-red-500/10";
                      } else if ((m as any).type === "warning") {
                        cardVariant = "border-amber-500/25 bg-amber-500/10";
                      } else if (m.pinned) {
                        cardVariant = "border-amber-500/25 bg-amber-500/[0.07] ring-1 ring-amber-500/10";
                      } else if (isAdmin) {
                        cardVariant = "border-primary/15 bg-slate-900/35";
                      } else if (isOwn) {
                        cardVariant = "border-primary/20 bg-primary/5";
                      }

                      const count = m.likeCount ?? 0;
                      const iLiked = m.heartLiked ?? false;
                      return (
                        <div key={m.id} className={`${cardBase} ${cardVariant}`}>
                          {/* Reply context */}
                          {(m as any).replyToContent && (
                            <div className="mb-2 px-3 py-1.5 rounded-xl bg-slate-800/60 border-l-2 border-slate-600">
                              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{(m as any).replyToAuthor}</p>
                              <p className="text-[11px] text-slate-400 truncate">{(m as any).replyToContent}</p>
                            </div>
                          )}
                          <div className="flex gap-3">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[10px] font-black overflow-hidden ${
                                isAdmin
                                  ? "border-red-500/30 bg-red-500/10"
                                  : pickAvatarClass(m.author)
                              }`}
                              aria-hidden
                            >
                              {isAdmin && adminLogoUrl
                                ? <img src={adminLogoUrl} alt="" className="w-full h-full object-cover" />
                                : isAdmin ? <Zap className="h-4 w-4 text-red-400" /> : getInitials(m.author)
                              }
                            </div>
                            <div className={`min-w-0 flex-1 ${count > 0 ? "pr-[4.75rem]" : "pr-14"}`}>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`truncate text-[10px] font-black uppercase tracking-widest ${isAdmin ? "text-red-400" : "text-slate-400"}`}>
                                  {m.author}
                                </span>
                                {(m as any).type === "urgent" && <span className="text-[8px] font-black bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full uppercase">Urgente</span>}
                                {(m as any).type === "warning" && <span className="text-[8px] font-black bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full uppercase">Aviso</span>}
                                {m.pinned && <Pin className="h-3 w-3 shrink-0 text-amber-400" aria-hidden />}
                              </div>
                              <p className="mt-1 text-sm font-medium leading-relaxed text-slate-200">
                                {renderChatContentWithMentions(m.content)}
                              </p>
                            </div>
                          </div>
                          <div
                            className={`absolute right-1.5 top-px flex items-center rounded-full border border-slate-800/50 bg-slate-950/70 py-0.5 pl-1 backdrop-blur-sm sm:right-2 ${
                              count > 0 ? "gap-0.5 pr-1.5" : "pr-1"
                            }`}
                            title={count > 0 ? `${count} curtida${count === 1 ? "" : "s"}` : undefined}
                          >
                            <button
                              type="button"
                              onClick={() => void toggleMessageHeart(m.id)}
                              className={`rounded-lg p-1.5 transition-all ${iLiked ? "text-rose-500 opacity-100" : "text-slate-500 opacity-70 hover:text-rose-400 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"}`}
                              aria-label={iLiked ? "Remover curtida" : "Curtir mensagem"}
                            >
                              <Heart className={`h-6 w-6 ${iLiked ? "fill-current" : ""}`} />
                            </button>
                            {count > 0 && (
                              <span
                                className={`min-w-[1.25rem] text-right text-xs font-bold tabular-nums leading-none ${
                                  iLiked ? "text-rose-400" : "text-slate-400"
                                }`}
                              >
                                {count}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="relative z-20 shrink-0 border-t border-slate-800/40 bg-slate-900/50 p-3 pointer-events-auto md:p-4">
                  {mentionOpen && mentionFiltered.length > 0 && (
                    <ul
                      className="absolute bottom-full left-3 right-[3.25rem] z-10 mb-1 max-h-36 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 py-1 shadow-xl scrollbar-hide md:left-4 md:right-[4.25rem]"
                      role="listbox"
                    >
                      {mentionFiltered.map((name, idx) => (
                        <li key={name}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={idx === mentionHighlight}
                            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                              idx === mentionHighlight
                                ? "bg-primary/20 text-white"
                                : "text-slate-300 hover:bg-slate-800/80"
                            }`}
                            onMouseEnter={() => setMentionHighlight(idx)}
                            onClick={() => insertMentionPick(name)}
                          >
                            <span
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[9px] font-black ${pickAvatarClass(name)}`}
                            >
                              {getInitials(name)}
                            </span>
                            <span className="truncate">{name}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex items-end gap-2">
                    <input
                      ref={chatInputRef}
                      type="text"
                      value={chatInput}
                      onChange={(e) => {
                        const v = e.target.value;
                        const pos = e.target.selectionStart ?? v.length;
                        setChatInput(v);
                        const ctx = getMentionQueryAtCursor(v, pos);
                        if (ctx) {
                          setMentionOpen(true);
                          setMentionStart(ctx.start);
                        } else {
                          setMentionOpen(false);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (mentionOpen && mentionFiltered.length > 0) {
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setMentionHighlight((i) =>
                              Math.min(mentionFiltered.length - 1, i + 1),
                            );
                            return;
                          }
                          if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setMentionHighlight((i) => Math.max(0, i - 1));
                            return;
                          }
                          if (e.key === "Enter") {
                            e.preventDefault();
                            insertMentionPick(mentionFiltered[mentionHighlight]!);
                            return;
                          }
                          if (e.key === "Escape") {
                            e.preventDefault();
                            setMentionOpen(false);
                            return;
                          }
                        }
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void sendChatMessage();
                        }
                      }}
                      placeholder={
                        chatLocked
                          ? "Confirme seu nome para usar o chat…"
                          : "Escreva uma mensagem… (@ para mencionar)"
                      }
                      disabled={chatSending || chatLocked}
                      className="min-h-10 flex-1 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 outline-none ring-primary/40 focus:border-primary/50 focus:ring-2 disabled:opacity-50 md:min-h-11 md:rounded-xl md:px-4 md:py-2.5"
                      aria-label="Mensagem do chat"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={() => void sendChatMessage()}
                      disabled={chatSending || chatLocked || !chatInput.trim()}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white shadow-lg shadow-primary/25 transition-all hover:brightness-110 disabled:pointer-events-none disabled:opacity-40 md:h-11 md:w-11 md:rounded-xl"
                      aria-label="Enviar mensagem"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-10 text-center">
                <div className="space-y-4">
                  <div className="h-16 w-16 rounded-3xl bg-slate-900 flex items-center justify-center mx-auto border border-slate-800">
                    <MessageCircle className="h-8 w-8 text-slate-700" />
                  </div>
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Chat desativado</p>
                </div>
              </div>
            )}

            {/* Barra de Reações (Desktop) */}
            {config.reactions.enabled && (
              <div className="flex justify-center gap-3 border-t border-slate-800/40 bg-slate-900/40 px-2 py-2 md:gap-5 md:px-3 md:py-3">
                {REACTION_ICONS.map(({ id, Icon, color }) => (
                  <button 
                    key={id}
                    onClick={() => addReaction(id)}
                    className={`text-xl transition-all hover:scale-125 active:scale-90 md:text-2xl md:hover:scale-150 ${color} hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]`}
                  >
                    <Icon className="h-5 w-5 fill-current md:h-6 md:w-6" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>
        </div>
      </main>

      {/* Prova Social (Toasts) */}
      {config.socialProof.enabled && socialProof && (
        <div className="fixed bottom-10 left-10 z-[100] pointer-events-none">
          <div className="bg-slate-900/95 backdrop-blur-2xl border border-slate-800 p-5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-5 animate-in slide-in-from-left-10 duration-700 max-w-sm ring-1 ring-white/5">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <Bell className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-black text-white tracking-tight">{socialProof.name}</p>
              <p className="text-xs text-slate-400 font-medium">de {socialProof.city} acabou de garantir a vaga!</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
