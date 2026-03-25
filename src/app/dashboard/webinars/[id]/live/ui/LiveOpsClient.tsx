"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MessageCircle, BarChart2, PlayCircle, SkipForward, Trash2, Pin,
  AlertTriangle, Zap, Tag, Gift, Plus, Minus, Eye, EyeOff, Sparkles, Heart,
  Bell, Settings, Users, Activity, Clock, Wifi, WifiOff, CheckCircle2,
  Copy, Search, Link, Timer, Flag, Reply, Send, ChevronDown, ChevronUp,
  Monitor, Shield, RefreshCcw,
} from "lucide-react";

import type { WebinarConfig } from "@/lib/webinar-templates";
import { PollAdmin } from "@/components/polls/PollAdmin";
import { computePublicWatchPhase } from "@/lib/webinar-timing";
import { useWebinarSse, type OnlineLead } from "@/lib/useWebinarSse";

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false }) as any;

type WebinarStatus = "DRAFT" | "SCHEDULED" | "LIVE" | "REPLAY" | "FINISHED";
type AdminTab = "conversao" | "macros" | "enquetes" | "compartilhar";
type MsgType = "normal" | "urgent" | "warning";

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
  initialMacros?: any[];
}

function pad2(n: number) { return String(n).padStart(2, "0"); }
function formatSeconds(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h > 0 ? `${pad2(h)}:${pad2(m)}:${pad2(sec)}` : `${pad2(m)}:${pad2(sec)}`;
}

