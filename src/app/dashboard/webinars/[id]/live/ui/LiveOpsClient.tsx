"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import type { ElementType, KeyboardEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  MessageCircle, BarChart2, PlayCircle, SkipForward, Trash2, Pin,
  AlertTriangle, Zap, Tag, Gift, Sparkles, Heart,
  Bell, Settings, Activity, Clock, Wifi, WifiOff, CheckCircle2,
  Copy, Search, Link as LinkIcon, Flag, Reply, Send, Mail, ChevronDown, ChevronUp, ArrowLeft, ArrowRight,
} from "lucide-react";

import {
  getDefaultConfig,
  mergeScarcityConfig,
  computeUrgencyDisplayCount,
  resolveScarcityButton,
  type WebinarConfig,
} from "@/lib/webinar-templates";
import { PollAdmin } from "@/components/polls/PollAdmin";
import { computePublicWatchPhase } from "@/lib/webinar-timing";
import { useWebinarSse, type OnlineLead } from "@/lib/useWebinarSse";
import { FakeChatPanel } from "./FakeChatPanel";

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

type WebinarStatus = "DRAFT" | "SCHEDULED" | "LIVE" | "REPLAY" | "FINISHED";
type AdminTab = "conversao" | "macros" | "enquetes" | "compartilhar";
type ConversaoSubTab = "urgencia_sala" | "cta";

const LIVEOPS_TAB_DEFS: { id: AdminTab; label: string; icon: ElementType }[] = [
  { id: "conversao", label: "Conversão", icon: Zap },
  { id: "macros", label: "Macros", icon: MessagesSquare },
  { id: "enquetes", label: "Enquetes", icon: BarChart2 },
  { id: "compartilhar", label: "Link", icon: LinkIcon },
];

const LIVEOPS_TAB_PANEL_ID = "liveops-right-panel";

type MsgType = "normal" | "urgent" | "warning";

type ScarcityButtonColor = "green" | "yellow" | "orange" | "red";

type MacroAction = "none" | "offer_on" | "scarcity_on";
type MacroTiming = { hours: number; minutes: number; seconds: number; totalSeconds: number };
type Macro = { id: string; label: string; text: string; fakeName?: string; action: MacroAction; pin: boolean; timing?: MacroTiming };

function isMacro(value: unknown): value is Macro {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<Macro>;
  return (
    typeof v.id === "string" &&
    typeof v.label === "string" &&
    typeof v.text === "string" &&
    typeof v.action === "string" &&
    typeof v.pin === "boolean"
  );
}

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
  initialMacros?: unknown[];
}

function pad2(n: number) { return String(n).padStart(2, "0"); }
function formatSeconds(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0 ? `${pad2(h)}:${pad2(m)}:${pad2(sec)}` : `${pad2(m)}:${pad2(sec)}`;
}

function leadInitials(name: string) {
  const t = name.trim();
  if (!t) return "?";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase().slice(0, 2);
  return t.slice(0, 2).toUpperCase();
}

