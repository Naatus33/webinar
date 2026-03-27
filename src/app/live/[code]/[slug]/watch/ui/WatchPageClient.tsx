"use client";

import dynamic from "next/dynamic";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  type CSSProperties,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  MessageCircle, X, Users, AlertTriangle, ChevronUp, Pin, 
  Maximize2, Minimize2, Heart, Zap, Send, Share2,
  Trophy, Rocket, Flame, ThumbsUp, Bell, Monitor, Laptop,
  Volume2, VolumeX, Settings, Layout, ShoppingCart, LogOut,
} from "lucide-react";
import {
  mergeScarcityConfig,
  computeUrgencyDisplayCount,
  resolveScarcityButton,
  type WebinarConfig,
} from "@/lib/webinar-templates";
import { computePublicWatchPhase } from "@/lib/webinar-timing";
import { useWebinarSse } from "@/lib/useWebinarSse";
import { PollDisplay } from "@/components/polls/PollDisplay";

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

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

function scarcityWatchCtaClass(color: "green" | "yellow" | "orange" | "red"): string {
  switch (color) {
    case "red":
      return "bg-red-600 shadow-red-500/40 animate-pulse";
    case "orange":
      return "bg-orange-600 shadow-orange-500/35";
    case "yellow":
      return "bg-amber-500 shadow-amber-500/35";
    default:
      return "bg-emerald-600 shadow-emerald-500/35";
  }
}

function scarcityBarTone(color: "green" | "yellow" | "orange" | "red") {
  switch (color) {
    case "red":
      return {
        border: "border-red-500/25",
        from: "from-red-500/[0.14]",
        to: "to-rose-500/[0.06]",
        accent: "text-red-400",
        number: "text-red-400",
      };
    case "orange":
      return {
        border: "border-orange-500/25",
        from: "from-orange-500/[0.14]",
        to: "to-amber-500/[0.06]",
        accent: "text-orange-400",
        number: "text-orange-400",
      };
    case "yellow":
      return {
        border: "border-amber-500/25",
        from: "from-amber-500/[0.14]",
        to: "to-orange-500/[0.06]",
        accent: "text-amber-400",
        number: "text-amber-400",
      };
    default:
      return {
        border: "border-emerald-500/25",
        from: "from-emerald-500/[0.14]",
        to: "to-teal-500/[0.06]",
        accent: "text-emerald-400",
        number: "text-emerald-400",
      };
  }
}

const REACTION_ICONS = [
  { id: "heart", Icon: Heart, color: "text-primary", key: "1" },
  { id: "flame", Icon: Flame, color: "text-primary/80", key: "2" },
  { id: "rocket", Icon: Rocket, color: "text-muted-foreground", key: "3" },
  { id: "trophy", Icon: Trophy, color: "text-foreground/80", key: "4" },
  { id: "thumbsup", Icon: ThumbsUp, color: "text-primary/70", key: "5" },
];