const SCARCITY_COLORS = {
  green: { bg: "bg-emerald-500", border: "border-emerald-500", text: "text-emerald-400", label: "Verde" },
  yellow: { bg: "bg-amber-500", border: "border-amber-500", text: "text-amber-400", label: "Amarelo" },
  red: { bg: "bg-red-500", border: "border-red-500", text: "text-red-400", label: "Vermelho" },
} as const;

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

  const { messages, polls, status: sseStatus, config: sseConfig, spots, viewerCount, liveConnections, onlineLeads, connected } =
    useWebinarSse(webinarId, true, 2000);

  const config = (sseConfig || initialConfig) as WebinarConfig;
  const currentStatus = (sseStatus as WebinarStatus) || status;
  const macros = initialMacros;

  // Timer AO VIVO
  const [secondsSinceStart, setSecondsSinceStart] = useState(0);
  const [phase, setPhase] = useState<"waiting" | "live" | "replay">("live");
  const [playerReady, setPlayerReady] = useState(false);
  const playerRef = useRef<any>(null);

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

  // Loop sincronizado: seek só acontece quando duração já é conhecida
  const secondsSinceStartRef = useRef(0);
  const videoDurationRef = useRef(0);
  const seekDoneRef = useRef(false); // garante seek inicial único
  useEffect(() => { secondsSinceStartRef.current = secondsSinceStart; }, [secondsSinceStart]);

  function seekToSyncPosition() {
    const dur = videoDurationRef.current;
    if (!playerRef.current || dur <= 0) return; // sem duração, não faz seek
    const target = secondsSinceStartRef.current % dur;
    try { playerRef.current.seekTo(target, "seconds"); } catch {}
  }

  function handlePlayerReady() {
    setPlayerReady(true);
    // NÃO faz seek aqui — duration ainda é 0. O seek inicial é feito em onDuration.
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

  // Scarcity button auto-timer
  const scarcityBtn = (config as any).scarcityButton ?? { enabled: false, color: "green", label: "Garanta sua vaga!", autoTimer: false, timerSeconds: 60 };
  const scarcityColorOrder: ("green" | "yellow" | "red")[] = ["green", "yellow", "red"];
  useEffect(() => {
    if (!scarcityBtn.enabled || !scarcityBtn.autoTimer) return;
    const interval = setInterval(() => {
      const idx = scarcityColorOrder.indexOf(scarcityBtn.color);
      const next = scarcityColorOrder[(idx + 1) % 3];
      updateConfig({ scarcityButton: { ...scarcityBtn, color: next } } as any);
    }, (scarcityBtn.timerSeconds || 60) * 1000);
    return () => clearInterval(interval);
  }, [scarcityBtn.enabled, scarcityBtn.autoTimer, scarcityBtn.color, scarcityBtn.timerSeconds]);

  // Simulated participants input
  const [simMin, setSimMin] = useState(String(config.participants?.min ?? 100));
  const [simMax, setSimMax] = useState(String(config.participants?.max ?? 500));

  // Vagas
  const [spotsInput, setSpotsInput] = useState(String(spots.count ?? 0));
  useEffect(() => { setSpotsInput(String(spots.count ?? 0)); }, [spots.count]);

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

  async function updateConfig(patch: Partial<WebinarConfig> | Record<string, any>) {
    const newConfig = { ...config, ...patch };
    await fetch(`/api/webinars/${webinarId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: newConfig }),
    });
  }

  async function updateSpots(newCount: number) {
    await fetch(`/api/webinars/${webinarId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spotsCount: Math.max(0, newCount) }),
    });
  }

  async function toggleSpotsVisibility() {
    await fetch(`/api/webinars/${webinarId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showSpots: !spots.show }),
    });
  }

  const adminName = (config as any).adminAvatar?.displayName || "Administrador";

  async function sendChatMessage() {
    if (!chatInput.trim() || sendingChat) return;
    const content = chatInput.trim();
    setChatInput("");
    setSendingChat(true);
    try {
      const body: any = {
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

  async function sendMacro(macro: any) {
    const content = parseMessage(macro.text);
    const res = await fetch(`/api/webinars/${webinarId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        author: adminName,
        content,
        type: "normal",
        timestamp: config.chat.mode === "replay" ? Math.floor(secondsSinceStart) : undefined,
      }),
    });
    if (res.ok && macro.pin) {
      const data = await res.json();
      if (data.id) await fetch(`/api/webinars/${webinarId}/chat/${data.id}`, { method: "PATCH" });
    }
    if (macro.action === "offer_on") await updateConfig({ offer: { ...config.offer, active: true } });
    if (macro.action === "scarcity_on") await updateConfig({ scarcity: { ...config.scarcity, enabled: true } });
  }

  // Atalhos de teclado Ctrl+1..9
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey) return;
      const num = parseInt(e.key);
      if (isNaN(num) || num < 1 || num > 9) return;
      const macro = macros[num - 1];
      if (macro) { e.preventDefault(); sendMacro(macro); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [macros, secondsSinceStart]);

  // Busca de leads para compartilhar
  useEffect(() => {
    if (shareSearch.length < 2) { setShareResults([]); return; }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/webinars/${webinarId}/leads?q=${encodeURIComponent(shareSearch)}`);
      if (res.ok) setShareResults(await res.json());
    }, 300);
    return () => clearTimeout(t);
  }, [shareSearch, webinarId]);

  const shareLink = selectedShareLead
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/live/${webinarCode}/${webinarSlug}?name=${encodeURIComponent(selectedShareLead.name)}&email=${encodeURIComponent(selectedShareLead.email)}`
    : "";

  async function copyLink() {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const filteredLeads = useMemo(() => {
    if (!leadSearch) return onlineLeads;
    const q = leadSearch.toLowerCase();
    return onlineLeads.filter(l => l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q));
  }, [onlineLeads, leadSearch]);

  const onlineCount = onlineLeads.filter(l => l.online).length;

  const adminAvatarUrl = (config as any).adminAvatar?.logoUrl;

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-200 overflow-hidden font-sans">
      <style dangerouslySetInnerHTML={{ __html: `.scrollbar-hide::-webkit-scrollbar{display:none}.scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}` }} />

      {/* ═══════════════════════════════════════════════════
          HEADER — h-12, toda info crítica em uma linha
      ═══════════════════════════════════════════════════ */}
      <header className="h-12 border-b border-slate-800/60 bg-slate-900/90 backdrop-blur-2xl flex items-center justify-between px-4 shrink-0 z-50 gap-3">
        {/* Esquerda: conexão + nome */}
        <div className="flex items-center gap-2 min-w-0">
          <div className={`h-2 w-2 rounded-full shrink-0 ${connected ? "bg-emerald-500 animate-pulse" : "bg-red-500 animate-pulse"}`} />
          <span className="text-xs font-black text-white truncate hidden sm:block">{webinarName}</span>
        </div>

        {/* Centro: timer + countdown REPLAY */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border ${currentStatus === "LIVE" ? "bg-red-500/10 border-red-500/30" : "bg-slate-900 border-slate-800"}`}>
            <Clock className={`h-3 w-3 ${currentStatus === "LIVE" ? "text-red-400" : "text-slate-600"}`} />
            <span className={`text-xs font-black tabular-nums ${currentStatus === "LIVE" ? "text-red-400" : "text-slate-500"}`}>{formatSeconds(secondsSinceStart)}</span>
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
                  ? s === "LIVE" ? "bg-red-500 border-red-500 text-white" : "bg-primary border-primary text-white"
                  : "bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-white"}`}>
              {s === "LIVE" && currentStatus === "LIVE" ? "● LIVE" : s}
            </button>
          ))}
          <a href={`/live/${webinarCode}/${webinarSlug}/watch`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-white px-2.5 py-1 rounded-lg text-[9px] font-black transition-all border border-slate-700">
            <PlayCircle className="h-3 w-3" /> SALA
          </a>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════
          BODY — 3 colunas, flex-1, overflow-hidden
      ═══════════════════════════════════════════════════ */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── COLUNA ESQUERDA (w-64): Métricas + Leads + Vagas ── */}
        <aside className="w-64 shrink-0 border-r border-slate-800/60 bg-slate-900/30 flex flex-col overflow-hidden">

          {/* 3 métricas em linhas compactas */}
          <div className="px-3 pt-3 space-y-1.5 shrink-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 px-1">Audiência</p>
            {[
              { icon: Activity, color: "text-red-400", bg: "bg-red-500/10", label: "Ao vivo agora", value: liveConnections, sub: "SSE" },
              { icon: Users, color: "text-amber-400", bg: "bg-amber-500/10", label: "Conectados", value: viewerCount, sub: "heartbeat" },
            ].map(m => (
              <div key={m.label} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800/60">
                <div className={`h-7 w-7 rounded-lg ${m.bg} flex items-center justify-center shrink-0`}>
                  <m.icon className={`h-3.5 w-3.5 ${m.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest leading-none truncate">{m.label}</p>
                  <p className="text-base font-black text-white tabular-nums leading-tight">{m.value}</p>
                </div>
                <span className="text-[8px] text-slate-700 shrink-0">{m.sub}</span>
              </div>
            ))}
            {/* Exibindo simulado */}
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800/60">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Monitor className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] text-slate-500 uppercase tracking-widest leading-none">Exibindo</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <input type="number" value={simMin} onChange={e => setSimMin(e.target.value)}
                    className="w-10 bg-slate-900 border border-slate-700 rounded text-[9px] text-white px-1 py-0.5 outline-none text-center" />
                  <span className="text-[8px] text-slate-600">–</span>
                  <input type="number" value={simMax} onChange={e => setSimMax(e.target.value)}
                    className="w-10 bg-slate-900 border border-slate-700 rounded text-[9px] text-white px-1 py-0.5 outline-none text-center" />
                  <button onClick={() => updateConfig({ participants: { ...config.participants, min: Number(simMin), max: Number(simMax) } })}
                    className="text-[8px] font-black bg-primary/20 text-primary px-1 py-0.5 rounded hover:bg-primary/30">OK</button>
                </div>
              </div>
            </div>
          </div>

          {/* Divisor */}
          <div className="mx-3 my-2 border-t border-slate-800/60 shrink-0" />

          {/* Leads ONLINE — flex-1, scrollável */}
          <div className="flex flex-col min-h-0 flex-1 px-3 overflow-hidden">
            <div className="flex items-center justify-between mb-1.5 shrink-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Leads na Sala</p>
              <span className="text-[9px] font-black text-emerald-400">{onlineCount} online</span>
            </div>
            <div className="relative mb-1.5 shrink-0">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-slate-600" />
              <input type="text" value={leadSearch} onChange={e => setLeadSearch(e.target.value)}
                placeholder="Buscar lead..." className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-6 pr-2 py-1.5 text-[10px] text-slate-300 outline-none focus:border-primary/50 placeholder:text-slate-700" />
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-hide min-h-0 space-y-0.5">
              {filteredLeads.length === 0
                ? <p className="text-[10px] text-slate-700 text-center py-4">Nenhum lead</p>
                : filteredLeads.map((lead, i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-900/60 transition-all">
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${lead.online ? "bg-emerald-500 animate-pulse" : "bg-slate-700"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-white truncate leading-none">{lead.name}</p>
                      <p className="text-[9px] text-slate-600 truncate">{lead.email}</p>
                    </div>
                    <span className={`text-[8px] font-bold shrink-0 ${lead.online ? "text-emerald-500" : "text-slate-700"}`}>
                      {lead.online ? (lead.lastSeenAt ? `${Math.round((Date.now() - new Date(lead.lastSeenAt).getTime()) / 1000)}s` : "●") : "—"}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* Divisor */}
          <div className="mx-3 my-2 border-t border-slate-800/60 shrink-0" />

          {/* Vagas — compacto no rodapé da sidebar */}
          <div className="px-3 pb-3 shrink-0 space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Vagas</p>
              <button onClick={toggleSpotsVisibility}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black border transition-all ${spots.show ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-slate-800 border-slate-700 text-slate-500"}`}>
                {spots.show ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
                {spots.show ? "Visível" : "Oculto"}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { const v = Math.max(0, Number(spotsInput) - 1); setSpotsInput(String(v)); updateSpots(v); }}
                className="h-8 w-8 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 transition-all border border-red-500/20 shrink-0">
                <Minus className="h-3.5 w-3.5" />
              </button>
              <input type="number" value={spotsInput} onChange={e => setSpotsInput(e.target.value)}
                onBlur={() => updateSpots(Number(spotsInput))} onKeyDown={e => e.key === "Enter" && updateSpots(Number(spotsInput))}
                className="flex-1 text-center text-xl font-black text-white bg-slate-950 border border-slate-800 rounded-xl py-1.5 outline-none focus:border-primary/50 tabular-nums" />
              <button onClick={() => { const v = Number(spotsInput) + 1; setSpotsInput(String(v)); updateSpots(v); }}
                className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/20 transition-all border border-emerald-500/20 shrink-0">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </aside>

        {/* ── COLUNA CENTRAL (flex-1): Player + Chat Master ── */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 border-r border-slate-800/60">

          {/* Player — aspect-video com max ~40% da altura */}
          <div className="relative bg-black shrink-0 overflow-hidden" style={{ height: "38%" }}>
            {videoUrl ? (
              <ReactPlayer ref={playerRef} url={videoUrl} src={videoUrl}
                playing muted
                width="100%" height="100%"
                onReady={handlePlayerReady}
                onDuration={handlePlayerDuration}
                onEnded={handlePlayerEnded}
                config={{ youtube: { playerVars: { controls: 0, disablekb: 1 } } }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-slate-600 text-xs">Sem vídeo configurado</p>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-3 py-2 pointer-events-none">
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-white">Minuto {formatSeconds(secondsSinceStart)} · Todos sincronizados</span>
              </div>
            </div>
          </div>

          {/* Chat Master — flex-1, ocupa o resto */}
          <div className="flex-1 flex flex-col min-h-0 bg-slate-900/20">

            {/* Header chat */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-t border-slate-800/60 bg-slate-900/60 shrink-0">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chat Master</span>
                <span className="text-[9px] text-slate-600 tabular-nums">{messages.length}</span>
              </div>
              <div className="flex items-center gap-1">
                {([
                  { key: "active", label: "Ativo", check: !!(config.chat.enabled && !(config.chat as any).adminOnly) },
                  { key: "adminOnly", label: "Adm", check: !!(config.chat.enabled && (config.chat as any).adminOnly) },
                  { key: "off", label: "Off", check: !config.chat.enabled },
                ] as const).map(m => (
                  <button key={m.key} onClick={() => {
                    if (m.key === "active") updateConfig({ chat: { ...config.chat, enabled: true, adminOnly: false } });
                    if (m.key === "adminOnly") updateConfig({ chat: { ...config.chat, enabled: true, adminOnly: true } });
                    if (m.key === "off") updateConfig({ chat: { ...config.chat, enabled: false } });
                  }} className={`px-2 py-0.5 rounded text-[9px] font-black transition-all ${m.check ? "bg-primary text-white" : "bg-slate-800 text-slate-500 hover:text-slate-300"}`}>
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
                  : m.pinned ? "bg-primary/10 border-primary/20" : "bg-slate-950/40 border-transparent";
                return (
                  <div key={m.id} className={`group relative rounded-xl border p-2 transition-all hover:border-slate-700 ${typeStyle}`}>
                    {m.replyToContent && (
                      <div className="mb-1 px-2 py-0.5 rounded-lg bg-slate-800/60 border-l-2 border-slate-600">
                        <p className="text-[8px] font-bold text-slate-500">{m.replyToAuthor}</p>
                        <p className="text-[9px] text-slate-400 truncate">{m.replyToContent}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {isAdmin && adminAvatarUrl && <img src={adminAvatarUrl} alt="" className="h-3 w-3 rounded-full object-cover shrink-0" />}
                      <span className={`text-[9px] font-black uppercase tracking-widest truncate ${isAdmin ? "text-red-400" : "text-slate-500"}`}>{m.author}</span>
                      {m.type === "urgent" && <span className="text-[7px] font-black bg-red-500/20 text-red-400 px-1 rounded">URG</span>}
                      {m.type === "warning" && <span className="text-[7px] font-black bg-amber-500/20 text-amber-400 px-1 rounded">AVS</span>}
                      {m.pinned && <Pin className="h-2 w-2 text-primary shrink-0" />}
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed break-words">{m.content}</p>
                    <div className="absolute top-1.5 right-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setReplyingTo({ id: m.id, author: m.author, content: m.content })} className="text-slate-600 hover:text-primary p-0.5 rounded"><Reply className="h-3 w-3" /></button>
                      {!m.pinned && <button onClick={() => pinMessage(m.id)} className="text-slate-600 hover:text-amber-400 p-0.5 rounded"><Pin className="h-3 w-3" /></button>}
                      <button onClick={() => deleteMessage(m.id)} className="text-slate-600 hover:text-red-400 p-0.5 rounded"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply card */}
            {replyingTo && (
              <div className="px-2 py-1.5 border-t border-slate-800/60 bg-slate-900/60 flex items-center gap-2 shrink-0">
                <div className="flex-1 px-2 py-1 rounded-lg bg-slate-800/60 border-l-2 border-primary min-w-0">
                  <p className="text-[9px] font-bold text-primary">↩ {replyingTo.author}</p>
                  <p className="text-[9px] text-slate-400 truncate">{replyingTo.content}</p>
                </div>
                <button onClick={() => setReplyingTo(null)} className="text-slate-600 hover:text-red-400 shrink-0 p-1"><Trash2 className="h-3 w-3" /></button>
              </div>
            )}

            {/* Tipo + input */}
            <div className="px-2 py-2 border-t border-slate-800/60 bg-slate-900/80 shrink-0 space-y-1.5">
              <div className="flex gap-1">
                {([
                  { type: "normal" as MsgType, label: "Normal", cls: "bg-slate-700 text-white border-slate-600" },
                  { type: "urgent" as MsgType, label: "Urgente", cls: "bg-red-500/20 text-red-400 border-red-500/30" },
                  { type: "warning" as MsgType, label: "Aviso", cls: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
                ]).map(t => (
                  <button key={t.type} onClick={() => setMsgType(t.type)}
                    className={`flex-1 py-1 rounded-lg text-[9px] font-black border transition-all ${msgType === t.type ? t.cls : "bg-slate-800/40 text-slate-600 border-transparent hover:text-slate-400"}`}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                  placeholder={`Enviar como ${adminName}...`}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary/50 placeholder:text-slate-600" />
                <button onClick={sendChatMessage} disabled={!chatInput.trim() || sendingChat}
                  className="h-9 w-9 rounded-xl bg-primary hover:brightness-110 disabled:opacity-40 flex items-center justify-center transition-all shrink-0">
                  <Send className="h-3.5 w-3.5 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── COLUNA DIREITA (w-96): Abas de Controle ── */}
        <div className="w-96 shrink-0 flex flex-col min-h-0 overflow-hidden">

          {/* Tab bar */}
          <div className="flex border-b border-slate-800/60 bg-slate-900/50 shrink-0">
            {([
              { id: "conversao", label: "Conversão", icon: Zap },
              { id: "macros", label: "Macros", icon: Activity },
              { id: "enquetes", label: "Enquetes", icon: BarChart2 },
              { id: "compartilhar", label: "Link", icon: Link },
            ] as { id: AdminTab; label: string; icon: any }[]).map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[8px] font-black uppercase tracking-widest transition-all border-b-2 ${
                  activeTab === tab.id ? "border-primary text-primary bg-primary/5" : "border-transparent text-slate-600 hover:text-slate-400 hover:bg-slate-800/20"}`}>
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content — flex-1 com scroll */}
          <div className="flex-1 overflow-y-auto scrollbar-hide min-h-0 p-4 space-y-4">

            {/* ── CONVERSÃO ── */}
            {activeTab === "conversao" && <>
              {/* Toggles grid 2×3 */}
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">Controles da Sala</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Oferta", icon: Tag, color: "text-emerald-400", active: config.offer.active, toggle: () => updateConfig({ offer: { ...config.offer, active: !config.offer.active } }) },
                    { label: "Pop-up", icon: Gift, color: "text-amber-400", active: config.offerPopup.enabled, toggle: () => updateConfig({ offerPopup: { ...config.offerPopup, enabled: !config.offerPopup.enabled } }) },
                    { label: "Countdown", icon: Timer, color: "text-blue-400", active: config.countdown.showOnWatch, toggle: () => updateConfig({ countdown: { ...config.countdown, showOnWatch: !config.countdown.showOnWatch } }) },
                    { label: "Escassez", icon: AlertTriangle, color: "text-red-400", active: config.scarcity.enabled, toggle: () => updateConfig({ scarcity: { ...config.scarcity, enabled: !config.scarcity.enabled } }) },
                    { label: "Reações", icon: Heart, color: "text-pink-400", active: config.reactions.enabled, toggle: () => updateConfig({ reactions: { ...config.reactions, enabled: !config.reactions.enabled } }) },
                    { label: "Ambilight", icon: Sparkles, color: "text-purple-400", active: config.layout.ambilight, toggle: () => updateConfig({ layout: { ...config.layout, ambilight: !config.layout.ambilight } }) },
                  ].map(item => (
                    <button key={item.label} onClick={item.toggle}
                      className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left ${item.active ? "bg-slate-900 border-slate-700" : "bg-slate-900/20 border-slate-800/40 opacity-50"}`}>
                      <item.icon className={`h-3.5 w-3.5 shrink-0 ${item.active ? item.color : "text-slate-600"}`} />
                      <span className={`text-[10px] font-black uppercase truncate ${item.active ? "text-white" : "text-slate-600"}`}>{item.label}</span>
                      <div className={`ml-auto h-1.5 w-1.5 rounded-full shrink-0 ${item.active ? "bg-emerald-500" : "bg-slate-700"}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Botão Escassez */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Botão Escassez</p>
                  <button onClick={() => updateConfig({ scarcityButton: { ...scarcityBtn, enabled: !scarcityBtn.enabled } } as any)}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-black border transition-all ${scarcityBtn.enabled ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-slate-800 border-slate-700 text-slate-500"}`}>
                    {scarcityBtn.enabled ? "ON" : "OFF"}
                  </button>
                </div>
                <div className="space-y-2 p-3 rounded-2xl bg-slate-900/40 border border-slate-800">
                  <input type="text" defaultValue={scarcityBtn.label}
                    onBlur={e => updateConfig({ scarcityButton: { ...scarcityBtn, label: e.target.value } } as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-primary/50" placeholder="Label do botão" />
                  <div className="flex gap-2">
                    {(["green", "yellow", "red"] as const).map(color => (
                      <button key={color} onClick={() => updateConfig({ scarcityButton: { ...scarcityBtn, color } } as any)}
                        className={`flex-1 py-2 rounded-xl text-[9px] font-black border-2 transition-all ${scarcityBtn.color === color ? `${SCARCITY_COLORS[color].bg} border-transparent text-white` : `bg-slate-900 ${SCARCITY_COLORS[color].border} ${SCARCITY_COLORS[color].text} opacity-60 hover:opacity-100`}`}>
                        {SCARCITY_COLORS[color].label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateConfig({ scarcityButton: { ...scarcityBtn, autoTimer: !scarcityBtn.autoTimer } } as any)}
                      className={`flex-1 py-1.5 rounded-xl text-[9px] font-black border transition-all ${scarcityBtn.autoTimer ? "bg-primary/10 border-primary/30 text-primary" : "bg-slate-800 border-slate-700 text-slate-500"}`}>
                      {scarcityBtn.autoTimer ? "Timer Ativo" : "Timer Off"}
                    </button>
                    <input type="number" defaultValue={scarcityBtn.timerSeconds} min={10}
                      onBlur={e => updateConfig({ scarcityButton: { ...scarcityBtn, timerSeconds: Number(e.target.value) } } as any)}
                      className="w-16 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-xs text-white outline-none focus:border-primary/50 text-center" />
                    <span className="text-[9px] text-slate-600 shrink-0">seg/cor</span>
                  </div>
                </div>
              </div>

              {/* Avatar Admin */}
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">Avatar Admin</p>
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/40 border border-slate-800">
                  <div className="h-10 w-10 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                    {(config as any).adminAvatar?.logoUrl
                      ? <img src={(config as any).adminAvatar.logoUrl} alt="" className="w-full h-full object-cover" />
                      : <Shield className="h-5 w-5 text-slate-600" />}
                  </div>
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <input type="text" defaultValue={(config as any).adminAvatar?.logoUrl ?? ""}
                      onBlur={e => updateConfig({ adminAvatar: { ...(config as any).adminAvatar, logoUrl: e.target.value } } as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-primary/50" placeholder="URL da logo" />
                    <input type="text" defaultValue={(config as any).adminAvatar?.displayName ?? "Administrador"}
                      onBlur={e => updateConfig({ adminAvatar: { ...(config as any).adminAvatar, displayName: e.target.value } } as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-primary/50" placeholder="Nome no chat" />
                  </div>
                </div>
              </div>
            </>}

            {/* ── MACROS ── */}
            {activeTab === "macros" && (
              macros.length === 0
                ? <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                    <Zap className="h-10 w-10 text-slate-700" />
                    <p className="text-xs text-slate-500">Nenhuma macro configurada.</p>
                    <p className="text-[10px] text-slate-700">Configure no Builder do webinar.</p>
                  </div>
                : <div className="space-y-3">
                    <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Ctrl+1..{Math.min(macros.length, 9)}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {macros.map((macro: any, i: number) => (
                        <button key={macro.id} onClick={() => sendMacro(macro)}
                          className="group relative flex flex-col gap-1.5 p-3 rounded-xl bg-slate-900/40 border border-slate-800 hover:border-primary/50 hover:bg-slate-900/70 transition-all text-left active:scale-95">
                          {macro.action !== "none" && <div className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
                          <span className="text-[10px] font-black text-white uppercase truncate pr-3">{macro.label}</span>
                          <p className="text-[9px] text-slate-500 line-clamp-2 leading-relaxed">{macro.text}</p>
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-[8px] font-black bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-full">Ctrl+{i + 1}</span>
                            {macro.pin && <span className="text-[8px] font-black bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded-full">Pin</span>}
                            {macro.action === "offer_on" && <span className="text-[8px] font-black bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded-full">Oferta</span>}
                            {macro.action === "scarcity_on" && <span className="text-[8px] font-black bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded-full">Escassez</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
            )}

            {/* ── ENQUETES ── */}
            {activeTab === "enquetes" && <PollAdmin webinarId={webinarId} />}

            {/* ── COMPARTILHAR ── */}
            {activeTab === "compartilhar" && (
              <div className="space-y-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">Link Personalizado</p>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                    <input type="text" value={shareSearch} onChange={e => { setShareSearch(e.target.value); setSelectedShareLead(null); }}
                      placeholder="Nome ou email do lead..." className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white outline-none focus:border-primary/50 placeholder:text-slate-600" />
                  </div>
                </div>
                {shareResults.length > 0 && !selectedShareLead && (
                  <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
                    {shareResults.map(lead => (
                      <button key={lead.id} onClick={() => { setSelectedShareLead({ name: lead.name, email: lead.email }); setShareSearch(`${lead.name} — ${lead.email}`); setShareResults([]); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-800/50 transition-all border-b border-slate-800/40 last:border-0 text-left">
                        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-[10px] font-black shrink-0">{lead.name.slice(0, 2).toUpperCase()}</div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{lead.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{lead.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {selectedShareLead && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xs font-black shrink-0">{selectedShareLead.name.slice(0, 2).toUpperCase()}</div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-white truncate">{selectedShareLead.name}</p>
                        <p className="text-[10px] text-slate-500 truncate">{selectedShareLead.email}</p>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Link gerado</p>
                      <p className="text-[10px] text-slate-400 break-all font-mono leading-relaxed">{shareLink}</p>
                      <button onClick={copyLink}
                        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all ${copied ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" : "bg-primary hover:brightness-110 text-white"}`}>
                        {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? "Copiado!" : "Copiar link"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal confirmação */}
      {confirmAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 mx-auto">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h3 className="mb-3 text-xl font-black text-white text-center uppercase">Ação Crítica</h3>
            <p className="mb-8 text-sm text-slate-400 text-center leading-relaxed">
              Mudar para <span className="font-black text-white">{confirmAction.next}</span>. Isso afetará todos os espectadores.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmAction(null)} className="flex-1 rounded-2xl bg-slate-800 py-3 text-xs font-black uppercase text-slate-300 hover:bg-slate-700 transition-all">Cancelar</button>
              <button onClick={() => changeStatus(confirmAction.next, true)} className="flex-1 rounded-2xl bg-primary py-3 text-xs font-black uppercase text-white hover:brightness-110 transition-all">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