/** Atividade recente quando o lead está online (heartbeat nos últimos 90s). */
function formatLeadActivityHint(lastSeenAt: string | null): string {
  if (!lastSeenAt) return "ativo";
  const sec = Math.round((Date.now() - new Date(lastSeenAt).getTime()) / 1000);
  if (!Number.isFinite(sec) || sec < 0) return "ativo";
  if (sec < 10) return "agora";
  if (sec < 90) return `há ${sec}s`;
  return "ativo";
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
  config: initialConfig,
  initialMacros = [],
}: LiveOpsClientProps) {
  const [status, setStatus] = useState<WebinarStatus>(initialStatus);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ next: WebinarStatus } | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("conversao");
  const [conversaoSubTab, setConversaoSubTab] = useState<ConversaoSubTab>("cta");
  const liveOpsTabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const onLiveOpsTabKeyDown = useCallback((e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const n = LIVEOPS_TAB_DEFS.length;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = (index + 1) % n;
      setActiveTab(LIVEOPS_TAB_DEFS[next].id);
      queueMicrotask(() => liveOpsTabRefs.current[next]?.focus());
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const prev = (index - 1 + n) % n;
      setActiveTab(LIVEOPS_TAB_DEFS[prev].id);
      queueMicrotask(() => liveOpsTabRefs.current[prev]?.focus());
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveTab(LIVEOPS_TAB_DEFS[0].id);
      queueMicrotask(() => liveOpsTabRefs.current[0]?.focus());
    } else if (e.key === "End") {
      e.preventDefault();
      const last = n - 1;
      setActiveTab(LIVEOPS_TAB_DEFS[last].id);
      queueMicrotask(() => liveOpsTabRefs.current[last]?.focus());
    }
  }, []);

  const { messages, polls, status: sseStatus, config: sseConfig, viewerCount, liveConnections, onlineLeads, connected } =
    useWebinarSse(webinarId, true, 2000);

  const config = (sseConfig || initialConfig) as WebinarConfig;
  /** Configs antigas podem omitir `layout` ou `ambilight`; evita erro no toggle e PATCH incompleto. */
  const mergedLayout = useMemo(
    () => ({ ...getDefaultConfig().layout, ...(config.layout ?? {}) }),
    [config],
  );
  const currentStatus = (sseStatus as WebinarStatus) || status;
  const [macros, setMacros] = useState<Macro[]>(
    Array.isArray(initialMacros) ? initialMacros.filter(isMacro) as Macro[] : []
  );

  // Timer AO VIVO
  const [secondsSinceStart, setSecondsSinceStart] = useState(0);
  const [phase, setPhase] = useState<"waiting" | "live" | "replay">("live");
  /** No painel, o admin pode pausar/despausar; não forçar play a cada render. */
  const [panelPlaying, setPanelPlaying] = useState(true);
  const playerRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const tick = () => {
      const result = computePublicWatchPhase({ startDate, startTime, replayEnabled, status: currentStatus });
      setPhase(result.phase);
      setSecondsSinceStart(result.secondsSinceStart ?? 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startDate, startTime, replayEnabled, currentStatus]);

  // Loop sincronizado: seek só após metadados (duração conhecida)
  const secondsSinceStartRef = useRef(0);
  const videoDurationRef = useRef(0);
  const seekDoneRef = useRef(false); // garante seek inicial único
  useEffect(() => { secondsSinceStartRef.current = secondsSinceStart; }, [secondsSinceStart]);

  function seekToSyncPosition() {
    const dur = videoDurationRef.current;
    const el = playerRef.current;
    if (!el || dur <= 0) return;
    const target = secondsSinceStartRef.current % dur;
    try { el.currentTime = target; } catch { /* noop */ }
  }

  function handlePlayerDuration(d: number) {
    videoDurationRef.current = d;
    // Seek inicial sincronizado com a sala (só uma vez)
    if (!seekDoneRef.current) {
      seekDoneRef.current = true;
      seekToSyncPosition();
    }
  }

  // Countdown de 5 min para REPLAY automático após fim do vídeo
  const [replayTimer, setReplayTimer] = useState<number | null>(null);
  const currentStatusRef = useRef(currentStatus);
  useEffect(() => { currentStatusRef.current = currentStatus; }, [currentStatus]);

  useEffect(() => {
    if (replayTimer === null) return;
    if (replayTimer <= 0) {
      setReplayTimer(null);
      changeStatus("REPLAY", true);
      return;
    }
    const id = setTimeout(() => setReplayTimer(t => t !== null ? t - 1 : null), 1000);
    return () => clearTimeout(id);
  }, [replayTimer]);

  function handlePlayerEnded() {
    // Loop: aguarda 300ms e volta ao ponto sincronizado
    setTimeout(seekToSyncPosition, 300);
    // Inicia contagem de 5 min para REPLAY automático (só na primeira vez)
    if (currentStatusRef.current === "LIVE" && replayTimer === null) {
      setReplayTimer(5 * 60);
    }
  }

  // Chat
  const [chatInput, setChatInput] = useState("");
  const [msgType, setMsgType] = useState<MsgType>("normal");
  const [replyingTo, setReplyingTo] = useState<{ id: string; author: string; content: string } | null>(null);
  const [sendingChat, setSendingChat] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [loadingAiSuggestions, setLoadingAiSuggestions] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Scroll automático no chat — rola apenas o container, não a página
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Leads ONLINE search
  const [leadSearch, setLeadSearch] = useState("");
  const [shareSearch, setShareSearch] = useState("");
  const [shareResults, setShareResults] = useState<{ id: string; name: string; email: string }[]>([]);
  const [selectedShareLead, setSelectedShareLead] = useState<{ name: string; email: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedRoomLink, setCopiedRoomLink] = useState(false);
  const [publicOrigin, setPublicOrigin] = useState("");

  const [offerUrlDraft, setOfferUrlDraft] = useState(initialConfig.offer.url ?? "");
  const [offerUrlSaving, setOfferUrlSaving] = useState(false);
  const [offerUrlSavedFlash, setOfferUrlSavedFlash] = useState(false);

  const adminAvatarFileRef = useRef<HTMLInputElement>(null);
  const [adminAvatarUploading, setAdminAvatarUploading] = useState(false);

  useEffect(() => {
    setOfferUrlDraft(config.offer.url ?? "");
  }, [config.offer.url]);

  // Botão de urgência (CTA) — semáforo automático é aplicado no servidor (stream SSE); painel só configura.
  const scarcityBtn = resolveScarcityButton(config);
  const scarcityColorOrder: ScarcityButtonColor[] = ["green", "yellow", "orange", "red"];
  const scarcityColorMap = {
    green: { bg: "bg-emerald-500", border: "border-emerald-500", text: "text-emerald-400", label: "Verde" },
    yellow: { bg: "bg-amber-500", border: "border-amber-500", text: "text-amber-400", label: "Amarelo" },
    orange: { bg: "bg-orange-500", border: "border-orange-500", text: "text-orange-400", label: "Laranja" },
    red: { bg: "bg-red-500", border: "border-red-500", text: "text-red-400", label: "Vermelho" },
  };

  // Simulated participants input
  const [simMin, setSimMin] = useState(String(config.participants?.min ?? 100));
  const [simMax, setSimMax] = useState(String(config.participants?.max ?? 500));

  async function changeStatus(next: WebinarStatus, force = false) {
    if (!force && (next === "FINISHED" || next === "REPLAY") && currentStatus === "LIVE") {
      setConfirmAction({ next });
      return;
    }
    setUpdatingStatus(true);
    setConfirmAction(null);
    try {
      const res = await fetch(`/api/webinars/${webinarId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (res.ok) {
        const data = await res.json() as { status: WebinarStatus };
        setStatus(data.status);
      }
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function updateConfig(patch: Partial<WebinarConfig> | Record<string, unknown>) {
    const newConfig = {
      ...(config as unknown as Record<string, unknown>),
      ...(patch as Record<string, unknown>),
    } as WebinarConfig;
    await fetch(`/api/webinars/${webinarId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: newConfig }),
    });
  }

  async function handleAdminAvatarUpload(file: File) {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    const max = 5 * 1024 * 1024;
    if (!allowed.includes(file.type)) {
      window.alert("Use JPEG, PNG ou WebP.");
      return;
    }
    if (file.size > max) {
      window.alert("Arquivo muito grande. Máximo 5MB.");
      return;
    }
    setAdminAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("webinarId", webinarId);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok) {
        window.alert(data.error ?? "Falha ao enviar a imagem.");
        return;
      }
      if (!data.url) return;
      await updateConfig({
        adminAvatar: {
          ...config.adminAvatar,
          logoUrl: data.url,
          displayName: config.adminAvatar?.displayName ?? "Administrador",
        },
      });
    } finally {
      setAdminAvatarUploading(false);
    }
  }

  async function confirmOfferUrl() {
    const url = offerUrlDraft.trim();
    setOfferUrlSaving(true);
    try {
      await updateConfig({ offer: { ...config.offer, url } });
      setOfferUrlSavedFlash(true);
      window.setTimeout(() => setOfferUrlSavedFlash(false), 2200);
    } finally {
      setOfferUrlSaving(false);
    }
  }

  function buildScarcityButtonMerged(overrides: Partial<WebinarConfig["scarcityButton"]>): WebinarConfig["scarcityButton"] {
    const def = getDefaultConfig().scarcityButton;
    const raw = config.scarcityButton;
    return {
      ...def,
      ...raw,
      ...overrides,
      phaseSeconds: {
        ...def.phaseSeconds,
        ...raw.phaseSeconds,
        ...overrides.phaseSeconds,
      },
    };
  }

  function patchScarcityButton(overrides: Partial<WebinarConfig["scarcityButton"]>) {
    return updateConfig({ scarcityButton: buildScarcityButtonMerged(overrides) });
  }

  /** Oferta na grelha = offer.active + scarcityButton.enabled (CTA com texto/link/semáforo do painel). */
  async function setOfferActiveLinked(active: boolean) {
    await updateConfig({
      offer: { ...config.offer, active },
      scarcityButton: buildScarcityButtonMerged({
        enabled: active,
        currentPhaseStartedAt: active ? new Date().toISOString() : null,
      }),
    });
  }

  async function toggleOfferActiveLinked() {
    await setOfferActiveLinked(!config.offer.active);
  }

  type ScarcityPatch = Omit<Partial<WebinarConfig["scarcity"]>, "urgency" | "timer"> & {
    urgency?: Partial<WebinarConfig["scarcity"]["urgency"]>;
    timer?: Partial<WebinarConfig["scarcity"]["timer"]>;
  };

  /** Preserva `urgency` e campos aninhados ao atualizar escassez/urgência na sala. */
  function patchScarcity(partial: ScarcityPatch) {
    const cur = mergeScarcityConfig(config.scarcity);
    const merged = {
      ...cur,
      ...partial,
      timer: partial.timer ? { ...cur.timer, ...partial.timer } : cur.timer,
      urgency: partial.urgency ? { ...cur.urgency, ...partial.urgency } : cur.urgency,
    };
    return updateConfig({ scarcity: mergeScarcityConfig(merged) });
  }

  const mergedScarcity = useMemo(() => mergeScarcityConfig(config.scarcity), [config.scarcity]);

  const [urgencyPreviewTick, setUrgencyPreviewTick] = useState(0);
  useEffect(() => {
    if (activeTab !== "conversao") return;
    const id = window.setInterval(() => setUrgencyPreviewTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [activeTab]);

  const urgencyPreviewCount = useMemo(
    () => computeUrgencyDisplayCount(mergeScarcityConfig(config.scarcity)),
    [config.scarcity, urgencyPreviewTick],
  );

  const adminName = config.adminAvatar?.displayName || "Administrador";

  // Buscar sugestões de resposta com IA
  async function fetchAiSuggestions() {
    if (!chatInput.trim()) return;
    setLoadingAiSuggestions(true);
    try {
      const res = await fetch(`/api/webinars/${webinarId}/chat/suggest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: chatInput.slice(0, 500),
          recentMessages: messages.slice(-5).map(m => `${m.author}: ${m.content}`).join("\n"),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiSuggestions(data.suggestions || []);
      }
    } catch (err) {
      console.error("Erro ao buscar sugestões de IA:", err);
    } finally {
      setLoadingAiSuggestions(false);
    }
  }

  async function sendChatMessage() {
    if (!chatInput.trim() || sendingChat) return;
    const content = chatInput.trim();
    setChatInput("");
    setAiSuggestions([]);
    setSendingChat(true);
    try {
      const body: Record<string, unknown> = {
        author: adminName,
        content,
        type: msgType,
        timestamp: config.chat.mode === "replay" ? Math.floor(secondsSinceStart) : undefined,
      };
      if (replyingTo) {
        body.replyToContent = replyingTo.content.slice(0, 200);
        body.replyToAuthor = replyingTo.author;
      }
      const res = await fetch(`/api/webinars/${webinarId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) setChatInput(content);
      else setReplyingTo(null);
    } catch {
      setChatInput(content);
    } finally {
      setSendingChat(false);
    }
  }

  async function deleteMessage(msgId: string) {
    await fetch(`/api/webinars/${webinarId}/chat/${msgId}`, { method: "DELETE" });
  }

  async function pinMessage(msgId: string) {
    await fetch(`/api/webinars/${webinarId}/chat/${msgId}`, { method: "PATCH" });
  }

  const parseMessage = useCallback((text: string) =>
    text.replace(/{{webinar_name}}/g, webinarName).replace(/{{status}}/g, currentStatus),
    [webinarName, currentStatus]);

  async function sendMacro(macro: Macro) {
    const content = parseMessage(macro.text);
    const author = macro.fakeName?.trim() || adminName;
    const res = await fetch(`/api/webinars/${webinarId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        author,
        content,
        type: "normal",
        timestamp: config.chat.mode === "replay" ? Math.floor(secondsSinceStart) : undefined,
      }),
    });
    if (res.ok && macro.pin) {
      const data = await res.json();
      if (data.id) await fetch(`/api/webinars/${webinarId}/chat/${data.id}`, { method: "PATCH" });
    }
    if (macro.action === "offer_on") await setOfferActiveLinked(true);
    if (macro.action === "scarcity_on") await patchScarcity({ enabled: true });
  }

  // Atalhos Ctrl+1..9 gerenciados pelo FakeChatPanel

  useEffect(() => {
    setPublicOrigin(typeof window !== "undefined" ? window.location.origin : "");
  }, []);

  // Busca de leads para compartilhar
  useEffect(() => {
    if (shareSearch.length < 2) { setShareResults([]); return; }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/webinars/${webinarId}/leads?q=${encodeURIComponent(shareSearch)}`);
      if (res.ok) setShareResults(await res.json());
    }, 300);
    return () => clearTimeout(t);
  }, [shareSearch, webinarId]);

  const roomLoginUrl = useMemo(() => {
    const path = `/live/${encodeURIComponent(webinarCode)}/${encodeURIComponent(webinarSlug)}`;
    return publicOrigin ? `${publicOrigin}${path}` : path;
  }, [publicOrigin, webinarCode, webinarSlug]);

  const shareLink = selectedShareLead
    ? `${publicOrigin || (typeof window !== "undefined" ? window.location.origin : "")}/live/${webinarCode}/${webinarSlug}?name=${encodeURIComponent(selectedShareLead.name)}&email=${encodeURIComponent(selectedShareLead.email)}`
    : "";

  async function copyLink() {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function copyRoomLoginLink() {
    await navigator.clipboard.writeText(roomLoginUrl);
    setCopiedRoomLink(true);
    setTimeout(() => setCopiedRoomLink(false), 2000);
  }

  const hotLeads = useMemo(() => onlineLeads.filter((l) => l.online), [onlineLeads]);

  const filteredLeads = useMemo(() => {
    if (!leadSearch.trim()) return onlineLeads;
    const q = leadSearch.toLowerCase().trim();
    return onlineLeads.filter(
      (l) => l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q),
    );
  }, [onlineLeads, leadSearch]);

  /** Online primeiro, depois por última atividade. */
  const sortedLeads = useMemo(() => {
    const list = [...filteredLeads];
    list.sort((a, b) => {
      if (a.online !== b.online) return a.online ? -1 : 1;
      const ta = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
      const tb = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;
      return tb - ta;
    });
    return list;
  }, [filteredLeads]);

  const onlineCount = onlineLeads.filter((l) => l.online).length;

  const adminAvatarUrl = config.adminAvatar?.logoUrl;

  return (
    <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden font-sans">
      <style dangerouslySetInnerHTML={{ __html: `.scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}.leads-scroll{scrollbar-width:thin;scrollbar-color:rgb(115 115 115) transparent}.leads-scroll::-webkit-scrollbar{width:6px}.leads-scroll::-webkit-scrollbar-thumb{background:rgb(115 115 115);border-radius:6px}.leads-scroll::-webkit-scrollbar-track{background:transparent}` }} />

      {/* ═══════════════════════════════════════════════════
          HEADER — h-12, toda info crítica em uma linha
      ═══════════════════════════════════════════════════ */}
      <header className="h-12 border-b border-border/60 bg-card/90 backdrop-blur-2xl flex items-center justify-between px-4 shrink-0 z-50 gap-3">
        {/* Esquerda: voltar + conexão + nome */}
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href="/dashboard"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground"
            aria-label="Voltar ao dashboard"
            title="Voltar ao dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className={`h-2 w-2 rounded-full shrink-0 ${connected ? "bg-emerald-500 animate-pulse" : "bg-red-500 animate-pulse"}`} />
          <span className="text-xs font-black text-foreground truncate hidden sm:block">{webinarName}</span>
        </div>

        {/* Centro: timer + countdown REPLAY */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border ${currentStatus === "LIVE" ? "bg-red-500/10 border-red-500/30" : "bg-muted/40 border-border"}`}>
            <Clock className={`h-3 w-3 ${currentStatus === "LIVE" ? "text-red-400" : "text-muted-foreground"}`} />
            <span className={`text-xs font-black tabular-nums ${currentStatus === "LIVE" ? "text-red-400" : "text-muted-foreground"}`}>{formatSeconds(secondsSinceStart)}</span>
            {currentStatus === "LIVE" && <span className="text-[9px] font-black text-red-500 uppercase">● AO VIVO</span>}
          </div>
          {replayTimer !== null && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl border bg-amber-500/10 border-amber-500/30 animate-pulse">
              <SkipForward className="h-3 w-3 text-amber-400" />
              <span className="text-xs font-black tabular-nums text-amber-400">REPLAY em {formatSeconds(replayTimer)}</span>
              <button onClick={() => setReplayTimer(null)} className="text-amber-600 hover:text-amber-400 text-[9px] font-black ml-1">✕</button>
            </div>
          )}
        </div>

        {/* Direita: status + link */}
        <div className="flex items-center gap-1.5 shrink-0">
          {(["LIVE", "REPLAY", "FINISHED"] as WebinarStatus[]).map(s => (
            <button key={s} onClick={() => changeStatus(s)} disabled={updatingStatus || currentStatus === s}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${
                currentStatus === s
                  ? s === "LIVE" ? "bg-red-500 border-red-500 text-foreground" : "bg-primary border-primary text-foreground"
                  : "bg-muted/40 border-border text-muted-foreground hover:border-border hover:text-foreground"}`}>
              {s === "LIVE" && currentStatus === "LIVE" ? "● LIVE" : s}
            </button>
          ))}
          <a href={`/live/${webinarCode}/${webinarSlug}/watch`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 bg-muted hover:bg-muted/80 text-foreground px-2.5 py-1 rounded-lg text-[9px] font-black transition-all border border-border">
            <PlayCircle className="h-3 w-3" /> SALA
          </a>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════
          BODY — 3 colunas, flex-1, overflow-hidden
      ═══════════════════════════════════════════════════ */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── COLUNA ESQUERDA (w-64): Métricas + Leads + Vagas ── */}
        <aside className="w-64 shrink-0 border-r border-border/60 bg-card/30 flex flex-col overflow-hidden">

          {/* 3 métricas em linhas compactas */}
          <div className="px-3 pt-3 space-y-1.5 shrink-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-1">Audiência</p>
            {[
              {
                icon: Users,
                color: "text-emerald-400",
                bg: "bg-emerald-500/10",
                label: "Na sala agora",
                value: viewerCount,
                sub: "ping 90s",
                title: "Leads com heartbeat nos últimos 90s (sala de watch com nome preenchido).",
              },
              {
                icon: Activity,
                color: "text-amber-400",
                bg: "bg-amber-500/10",
                label: "Streams abertos",
                value: liveConnections,
                sub: "SSE",
                title: "Conexões EventSource ativas (painel, salas, abas). Não é contagem de pessoas.",
              },
            ].map(m => (
              <div
                key={m.label}
                title={m.title}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-background border border-border/60"
              >
                <div className={`h-7 w-7 rounded-lg ${m.bg} flex items-center justify-center shrink-0`}>
                  <m.icon className={`h-3.5 w-3.5 ${m.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-widest leading-none truncate">{m.label}</p>
                  <p className="text-base font-black text-foreground tabular-nums leading-tight">{m.value}</p>
                </div>
                <span className="text-[8px] text-muted-foreground/80 shrink-0">{m.sub}</span>
              </div>
            ))}
            {/* Exibindo simulado */}
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-background border border-border/60">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Monitor className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] text-muted-foreground uppercase tracking-widest leading-none">Exibindo</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <input type="number" value={simMin} onChange={e => setSimMin(e.target.value)}
                    className="w-10 bg-muted/40 border border-border rounded text-[9px] text-foreground px-1 py-0.5 outline-none text-center" />
                  <span className="text-[8px] text-muted-foreground">–</span>
                  <input type="number" value={simMax} onChange={e => setSimMax(e.target.value)}
                    className="w-10 bg-muted/40 border border-border rounded text-[9px] text-foreground px-1 py-0.5 outline-none text-center" />
                  <button onClick={() => updateConfig({ participants: { ...config.participants, min: Number(simMin), max: Number(simMax) } })}
                    className="text-[8px] font-black bg-primary/20 text-primary px-1 py-0.5 rounded hover:bg-primary/30">OK</button>
                </div>
              </div>
            </div>
          </div>

          {/* Divisor */}
          <div className="mx-3 my-2 border-t border-border/60 shrink-0" />

          {/* Leads ONLINE — flex-1, scrollável */}
          <div className="flex flex-col min-h-0 flex-1 px-3 overflow-hidden">
            <div className="flex items-center justify-between mb-1.5 shrink-0 gap-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Leads na Sala</p>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[9px] font-bold text-muted-foreground tabular-nums">{onlineLeads.length}</span>
                <span className="text-[9px] text-muted-foreground/80">·</span>
                <span className="text-[9px] font-black text-emerald-400 tabular-nums">{onlineCount} online</span>
              </div>
            </div>
            <div className="relative mb-1.5 shrink-0">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-muted-foreground pointer-events-none" />
              <input type="search" value={leadSearch} onChange={e => setLeadSearch(e.target.value)}
                autoComplete="off"
                placeholder="Nome ou e-mail..."
                className="w-full bg-background border border-border rounded-lg pl-6 pr-2 py-1.5 text-[10px] text-foreground/90 outline-none focus:border-primary/50 placeholder:text-muted-foreground/80" />
            </div>
            <div
              role="list"
              className="leads-scroll flex-1 overflow-y-auto min-h-[6rem] space-y-1.5 pr-0.5"
            >
              {!connected && onlineLeads.length === 0 && (
                <p className="text-[10px] text-amber-500/90 text-center py-3 px-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  Conectando ao stream… a lista atualiza em instantes.
                </p>
              )}
              {connected && onlineLeads.length === 0 && (
                <p className="text-[10px] text-muted-foreground text-center py-6 px-2 leading-relaxed">
                  Nenhum lead registado neste webinar ainda.
                </p>
              )}
              {onlineLeads.length > 0 && sortedLeads.length === 0 && (
                <p className="text-[10px] text-muted-foreground text-center py-6 px-2">
                  Nenhum resultado para &quot;{leadSearch.trim()}&quot;.
                </p>
              )}
              {sortedLeads.map((lead, i) => {
                const isHotLead = hotLeads.some((h) => h.email === lead.email);
                const rowKey = `${lead.email}:${i}`;
                return (
                  <div
                    key={rowKey}
                    role="listitem"
                    className={`flex items-stretch gap-2 rounded-xl border px-2 py-2 transition-colors ${
                      lead.online
                        ? "border-emerald-500/25 bg-emerald-500/[0.06]"
                        : "border-border/80 bg-background/50 hover:bg-muted/25"
                    } ${isHotLead ? "ring-1 ring-emerald-500/20" : ""}`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-black ${
                        lead.online ? "bg-emerald-500/20 text-emerald-300" : "bg-muted text-muted-foreground"
                      }`}
                      aria-hidden
                    >
                      {leadInitials(lead.name)}
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5">
                      <div className="flex items-center gap-1 min-w-0">
                        <p className="text-[11px] font-bold text-foreground truncate leading-tight" title={lead.name}>
                          {lead.name}
                        </p>
                        {isHotLead && <Sparkles className="h-3 w-3 text-emerald-400 shrink-0" aria-hidden />}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate leading-tight" title={lead.email}>
                        {lead.email}
                      </p>
                    </div>
                    <div className="flex flex-col items-end justify-center shrink-0 gap-0.5 text-right">
                      <span
                        className={`text-[9px] font-black tracking-wide px-1.5 py-0.5 rounded-md ${
                          lead.online
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-muted/90 text-muted-foreground"
                        }`}
                      >
                        {lead.online ? "Online" : "Offline"}
                      </span>
                      {lead.online && (
                        <span
                          className="text-[9px] font-semibold tabular-nums text-emerald-500/90"
                          title={lead.lastSeenAt ?? undefined}
                        >
                          {formatLeadActivityHint(lead.lastSeenAt)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </aside>

        {/* ── COLUNA CENTRAL (flex-1): Player + Chat Master ── */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 border-r border-border/60">

          {/* Player — aspect-video com max ~40% da altura */}
          <div className="relative bg-black shrink-0 overflow-hidden" style={{ height: "38%" }}>
            {videoUrl ? (
              <ReactPlayer ref={playerRef} src={videoUrl}
                playing={panelPlaying}
                muted
                controls
                width="100%" height="100%"
                onPlay={() => setPanelPlaying(true)}
                onPause={() => setPanelPlaying(false)}
                onLoadedMetadata={(e) => {
                  const d = e.currentTarget.duration;
                  if (Number.isFinite(d) && d > 0) handlePlayerDuration(d);
                }}
                onEnded={handlePlayerEnded}
                config={{ youtube: { rel: 0 } }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-muted-foreground text-xs">Sem vídeo configurado</p>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-3 py-2 pointer-events-none">
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-foreground">Minuto {formatSeconds(secondsSinceStart)} · Todos sincronizados</span>
              </div>
            </div>
          </div>

          {/* Chat Master — flex-1, ocupa o resto */}
          <div className="flex-1 flex flex-col min-h-0 bg-muted/20">

            {/* Header chat */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-t border-border/60 bg-muted/40/60 shrink-0">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Chat Master</span>
                <span className="text-[9px] text-muted-foreground tabular-nums">{messages.length}</span>
              </div>
              <div className="flex items-center gap-1">
                  {([
                  { key: "active", label: "Ativo", check: !!(config.chat.enabled && !config.chat.adminOnly) },
                  { key: "adminOnly", label: "Adm", check: !!(config.chat.enabled && !!config.chat.adminOnly) },
                  { key: "off", label: "Off", check: !config.chat.enabled },
                ] as const).map(m => (
                  <button key={m.key} onClick={() => {
                    if (m.key === "active") updateConfig({ chat: { ...config.chat, enabled: true, adminOnly: false } });
                    if (m.key === "adminOnly") updateConfig({ chat: { ...config.chat, enabled: true, adminOnly: true } });
                    if (m.key === "off") updateConfig({ chat: { ...config.chat, enabled: false } });
                  }} className={`px-2 py-0.5 rounded text-[9px] font-black transition-all ${m.check ? "bg-primary text-foreground" : "bg-muted text-muted-foreground hover:text-foreground/90"}`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mensagens */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto scrollbar-hide px-2 py-2 space-y-1 min-h-0">
              {messages.map(m => {
                const isAdmin = m.author === adminName || m.author === "Administrador" || m.author === "Equipe";
                const typeStyle = m.type === "urgent" ? "bg-red-500/10 border-red-500/20"
                  : m.type === "warning" ? "bg-amber-500/10 border-amber-500/20"
                  : m.pinned ? "bg-primary/10 border-primary/20" : "bg-background/40 border-transparent";
                return (
                  <div key={m.id} className={`group relative rounded-xl border p-2 transition-all hover:border-border ${typeStyle}`}>
                    {m.replyToContent && (
                      <div className="mb-1 px-2 py-0.5 rounded-lg bg-muted/50 border-l-2 border-muted-foreground/40">
                        <p className="text-[8px] font-bold text-muted-foreground">{m.replyToAuthor}</p>
                        <p className="text-[9px] text-muted-foreground truncate">{m.replyToContent}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {isAdmin && adminAvatarUrl && <Image src={adminAvatarUrl} alt="" className="h-3 w-3 rounded-full object-cover shrink-0" width={12} height={12} />}
                      <span className={`text-[9px] font-black uppercase tracking-widest truncate ${isAdmin ? "text-red-400" : "text-muted-foreground"}`}>{m.author}</span>
                      {m.type === "urgent" && <span className="text-[7px] font-black bg-red-500/20 text-red-400 px-1 rounded">URG</span>}
                      {m.type === "warning" && <span className="text-[7px] font-black bg-amber-500/20 text-amber-400 px-1 rounded">AVS</span>}
                      {m.pinned && <Pin className="h-2 w-2 text-primary shrink-0" />}
                    </div>
                    <p className="text-[11px] text-foreground/90 leading-relaxed break-words">{m.content}</p>
                    <div className="absolute top-1.5 right-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setReplyingTo({ id: m.id, author: m.author, content: m.content })} className="text-muted-foreground hover:text-primary p-0.5 rounded"><Reply className="h-3 w-3" /></button>
                      {!m.pinned && <button onClick={() => pinMessage(m.id)} className="text-muted-foreground hover:text-amber-400 p-0.5 rounded"><Pin className="h-3 w-3" /></button>}
                      <button onClick={() => deleteMessage(m.id)} className="text-muted-foreground hover:text-red-400 p-0.5 rounded"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply card */}
            {replyingTo && (
              <div className="px-2 py-1.5 border-t border-border/60 bg-muted/40/60 flex items-center gap-2 shrink-0">
                <div className="flex-1 px-2 py-1 rounded-lg bg-muted/50 border-l-2 border-primary min-w-0">
                  <p className="text-[9px] font-bold text-primary">↩ {replyingTo.author}</p>
                  <p className="text-[9px] text-muted-foreground truncate">{replyingTo.content}</p>
                </div>
                <button onClick={() => setReplyingTo(null)} className="text-muted-foreground hover:text-red-400 shrink-0 p-1"><Trash2 className="h-3 w-3" /></button>
              </div>
            )}

            {/* Tipo + input */}
            <div className="px-2 py-2 border-t border-border/60 bg-muted/40/80 shrink-0 space-y-1.5">
              <div className="flex gap-1">
                {([
                  { type: "normal" as MsgType, label: "Normal", cls: "bg-muted text-foreground border-muted-foreground/40" },
                  { type: "urgent" as MsgType, label: "Urgente", cls: "bg-red-500/20 text-red-400 border-red-500/30" },
                  { type: "warning" as MsgType, label: "Aviso", cls: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
                ]).map(t => (
                  <button key={t.type} onClick={() => setMsgType(t.type)}
                    className={`flex-1 py-1 rounded-lg text-[9px] font-black border transition-all ${msgType === t.type ? t.cls : "bg-muted/40 text-muted-foreground border-transparent hover:text-muted-foreground"}`}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                  onFocus={fetchAiSuggestions}
                  placeholder={`Enviar como ${adminName}...`}
                  className="flex-1 bg-muted/40 border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground" />
                <button onClick={sendChatMessage} disabled={!chatInput.trim() || sendingChat}
                  className="h-9 w-9 rounded-xl bg-primary hover:brightness-110 disabled:opacity-40 flex items-center justify-center transition-all shrink-0">
                  <Send className="h-3.5 w-3.5 text-foreground" />
                </button>
              </div>
              {aiSuggestions.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Sugestões de IA</p>
                  {aiSuggestions.map((suggestion, idx) => (
                    <button key={idx} onClick={() => { setChatInput(suggestion); setAiSuggestions([]); }}
                      className="w-full text-left text-[10px] p-2 rounded-lg bg-muted/50 hover:bg-muted text-foreground/90 hover:text-foreground transition-all border border-border/50 truncate">
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── COLUNA DIREITA (w-96): Abas de Controle ── */}
        <div className="w-96 shrink-0 flex flex-col min-h-0 overflow-hidden">

          {/* Tab bar */}
          <div className="flex border-b border-border/60 bg-muted/40/50 shrink-0" role="tablist" aria-label="Painel de controles ao vivo">
            {LIVEOPS_TAB_DEFS.map((tab, i) => {
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  ref={(el) => { liveOpsTabRefs.current[i] = el; }}
                  role="tab"
                  id={`liveops-tab-${tab.id}`}
                  aria-selected={selected}
                  aria-controls={LIVEOPS_TAB_PANEL_ID}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={(e) => onLiveOpsTabKeyDown(e, i)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[9px] font-black uppercase tracking-widest transition-all border-b-2 outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset ${
                    selected ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20"}`}
                >
                  <tab.icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="inline-flex items-center justify-center gap-1 leading-tight text-center">
                    {tab.label}
                    {tab.id === "macros" && macros.length > 0 && (
                      <span
                        className="tabular-nums text-[8px] font-black min-w-[1.1rem] px-1 py-px rounded-md bg-muted text-muted-foreground"
                        aria-label={`${macros.length} macros configuradas`}
                      >
                        {macros.length}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Tab content — flex-1 com scroll */}
          <div
            id={LIVEOPS_TAB_PANEL_ID}
            role="tabpanel"
            aria-labelledby={`liveops-tab-${activeTab}`}
            className="flex-1 overflow-y-auto scrollbar-hide min-h-0 p-4 space-y-4"
          >

            {/* ── CONVERSÃO ── */}
            {activeTab === "conversao" && <>
              {/* Toggles grid 2×3 */}
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">Controles da Sala</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    {
                      label: "Oferta",
                      icon: Tag,
                      color: "text-emerald-400",
                      active: config.offer.active,
                      title:
                        "Liga ou desliga o botão de oferta na sala. Texto, URL e semáforo: sub-aba «Oferta».",
                      toggle: () => void toggleOfferActiveLinked(),
                    },
                    { label: "Pop-up", icon: Gift, color: "text-amber-400", active: config.offerPopup.enabled, toggle: () => updateConfig({ offerPopup: { ...config.offerPopup, enabled: !config.offerPopup.enabled } }) },
                    {
                      label: "Urgência",
                      icon: Zap,
                      color: "text-red-400",
                      active: mergedScarcity.enabled,
                      title: "Contagem de vagas + banner de urgência na sala. Ative também com a macro «+ Urgência + vagas» na aba Macros.",
                      toggle: () => void patchScarcity({ enabled: !mergedScarcity.enabled }),
                    },
                    { label: "Reações", icon: Heart, color: "text-pink-400", active: config.reactions.enabled, toggle: () => updateConfig({ reactions: { ...config.reactions, enabled: !config.reactions.enabled } }) },
                    { label: "Ambilight", icon: Sparkles, color: "text-purple-400", active: !!mergedLayout.ambilight, toggle: () => updateConfig({ layout: { ...mergedLayout, ambilight: !mergedLayout.ambilight } }) },
                  ].map((item) => (
                    <button type="button" key={item.label} title={item.title} onClick={item.toggle}
                      className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left ${item.active ? "bg-muted/40 border-border" : "bg-muted/20 border-border/40 opacity-50"}`}>
                      <item.icon className={`h-3.5 w-3.5 shrink-0 ${item.active ? item.color : "text-muted-foreground"}`} />
                      <span className={`text-[10px] font-black uppercase truncate ${item.active ? "text-foreground" : "text-muted-foreground"}`}>{item.label}</span>
                      <div className={`ml-auto h-1.5 w-1.5 rounded-full shrink-0 ${item.active ? "bg-emerald-500" : "bg-muted-foreground/50"}`} />
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed mt-3 px-0.5">
                  O interruptor <span className="font-black text-foreground">Oferta</span> na grelha só liga ou desliga o botão na sala.
                  {" "}
                  Na aba <span className="font-black text-foreground">Oferta</span> ao lado ajustas texto, URL e semáforo — é o mesmo botão.
                </p>
              </div>

              <div
                className="flex rounded-xl border border-border/60 bg-muted/30 p-0.5 gap-0.5"
                role="tablist"
                aria-label="Detalhes de conversão"
              >
                <button
                  type="button"
                  role="tab"
                  id="liveops-conversao-sub-link"
                  aria-selected={conversaoSubTab === "cta"}
                  aria-controls="liveops-conversao-subpanel"
                  tabIndex={conversaoSubTab === "cta" ? 0 : -1}
                  onClick={() => setConversaoSubTab("cta")}
                  title="Texto do botão, link de checkout e cores do semáforo (use o interruptor Oferta na grelha para ligar na sala)"
                  className={`flex-1 rounded-lg py-2 text-[9px] font-black uppercase tracking-widest transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                    conversaoSubTab === "cta"
                      ? "bg-background text-foreground shadow-sm border border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Oferta
                </button>
                <button
                  type="button"
                  role="tab"
                  id="liveops-conversao-sub-urgencia"
                  aria-selected={conversaoSubTab === "urgencia_sala"}
                  aria-controls="liveops-conversao-subpanel"
                  tabIndex={conversaoSubTab === "urgencia_sala" ? 0 : -1}
                  onClick={() => setConversaoSubTab("urgencia_sala")}
                  className={`flex-1 rounded-lg py-2 text-[9px] font-black uppercase tracking-widest transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                    conversaoSubTab === "urgencia_sala"
                      ? "bg-background text-foreground shadow-sm border border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Urgência
                </button>
              </div>

              <div
                id="liveops-conversao-subpanel"
                role="tabpanel"
                aria-labelledby={conversaoSubTab === "urgencia_sala" ? "liveops-conversao-sub-urgencia" : "liveops-conversao-sub-link"}
                className="min-h-0"
              >
              {/* Urgência — texto + vagas com timing decrescente (sala pública) */}
              {conversaoSubTab === "urgencia_sala" && (
              <div className="rounded-2xl border border-border bg-muted/25 p-3 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Urgência na sala</p>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                      Mensagem e número de vagas visíveis para todos. Com «diminuir no tempo», o valor cai de forma linear até o mínimo.
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Sala vê</p>
                    <p className="text-lg font-black tabular-nums text-primary leading-tight">{urgencyPreviewCount}</p>
                    <p className="text-[8px] text-muted-foreground">vagas</p>
                  </div>
                </div>
                <input
                  type="text"
                  key={`urg-msg-${mergedScarcity.message}`}
                  defaultValue={mergedScarcity.message}
                  onBlur={(e) => patchScarcity({ message: e.target.value })}
                  placeholder="Ex.: Últimas vagas para entrar hoje!"
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50"
                />
                <div className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/50 px-2.5 py-2">
                  <span className="text-[9px] font-bold text-muted-foreground">Diminuir vagas no tempo</span>
                  <button
                    type="button"
                    onClick={() => patchScarcity({ urgency: { decreaseEnabled: !mergedScarcity.urgency.decreaseEnabled } })}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-black border transition-all ${
                      mergedScarcity.urgency.decreaseEnabled
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-muted border-border text-muted-foreground"
                    }`}
                  >
                    {mergedScarcity.urgency.decreaseEnabled ? "Sim" : "Não (fixo)"}
                  </button>
                </div>
                {!mergedScarcity.urgency.decreaseEnabled && (
                  <div>
                    <p className="text-[8px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Vagas exibidas (fixo)</p>
                    <input
                      type="number"
                      min={0}
                      key={`urg-count-${mergedScarcity.count}`}
                      defaultValue={mergedScarcity.count}
                      onBlur={(e) => patchScarcity({ count: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 tabular-nums"
                    />
                  </div>
                )}
                {mergedScarcity.urgency.decreaseEnabled && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[8px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Início</p>
                      <input
                        type="number"
                        min={1}
                        key={`urg-s-${mergedScarcity.urgency.startCount}`}
                        defaultValue={mergedScarcity.urgency.startCount}
                        onBlur={(e) =>
                          patchScarcity({ urgency: { startCount: Math.max(1, Math.floor(Number(e.target.value) || 1)) } })
                        }
                        className="w-full bg-background border border-border rounded-xl px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary/50 tabular-nums"
                      />
                    </div>
                    <div>
                      <p className="text-[8px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Mínimo</p>
                      <input
                        type="number"
                        min={0}
                        key={`urg-e-${mergedScarcity.urgency.endCount}`}
                        defaultValue={mergedScarcity.urgency.endCount}
                        onBlur={(e) =>
                          patchScarcity({
                            urgency: {
                              endCount: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                            },
                          })
                        }
                        className="w-full bg-background border border-border rounded-xl px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary/50 tabular-nums"
                      />
                    </div>
                    <div className="col-span-2">
                      <p className="text-[8px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                        Duração para ir do início ao mínimo (minutos)
                      </p>
                      <input
                        type="number"
                        min={1}
                        key={`urg-d-${mergedScarcity.urgency.durationSeconds}`}
                        defaultValue={Math.max(1, Math.round(mergedScarcity.urgency.durationSeconds / 60))}
                        onBlur={(e) =>
                          patchScarcity({
                            urgency: {
                              durationSeconds: Math.max(60, (Math.floor(Number(e.target.value)) || 1) * 60),
                            },
                          })
                        }
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 tabular-nums"
                      />
                    </div>
                  </div>
                )}
                {mergedScarcity.urgency.decreaseEnabled && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        patchScarcity({ urgency: { startedAt: new Date().toISOString() } })
                      }
                      className="flex-1 min-w-[8rem] flex items-center justify-center gap-1.5 rounded-xl bg-primary/15 border border-primary/30 text-primary py-2 text-[9px] font-black uppercase tracking-wide hover:bg-primary/25 transition-all"
                    >
                      <RefreshCcw className="h-3 w-3 shrink-0" />
                      Iniciar / reiniciar
                    </button>
                    <button
                      type="button"
                      onClick={() => patchScarcity({ urgency: { startedAt: null } })}
                      className="flex-1 min-w-[8rem] rounded-xl bg-muted border border-border py-2 text-[9px] font-black uppercase tracking-wide text-muted-foreground hover:text-foreground transition-all"
                    >
                      Pausar contagem
                    </button>
                  </div>
                )}
              </div>
              )}

              {/* Botão CTA de urgência — semáforo + segundos por cor (sincronizado na sala pública) */}
              {conversaoSubTab === "cta" && (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    Mesmo botão · grelha liga/desliga
                  </p>
                  <span
                    className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                      config.offer.active
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                        : "border-border bg-muted text-muted-foreground"
                    }`}
                  >
                    {config.offer.active ? "Visível na sala" : "Oculto na sala"}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mb-2 leading-relaxed">
                  Liga <span className="font-bold text-foreground">Oferta</span> acima para mostrar o botão; aqui editas o que ele diz, para onde aponta e as cores do semáforo.
                </p>
                <div className="space-y-2 p-3 rounded-2xl bg-muted/25 border border-border">
                  <input
                    type="text"
                    key={`sb-label-${scarcityBtn.label}`}
                    defaultValue={scarcityBtn.label}
                    onBlur={(e) => patchScarcityButton({ label: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50"
                    placeholder="Texto do botão (ex.: Esgotando agora!)"
                  />
                  <div className="space-y-1">
                    <p className="text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Link de redirecionamento
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="url"
                        autoComplete="url"
                        value={offerUrlDraft}
                        onChange={(e) => setOfferUrlDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void confirmOfferUrl();
                          }
                        }}
                        className="min-w-0 flex-1 bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50"
                        placeholder="https://checkout… ou link do WhatsApp"
                      />
                      <button
                        type="button"
                        onClick={() => void confirmOfferUrl()}
                        disabled={offerUrlSaving}
                        title="Salvar link"
                        aria-label="Confirmar e salvar link"
                        className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-xl transition-all border ${
                          offerUrlSavedFlash
                            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                            : "border-border bg-primary/15 text-primary-foreground hover:bg-primary/25 disabled:opacity-50"
                        }`}
                      >
                        {offerUrlSaving ? (
                          <span className="text-xs font-bold text-muted-foreground" aria-hidden>
                            …
                          </span>
                        ) : offerUrlSavedFlash ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
                        ) : (
                          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {scarcityColorOrder.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() =>
                          patchScarcityButton({
                            color,
                            currentPhaseStartedAt: new Date().toISOString(),
                          })
                        }
                        className={`py-2 rounded-xl text-[8px] font-black border-2 transition-all leading-tight ${
                          scarcityBtn.color === color
                            ? `${scarcityColorMap[color].bg} border-transparent text-foreground`
                            : `bg-muted/40 ${scarcityColorMap[color].border} ${scarcityColorMap[color].text} opacity-60 hover:opacity-100`
                        }`}
                      >
                        {scarcityColorMap[color].label}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      title={
                        scarcityBtn.autoTimer
                          ? "Mudar para cor manual (sem troca automática)"
                          : "Liga oferta na sala e inicia o semáforo automático (verde → vermelho)"
                      }
                      onClick={() => {
                        const nextAuto = !scarcityBtn.autoTimer;
                        if (nextAuto) {
                          const now = new Date().toISOString();
                          void updateConfig({
                            offer: { ...config.offer, active: true },
                            scarcityButton: buildScarcityButtonMerged({
                              enabled: true,
                              autoTimer: true,
                              currentPhaseStartedAt: now,
                            }),
                          });
                        } else {
                          void patchScarcityButton({
                            autoTimer: false,
                            currentPhaseStartedAt: new Date().toISOString(),
                          });
                        }
                      }}
                      className={`flex-1 min-w-[6rem] py-1.5 rounded-xl text-[9px] font-black border transition-all ${scarcityBtn.autoTimer ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted border-border text-muted-foreground"}`}
                    >
                      {scarcityBtn.autoTimer ? "Semáforo auto" : "Cor manual"}
                    </button>
                    <button
                      type="button"
                      onClick={() => patchScarcityButton({ showTimer: !scarcityBtn.showTimer })}
                      className={`flex-1 min-w-[6rem] py-1.5 rounded-xl text-[9px] font-black border transition-all ${scarcityBtn.showTimer ? "bg-sky-500/10 border-sky-500/30 text-sky-400" : "bg-muted border-border text-muted-foreground"}`}
                    >
                      {scarcityBtn.showTimer ? "Timer público" : "Sem timer"}
                    </button>
                  </div>
                  <p className="text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">Segundos por cor (ciclo automático)</p>
                  <div className="grid grid-cols-2 gap-2">
                    {scarcityColorOrder.map((c) => (
                      <label key={c} className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/50 px-2 py-1.5">
                        <span className={`text-[8px] font-black uppercase ${scarcityColorMap[c].text}`}>{scarcityColorMap[c].label}</span>
                        <input
                          type="number"
                          min={5}
                          max={86400}
                          key={`ps-${c}-${scarcityBtn.phaseSeconds[c]}`}
                          defaultValue={scarcityBtn.phaseSeconds[c]}
                          onBlur={(e) => {
                            const v = Math.max(5, Math.min(86400, Number(e.target.value) || scarcityBtn.phaseSeconds[c]));
                            patchScarcityButton({
                              phaseSeconds: { ...scarcityBtn.phaseSeconds, [c]: v },
                            });
                          }}
                          className="w-14 bg-background border border-border rounded-lg px-1 py-1 text-[10px] text-foreground text-center tabular-nums outline-none focus:border-primary/50"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              )}
              </div>

              {/* Avatar Admin */}
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">Avatar Admin</p>
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/25 border border-border">
                  <input
                    ref={adminAvatarFileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) void handleAdminAvatarUpload(file);
                    }}
                  />
                  <button
                    type="button"
                    disabled={adminAvatarUploading}
                    onClick={() => adminAvatarFileRef.current?.click()}
                    className="relative h-10 w-10 rounded-xl bg-muted border border-border overflow-hidden shrink-0 flex items-center justify-center cursor-pointer hover:opacity-90 disabled:opacity-60 disabled:pointer-events-none"
                    title="Enviar imagem da logo"
                    aria-label="Enviar imagem da logo do administrador"
                  >
                    {adminAvatarUploading ? (
                      <RefreshCcw className="h-4 w-4 text-muted-foreground animate-spin" />
                    ) : config.adminAvatar?.logoUrl ? (
                      <Image src={config.adminAvatar.logoUrl} alt="" className="w-full h-full object-cover" width={0} height={0} sizes="100vw" />
                    ) : (
                      <Shield className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                  <div className="flex-1 space-y-1.5 min-w-0" key={config.adminAvatar?.logoUrl ?? "no-logo"}>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        defaultValue={config.adminAvatar?.logoUrl ?? ""}
                        onBlur={(e) =>
                          updateConfig({
                            adminAvatar: { ...config.adminAvatar, logoUrl: e.target.value },
                          })
                        }
                        className="min-w-0 flex-1 bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary/50"
                        placeholder="URL da logo (ou envie ao lado)"
                      />
                      <button
                        type="button"
                        disabled={adminAvatarUploading}
                        onClick={() => adminAvatarFileRef.current?.click()}
                        className="shrink-0 inline-flex items-center justify-center rounded-xl border border-border bg-background px-2.5 py-1.5 text-[10px] font-semibold text-foreground hover:bg-muted/60 disabled:opacity-50"
                      >
                        <Upload className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                    <input
                      type="text"
                      defaultValue={config.adminAvatar?.displayName ?? "Administrador"}
                      onBlur={(e) =>
                        updateConfig({
                          adminAvatar: { ...config.adminAvatar, displayName: e.target.value },
                        })
                      }
                      className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary/50"
                      placeholder="Nome no chat"
                    />
                  </div>
                </div>
              </div>
            </>}

            {/* ── MACROS (FakeChatPanel) ── */}
            {activeTab === "macros" && (
              <FakeChatPanel
                webinarId={webinarId}
                webinarName={webinarName}
                adminName={adminName}
                currentStatus={currentStatus}
                secondsSinceStart={secondsSinceStart}
                chatMode={config.chat.mode}
                macros={macros}
                onMacrosChange={setMacros}
                onSendMacro={sendMacro}
              />
            )}

            {/* ── ENQUETES ── */}
            {activeTab === "enquetes" && <PollAdmin webinarId={webinarId} />}

            {/* ── COMPARTILHAR ── */}
            {activeTab === "compartilhar" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-3 space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Plano rápido</p>
                  <ol className="text-[10px] text-muted-foreground leading-relaxed space-y-1.5 list-decimal list-inside marker:text-foreground/70">
                    <li>Procura o lead pelo nome ou email.</li>
                    <li>Copia o link de entrada — é o login do cliente na sala, com nome e email já preenchidos no link.</li>
                  </ol>
                </div>

                <div className="rounded-2xl border border-border bg-background p-3 space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Link da sala (login público)</p>
                  <p className="text-[10px] text-muted-foreground break-all font-mono leading-relaxed">{roomLoginUrl}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void copyRoomLoginLink()}
                      className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black transition-all ${
                        copiedRoomLink
                          ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                          : "bg-primary hover:brightness-110 text-foreground"
                      }`}
                    >
                      {copiedRoomLink ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedRoomLink ? "Copiado!" : "Copiar link da sala"}
                    </button>
                    <a
                      href={roomLoginUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 min-w-[120px] flex items-center justify-center py-2 rounded-xl text-xs font-black border border-border bg-muted/40 hover:bg-muted/60 text-foreground transition-all"
                    >
                      Abrir sala
                    </a>
                  </div>
                </div>

                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">Link de entrada do cliente</p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <input type="text" value={shareSearch} onChange={e => { setShareSearch(e.target.value); setSelectedShareLead(null); }}
                      placeholder="Nome ou email do lead..." className="w-full bg-muted/40 border border-border rounded-xl pl-9 pr-3 py-2.5 text-xs text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground" />
                  </div>
                </div>
                {shareResults.length > 0 && !selectedShareLead && (
                  <div className="rounded-xl border border-border bg-muted/40 overflow-hidden">
                    {shareResults.map(lead => (
                      <button key={lead.id} onClick={() => { setSelectedShareLead({ name: lead.name, email: lead.email }); setShareSearch(`${lead.name} — ${lead.email}`); setShareResults([]); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted/50 transition-all border-b border-border/40 last:border-0 text-left">
                        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-[10px] font-black shrink-0">{lead.name.slice(0, 2).toUpperCase()}</div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{lead.name}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{lead.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {selectedShareLead && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-muted/40 border border-border flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-black shrink-0">{selectedShareLead.name.slice(0, 2).toUpperCase()}</div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-foreground truncate">{selectedShareLead.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{selectedShareLead.email}</p>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-background border border-border space-y-2">
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Link de login (copiar e enviar)</p>
                      <p className="text-[10px] text-muted-foreground break-all font-mono leading-relaxed">{shareLink}</p>
                      <button onClick={copyLink}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all ${copied ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" : "bg-primary hover:brightness-110 text-foreground"}`}>
                        {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? "Copiado!" : "Copiar link"}
                      </button>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-dashed border-border/80 bg-muted/10 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">HubSpot — em breve</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Integração com formulários criados no HubSpot: quando o lead se inscreve no formulário, disparo automático de e-mail com o link de login na sala e uma mensagem personalizada — sem copiar manualmente daqui.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal confirmação */}
      {confirmAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-3xl border border-border bg-muted/40 p-8 shadow-2xl">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 mx-auto">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h3 className="mb-3 text-xl font-black text-foreground text-center uppercase">Ação Crítica</h3>
            <p className="mb-8 text-sm text-muted-foreground text-center leading-relaxed">
              Mudar para <span className="font-black text-foreground">{confirmAction.next}</span>. Isso afetará todos os espectadores.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmAction(null)} className="flex-1 rounded-2xl bg-muted py-3 text-xs font-black uppercase text-foreground/90 hover:bg-muted/80 transition-all">Cancelar</button>
              <button onClick={() => changeStatus(confirmAction.next, true)} className="flex-1 rounded-2xl bg-primary py-3 text-xs font-black uppercase text-foreground hover:brightness-110 transition-all">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