/** Cor estável por nome (hash → matiz) — cada participante com tom distinto. */
function avatarChromeStyle(authorKey: string): CSSProperties {
  const key = authorKey.trim() || "?";
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const hue = Math.abs(h) % 360;
  return {
    backgroundColor: `hsla(${hue}, 58%, 38%, 0.5)`,
    borderColor: `hsla(${hue}, 52%, 52%, 0.55)`,
    color: `hsl(${hue}, 78%, 90%)`,
  };
}

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
  const router = useRouter();
  const searchParams = useSearchParams();

  const loginPath = `/live/${encodeURIComponent(initialWebinar.code)}/${encodeURIComponent(initialWebinar.slug)}`;
  const loginHref = useMemo(() => {
    const q = searchParams.toString();
    return q ? `${loginPath}?${q}` : loginPath;
  }, [loginPath, searchParams]);

  function handleExitWatch() {
    try {
      sessionStorage.removeItem("lead_id");
      sessionStorage.removeItem("lead_name");
      sessionStorage.removeItem("lead_email");
      sessionStorage.removeItem("watch_heart_key");
      sessionStorage.removeItem(`capture_access_${initialWebinar.id}`);
    } catch {
      /* ignore */
    }
    router.push(loginHref);
  }
  /** Definida no 1º render no cliente (sessionStorage), sem setState — evita fechar/reabrir o EventSource (NS_BINDING_ABORTED). */
  const viewerKeyRef = useRef<string | null>(null);
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
  const { messages, polls, status: sseStatus, config: sseConfig, spots, connected } = useWebinarSse(
    initialWebinar.id,
    true,
    1500,
    viewerKey,
  );
  
  const config = sseConfig || initialWebinar.config;
  const currentStatus = sseStatus || initialWebinar.status;
  const scarcity = resolveScarcityButton(config);
  const mergedScarcity = useMemo(() => mergeScarcityConfig(config.scarcity), [config.scarcity]);

  const [urgencyTick, setUrgencyTick] = useState(0);
  useEffect(() => {
    if (!mergedScarcity.enabled) return;
    const u = mergedScarcity.urgency;
    if (!u.decreaseEnabled || !u.startedAt) return;
    const id = window.setInterval(() => setUrgencyTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [mergedScarcity.enabled, mergedScarcity.urgency.decreaseEnabled, mergedScarcity.urgency.startedAt]);

  const urgencyDisplayCount = useMemo(
    () => computeUrgencyDisplayCount(mergeScarcityConfig(config.scarcity)),
    [config.scarcity, urgencyTick],
  );

  const [phase, setPhase] = useState<"waiting" | "live" | "replay">("live");
  
  const [chatOpen, setChatOpen] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [playerSeconds, setPlayerSeconds] = useState(0);
  const playerWatchRef = useRef<{ seekTo: (amount: number, type?: "seconds") => void } | null>(null);
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
  const [userIsScrolling, setUserIsScrolling] = useState(false);

  /** Estado inicial igual no SSR e no cliente — evita mismatch de hidratação (quebrava o input do chat). */
  const [participantName, setParticipantName] = useState<string | null>(null);
  const [participantEmail, setParticipantEmail] = useState<string | null>(null);
  const [showNameModal, setShowNameModal] = useState(true);
  const [modalNameDraft, setModalNameDraft] = useState("");
  const heartPendingRef = useRef<Set<string>>(new Set());
  /** Reflete curtida/contagem na hora do clique; SSE remove quando bater com o servidor. */
  const [heartOptimistic, setHeartOptimistic] = useState<
    Record<string, { likeCount: number; liked: boolean }>
  >({});
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
    const { phase: p, secondsSinceStart } = computePublicWatchPhase({
      startDate: initialWebinar.startDate,
      startTime: initialWebinar.startTime,
      replayEnabled: initialWebinar.replayEnabled,
      status: currentStatus,
    });
    setPhase(p);

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

  const waitingPath = `/live/${encodeURIComponent(initialWebinar.code)}/${encodeURIComponent(initialWebinar.slug)}/waiting`;
  useEffect(() => {
    if (phase !== "waiting") return;
    if (!participantName) return;
    const q = searchParams.toString();
    router.replace(q ? `${waitingPath}?${q}` : waitingPath);
  }, [phase, participantName, router, searchParams, waitingPath]);

  // Guard de acesso: a sala watch só abre para quem passou pela captura (nome + e-mail).
  useLayoutEffect(() => {
    try {
      const storedName = sessionStorage.getItem("lead_name")?.trim();
      const storedEmail = sessionStorage.getItem("lead_email")?.trim();
      if (storedName && storedEmail) {
        setParticipantName(storedName);
        setParticipantEmail(storedEmail);
        setShowNameModal(false);
      } else {
        const search = typeof window !== "undefined" ? window.location.search : "";
        router.replace(`/live/${initialWebinar.code}/${initialWebinar.slug}${search}`);
      }
    } catch {
      const search = typeof window !== "undefined" ? window.location.search : "";
      router.replace(`/live/${initialWebinar.code}/${initialWebinar.slug}${search}`);
    }
  }, [router, searchParams, initialWebinar.code, initialWebinar.slug]);

  // Heartbeat a cada 30s para rastrear presença
  useEffect(() => {
    if (!participantName) return;
    const sendHeartbeat = () => {
      const email = participantEmail ?? (typeof window !== "undefined" ? (sessionStorage.getItem("lead_email") ?? undefined) : undefined);
      fetch(`/api/webinars/${initialWebinar.id}/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: participantName, email, viewerKey: viewerKey ?? undefined }),
        keepalive: true,
      }).catch(() => {});
    };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 30_000);
    return () => clearInterval(interval);
  }, [participantName, participantEmail, initialWebinar.id, viewerKey]);

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

  const [scarcityTick, setScarcityTick] = useState(0);
  useEffect(() => {
    if (!scarcity.enabled || !scarcity.currentPhaseStartedAt) return;
    if (!scarcity.showTimer && !scarcity.autoTimer) return;
    const id = window.setInterval(() => setScarcityTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [scarcity.enabled, scarcity.showTimer, scarcity.autoTimer, scarcity.currentPhaseStartedAt]);

  /** Evita POST duplicado na mesma fase; SSE/HMR podem atrasar o snapshot. */
  const scarcityAdvanceSentRef = useRef<string>("");
  useEffect(() => {
    if (!scarcity.enabled || !scarcity.autoTimer || !scarcity.currentPhaseStartedAt) return;
    const started = Date.parse(scarcity.currentPhaseStartedAt);
    if (!Number.isFinite(started)) return;
    const total = scarcity.phaseSeconds[scarcity.color];
    const elapsed = Math.floor((Date.now() - started) / 1000);
    const remaining = Math.max(0, total - elapsed);
    const phaseKey = `${scarcity.color}|${scarcity.currentPhaseStartedAt}`;
    if (remaining > 0) return;
    if (scarcityAdvanceSentRef.current === phaseKey) return;
    scarcityAdvanceSentRef.current = phaseKey;
    void fetch(`/api/webinars/${initialWebinar.id}/scarcity-advance`, { method: "POST" }).catch(() => {});
  }, [
    scarcity.enabled,
    scarcity.autoTimer,
    scarcity.color,
    scarcity.currentPhaseStartedAt,
    scarcity.phaseSeconds,
    scarcityTick,
    initialWebinar.id,
  ]);

  const offerUrlTrimmed = (config.offer.url ?? "").trim();

  const scarcityCountdownStr = useMemo(() => {
    if (!scarcity.showTimer || !scarcity.currentPhaseStartedAt) return null;
    const started = Date.parse(scarcity.currentPhaseStartedAt);
    if (!Number.isFinite(started)) return null;
    const total = scarcity.phaseSeconds[scarcity.color];
    const elapsed = Math.floor((Date.now() - started) / 1000);
    const rem = Math.max(0, total - elapsed);
    const m = Math.floor(rem / 60);
    const s = rem % 60;
    if (m > 0) return `${m}:${String(s).padStart(2, "0")}`;
    return `${s}s`;
  }, [scarcity.showTimer, scarcity.currentPhaseStartedAt, scarcity.color, scarcity.phaseSeconds, scarcityTick]);

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
      const data: unknown = await res.json();
      if (
        typeof data === "object" &&
        data !== null &&
        "likeCount" in data &&
        "liked" in data &&
        typeof (data as { likeCount: unknown }).likeCount === "number" &&
        typeof (data as { liked: unknown }).liked === "boolean"
      ) {
        const likeCount = (data as { likeCount: number }).likeCount;
        const liked = (data as { liked: boolean }).liked;
        setHeartOptimistic((prev) => ({ ...prev, [msgId]: { likeCount, liked } }));
      }
    } finally {
      heartPendingRef.current.delete(msgId);
    }
  }

  useEffect(() => {
    setHeartOptimistic((prev) => {
      const ids = Object.keys(prev);
      if (ids.length === 0) return prev;
      const next = { ...prev };
      let changed = false;
      for (const id of ids) {
        const msg = messages.find((x) => x.id === id);
        if (!msg) continue;
        const o = next[id]!;
        const serverCount = msg.likeCount ?? 0;
        const serverLiked = msg.heartLiked ?? false;
        if (serverCount === o.likeCount && serverLiked === o.liked) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [messages]);

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
  const ambilightColor = config.offer.active
    ? "rgba(139, 0, 0, 0.07)"
    : "rgba(0, 0, 0, 0.04)";

  const playerPlaying = phase !== "waiting";
  /** react-player v3+ usa `src`; `url` é ignorado e caía no player HTML5 sem fonte. */
  const watchSrc = initialWebinar.videoUrl?.trim() ?? "";

  const chatLocked = !participantName || showNameModal;

  return (
    <div
      className={`min-h-[100svh] flex flex-col overflow-x-hidden bg-background text-foreground transition-all duration-1000 lg:h-[100dvh] lg:max-h-[100dvh] lg:overflow-hidden ${focusMode ? "bg-black text-white" : ""}`}
    >
      {showNameModal && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="watch-name-modal-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h2 id="watch-name-modal-title" className="text-lg font-black text-foreground">
              Como quer aparecer no chat?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
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
              className="mt-4 h-12 w-full rounded-xl border border-input bg-background px-4 text-sm text-foreground outline-none ring-primary/30 focus:border-primary/50 focus:ring-2"
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
        <header className="z-50 flex h-14 shrink-0 items-center justify-between border-b border-border/60 bg-card/80 px-4 backdrop-blur-2xl md:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
            {config.branding.logo ? (
              <img src={config.branding.logo} alt="Logo" className="h-8 w-auto shrink-0 object-contain transition-transform hover:scale-105 md:h-9" />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/20 border border-primary/30 shadow-lg shadow-primary/10 md:h-9 md:w-9">
                <Zap className="h-4 w-4 text-primary md:h-[18px] md:w-[18px]" />
              </div>
            )}
            <div className="min-w-0 flex flex-col gap-0.5">
              <h1 className="truncate text-xs font-black tracking-tight text-foreground md:text-sm">
                {config.content.title || initialWebinar.name}
              </h1>
              <div className="flex items-center gap-1.5">
                <span className="flex h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold tabular-nums text-emerald-500 md:text-[11px]">
                  {participants || 0} assistindo agora
                </span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center">
            <button
              type="button"
              onClick={handleExitWatch}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/10 px-2.5 text-[11px] font-semibold text-destructive transition-colors hover:bg-destructive/20 md:px-3 md:text-xs"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0 md:h-4 md:w-4" aria-hidden />
              Sair
            </button>
          </div>
        </header>
      )}

      {/* Main: min-h-0 permite o flex encolher; bloco centralizado em telas largas */}
      <main
        className={`relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row lg:justify-center ${
          mergedScarcity.enabled
            ? "pb-[calc(env(safe-area-inset-bottom)+4.75rem)] md:pb-[calc(env(safe-area-inset-bottom)+3.75rem)]"
            : ""
        }`}
      >
        <div className="flex min-h-0 w-full max-w-[1600px] flex-1 flex-col overflow-hidden lg:flex-row lg:mx-auto">
        
        {/* Video Area — limita 16:9 para caber na altura útil (header já descontado) */}
        <div
          className={`relative flex min-h-0 flex-none items-center justify-center bg-black transition-all duration-500 lg:min-w-0 lg:flex-1 ${
            focusMode ? "lg:p-0" : "p-2 lg:p-3"
          }`}
        >
          <div
            className={`relative mx-auto aspect-video w-full overflow-hidden shadow-2xl shadow-black/80 group player-container max-h-[min(70svh,calc(100svh-12rem))] max-w-[min(100%,calc(70svh*16/9))] lg:max-h-[min(50dvh,calc(100dvh-10rem))] lg:max-w-[min(100%,calc(50dvh*16/9))] ${
              focusMode
                ? "lg:max-h-[calc(100dvh-1rem)] lg:max-w-[min(100%,calc((100dvh-1rem)*16/9))]"
                : "lg:max-h-[calc(100dvh-3.5rem)] lg:max-w-[min(100%,calc((100dvh-3.5rem)*16/9))]"
            }`}
          >
            
            {/* Player Wrapper */}
            <div className="w-full h-full player-wrapper">
              {watchSrc ? (
                <ReactPlayer
                  // @ts-expect-error instância expõe seekTo; pacote tipa ref como HTMLVideoElement
                  ref={playerWatchRef}
                  key={watchSrc}
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
                <div className="flex h-full min-h-[200px] w-full flex-col items-center justify-center gap-3 bg-muted/30 px-6 text-center">
                  <Monitor className="h-12 w-12 text-muted-foreground" aria-hidden />
                  <p className="text-sm font-bold text-muted-foreground">
                    Nenhuma URL de vídeo configurada para este webinar.
                  </p>
                </div>
              )}
            </div>

            {/* Overlay de Reações */}
            {config.reactions.enabled && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
                {floatingReactions.map(r => {
                  const Icon = REACTION_ICONS.find(i => i.id === r.type)?.Icon || Heart;
                  const color = REACTION_ICONS.find((i) => i.id === r.type)?.color || "text-primary";
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
          className={`flex min-h-0 w-full flex-1 flex-col overflow-hidden border-t border-border/60 bg-card/40 backdrop-blur-3xl transition-all duration-500 lg:w-80 lg:flex-none lg:shrink-0 lg:border-t-0 lg:border-l xl:w-[22rem] ${
            focusMode ? "lg:translate-x-full lg:opacity-0" : ""
          }`}
        >
          {/* CTA: mesmo botão configurado em LiveOps «Link e cores» quando Oferta está ligada (texto + semáforo + offer.url) */}
          {(scarcity.enabled || config.offer.active) && (
            <div className="animate-in slide-in-from-top border-b border-border/60 bg-primary/5 p-3 duration-500">
              <a
                href={offerUrlTrimmed || "#"}
                target={offerUrlTrimmed ? "_blank" : undefined}
                rel={offerUrlTrimmed ? "noopener noreferrer" : undefined}
                onClick={(e) => {
                  if (!offerUrlTrimmed) e.preventDefault();
                }}
                className={`group relative flex w-full flex-col items-center gap-0.5 overflow-hidden rounded-xl p-3 font-black text-white shadow-2xl transition-all hover:brightness-110 active:scale-[0.98] md:rounded-2xl md:p-4 md:text-base ${scarcityWatchCtaClass(scarcity.color)}`}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                <div className="flex items-center gap-2 md:gap-3">
                  <ShoppingCart className="h-5 w-5 shrink-0 md:h-6 md:w-6" />
                  <span className="text-center text-sm md:text-base">{scarcity.label}</span>
                </div>
                {scarcity.enabled && scarcity.showTimer && scarcityCountdownStr != null && (
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] opacity-90 md:text-[10px] font-mono tabular-nums">
                    {scarcityCountdownStr}
                  </span>
                )}
                {config.offer.active && spots.show && (
                  <span className="text-[9px] font-bold uppercase tracking-[0.15em] opacity-80 md:text-[10px] md:tracking-[0.2em]">
                    Restam apenas {spots.count} vagas
                  </span>
                )}
              </a>

              {config.offer.active && spots.show && (
                <div className="mt-2 space-y-1.5 md:mt-3 md:space-y-2">
                  <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground md:text-[10px]">
                    <span>Progresso do Lote</span>
                    <span className="text-primary">{Math.round((1 - spots.count / spots.total) * 100)}% Vendido</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full border border-border bg-muted md:h-2">
                    <div
                      className="h-full bg-primary shadow-[0_0_12px_rgba(var(--primary-rgb),0.45)] transition-all duration-1000 ease-out"
                      style={{ width: `${(1 - spots.count / spots.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Chat Area */}
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-3 py-2 md:px-4">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 shrink-0 text-primary md:h-5 md:w-5" />
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground md:text-xs md:tracking-[0.2em]">
                  Chat ao Vivo
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setFocusMode(!focusMode)}
                  className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {config.chat.enabled ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div
                  ref={chatContainerRef}
                  className="scrollbar-hide min-h-0 flex-1 space-y-2 overflow-y-auto p-2 md:space-y-2.5 md:p-3"
                  onScroll={(e) => {
                    const target = e.currentTarget;
                    const isAtBottom =
                      target.scrollHeight - target.scrollTop <= target.clientHeight + 100;
                    setUserIsScrolling(!isAtBottom);
                  }}
                >
                  {messages.length === 0 ? (
                    <p className="py-8 text-center text-sm font-medium text-muted-foreground">
                      Nenhuma mensagem ainda. Seja o primeiro a comentar.
                    </p>
                  ) : (
                    messages.map((m) => {
                      const adminDisplayName = config.adminAvatar?.displayName || "Administrador";
                      const isAdmin = m.author === adminDisplayName || m.author === "Equipe" || m.author === "Administrador";
                      const isOwn = participantName != null && m.author === participantName;
                      const adminLogoUrl = config.adminAvatar?.logoUrl;

                      const cardBase = "group relative rounded-xl border px-2.5 py-2 animate-in fade-in slide-in-from-bottom-2 duration-300 transition-colors";
                      let cardVariant = "border-border/60 bg-card/50";
                      if (m.type === "urgent") {
                        cardVariant = "border-red-500/30 bg-red-500/10";
                      } else if (m.type === "warning") {
                        cardVariant = "border-amber-500/25 bg-amber-500/10";
                      } else if (m.pinned) {
                        cardVariant = "border-amber-500/25 bg-amber-500/[0.07] ring-1 ring-amber-500/10";
                      } else if (isAdmin) {
                        cardVariant = "border-primary/20 bg-muted/40";
                      } else if (isOwn) {
                        cardVariant = "border-primary/20 bg-primary/5";
                      }

                      const heartO = heartOptimistic[m.id];
                      const count = heartO?.likeCount ?? m.likeCount ?? 0;
                      const iLiked = heartO?.liked ?? m.heartLiked ?? false;
                      return (
                        <div key={m.id} className={`${cardBase} ${cardVariant}`}>
                          {/* Reply context */}
                          {m.replyToContent && (
                            <div className="mb-1.5 rounded-lg border-l-2 border-muted-foreground/40 bg-muted/50 px-2 py-1">
                              <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                                {m.replyToAuthor}
                              </p>
                              <p className="truncate text-[10px] text-muted-foreground">{m.replyToContent}</p>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[9px] font-black overflow-hidden ${
                                isAdmin ? "border-red-500/30 bg-red-500/10 text-red-200" : ""
                              }`}
                              style={!isAdmin ? avatarChromeStyle(m.author) : undefined}
                              aria-hidden
                            >
                              {isAdmin && adminLogoUrl
                                ? <img src={adminLogoUrl} alt="" className="w-full h-full object-cover" />
                                : isAdmin ? <Zap className="h-3.5 w-3.5 text-red-400" /> : getInitials(m.author)
                              }
                            </div>
                            <div className={`min-w-0 flex-1 ${count > 0 ? "pr-[3.75rem]" : "pr-11"}`}>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={`truncate text-[9px] font-black uppercase tracking-widest ${isAdmin ? "text-red-500" : "text-muted-foreground"}`}
                                >
                                  {m.author}
                                </span>
                                {m.type === "urgent" && <span className="text-[7px] font-black bg-red-500/20 text-red-400 px-1 py-0.5 rounded-full uppercase">Urgente</span>}
                                {m.type === "warning" && <span className="text-[7px] font-black bg-amber-500/20 text-amber-400 px-1 py-0.5 rounded-full uppercase">Aviso</span>}
                                {m.pinned && <Pin className="h-2.5 w-2.5 shrink-0 text-amber-400" aria-hidden />}
                              </div>
                              <p className="mt-0.5 text-xs font-medium leading-snug text-foreground">
                                {renderChatContentWithMentions(m.content)}
                              </p>
                            </div>
                          </div>
                          <div
                            className={`absolute right-1 top-px flex items-center rounded-full border border-border/60 bg-background/80 py-0.5 pl-0.5 backdrop-blur-sm sm:right-1.5 ${
                              count > 0 ? "gap-0 pr-1" : "pr-0.5"
                            }`}
                            title={count > 0 ? `${count} curtida${count === 1 ? "" : "s"}` : undefined}
                          >
                            <button
                              type="button"
                              onClick={() => void toggleMessageHeart(m.id)}
                              className={`rounded-md p-1 transition-all ${iLiked ? "text-red-500 opacity-100" : "text-red-500/90 opacity-90 hover:text-red-500 hover:opacity-100"}`}
                              aria-label={iLiked ? "Remover curtida" : "Curtir mensagem"}
                            >
                              <Heart
                                className={`h-4 w-4 shrink-0 text-red-500 stroke-red-500 ${iLiked ? "fill-red-500" : "fill-none"}`}
                                fill={iLiked ? "currentColor" : "none"}
                                strokeWidth={iLiked ? 2 : 2.25}
                              />
                            </button>
                            {count > 0 && (
                              <span
                                className={`min-w-[1.1rem] text-right text-[10px] font-bold tabular-nums leading-none ${
                                  iLiked ? "text-red-500" : "text-muted-foreground"
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

                <div className="pointer-events-auto relative z-20 shrink-0 border-t border-border/60 bg-muted/25 p-2.5 md:p-4">
                  {mentionOpen && mentionFiltered.length > 0 && (
                    <ul
                      className="scrollbar-hide absolute bottom-full left-3 right-[3.25rem] z-10 mb-1 max-h-36 overflow-y-auto rounded-xl border border-border bg-card py-1 shadow-xl md:left-4 md:right-[4.25rem]"
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
                                ? "bg-primary/15 text-foreground"
                                : "text-foreground/90 hover:bg-muted"
                            }`}
                            onMouseEnter={() => setMentionHighlight(idx)}
                            onClick={() => insertMentionPick(name)}
                          >
                            <span
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[9px] font-black"
                              style={avatarChromeStyle(name)}
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
                      className="min-h-10 flex-1 rounded-lg border border-input bg-background/90 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none ring-primary/40 focus:border-primary/50 focus:ring-2 disabled:opacity-50 md:min-h-11 md:rounded-xl md:px-4 md:py-2.5"
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
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-border bg-muted/50">
                    <MessageCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Chat desativado</p>
                </div>
              </div>
            )}

            {/* Barra de Reações (Desktop) */}
            {config.reactions.enabled && (
              <div className="flex justify-center gap-3 border-t border-border/60 bg-muted/20 px-2 py-2 md:gap-5 md:px-3 md:py-3">
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

      {/* Barra fixa inferior — apenas urgência (config.scarcity) */}
      {mergedScarcity.enabled && (() => {
        const tone = scarcityBarTone(scarcity.color);
        const isCritical = scarcity.color === "red" || scarcity.color === "orange" || urgencyDisplayCount <= 3;
        return (
          <div
            className={`fixed bottom-0 left-0 right-0 z-[70] animate-in slide-in-from-bottom border-t ${tone.border} bg-card/55 backdrop-blur-3xl shadow-[0_-18px_32px_rgba(0,0,0,0.32)] ring-1 ring-border/40 duration-500 ${
              isCritical ? "animate-pulse" : ""
            }`}
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.25rem)" }}
            role="status"
            aria-live="polite"
          >
            <div className={`bg-gradient-to-r ${tone.from} ${tone.to}`}>
              <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 px-3 py-2 md:px-4 md:py-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      <span
                        className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                          isCritical ? "bg-red-500 animate-ping" : "bg-amber-400 animate-ping"
                        }`}
                      />
                      <span
                        className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                          isCritical ? "bg-red-500" : "bg-amber-400"
                        }`}
                      />
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] ${
                        isCritical
                          ? "border-red-500/30 bg-red-500/15 text-red-300"
                          : "border-amber-500/25 bg-amber-500/10 text-amber-300"
                      }`}
                    >
                      <AlertTriangle className="h-3 w-3" aria-hidden />
                      URGENTE
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-bold leading-tight text-foreground md:text-xs">
                      {mergedScarcity.message}
                    </p>
                    <p
                      className={`mt-0.5 text-sm font-black tabular-nums md:mt-0 md:text-base ${tone.number} ${
                        scarcity.color === "red" ? "animate-pulse" : ""
                      }`}
                    >
                      {urgencyDisplayCount}{" "}
                      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground md:text-[11px]">
                        vagas disponíveis
                      </span>
                    </p>
                    <p
                      className={`hidden md:block text-[10px] font-extrabold uppercase tracking-[0.16em] ${
                        isCritical ? "text-red-200/90" : "text-foreground/70"
                      }`}
                    >
                      Você pode perder sua vaga a qualquer momento
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Prova Social (Toasts) */}
      {config.socialProof.enabled && socialProof && (
        <div
          className={`fixed left-4 right-4 z-[100] pointer-events-none md:left-10 md:right-auto ${
            mergedScarcity.enabled ? "bottom-32" : "bottom-10"
          }`}
        >
          <div className="flex w-full max-w-none animate-in items-center gap-5 rounded-3xl border border-border bg-card/95 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)] ring-1 ring-border/40 backdrop-blur-2xl duration-700 slide-in-from-bottom-2 md:max-w-sm md:slide-in-from-left-10">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-black tracking-tight text-foreground">{socialProof.name}</p>
              <p className="text-xs font-medium text-muted-foreground">
                de {socialProof.city} acabou de garantir a vaga!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
