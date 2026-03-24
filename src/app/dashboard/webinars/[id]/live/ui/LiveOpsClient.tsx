"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MessageCircle, BarChart2, PlayCircle, PauseCircle, SkipForward, Trash2, Pin,
  RefreshCcw, Timer, AlertTriangle, Zap, ShieldAlert, Keyboard, CheckCircle2,
  Wifi, WifiOff, Tag, ShoppingCart, Plus, Minus, Eye, EyeOff, Sparkles, Heart,
  Bell, Settings, Users, Activity, MousePointer2, TrendingUp, Clock
} from "lucide-react";

import type { WebinarConfig } from "@/lib/webinar-templates";
import { PollAdmin } from "@/components/polls/PollAdmin";
import { computePublicWatchPhase } from "@/lib/webinar-timing";
import { useWebinarSse } from "@/lib/useWebinarSse";

type WebinarStatus = "DRAFT" | "SCHEDULED" | "LIVE" | "REPLAY" | "FINISHED";

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
  initialMacros?: any[];
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
  
  // SSE unificado
  const { messages, polls, status: sseStatus, config: sseConfig, spots, connected } = useWebinarSse(webinarId, true, 1500);
  
  const config = sseConfig || initialConfig;
  const currentStatus = (sseStatus as WebinarStatus) || status;

  const [phase, setPhase] = useState<"waiting" | "live" | "replay">("live");
  const [playerSeconds, setPlayerSeconds] = useState(0);
  const [confirmAction, setConfirmAction] = useState<{ type: string; next: WebinarStatus } | null>(null);
  const [lastActionTime, setLastActionTime] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "polls" | "settings">("chat");

  const macros = initialMacros.length > 0 ? initialMacros : [];

  const parseMessage = useCallback((text: string) => {
    return text.replace(/{{webinar_name}}/g, webinarName)
               .replace(/{{status}}/g, currentStatus);
  }, [webinarName, currentStatus]);

  async function changeStatus(next: WebinarStatus, force = false) {
    if (!force && (next === "FINISHED" || next === "REPLAY") && currentStatus === "LIVE") {
      setConfirmAction({ type: "status", next });
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
        const data = (await res.json()) as { status: WebinarStatus };
        setStatus(data.status);
        setLastActionTime(Date.now());
      }
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function updateConfig(patch: Partial<WebinarConfig>) {
    const newConfig = { ...config, ...patch };
    await fetch(`/api/webinars/${webinarId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: newConfig }),
    });
    setLastActionTime(Date.now());
  }

  async function updateSpots(delta: number) {
    const newCount = Math.max(0, (spots.count || 0) + delta);
    await fetch(`/api/webinars/${webinarId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spotsCount: newCount }),
    });
    setLastActionTime(Date.now());
  }

  async function toggleSpotsVisibility() {
    await fetch(`/api/webinars/${webinarId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showSpots: !spots.show }),
    });
    setLastActionTime(Date.now());
  }

  async function sendMacro(macro: any) {
    const content = parseMessage(macro.text);
    const res = await fetch(`/api/webinars/${webinarId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        author: "Equipe",
        content,
        timestamp: config.chat.mode === "replay" ? Math.floor(playerSeconds) : undefined,
      }),
    });

    if (res.ok && macro.pin) {
      const data = await res.json();
      if (data.id) await fetch(`/api/webinars/${webinarId}/chat/${data.id}`, { method: "PATCH" });
    }

    if (macro.action === "offer") {
      await updateConfig({ offer: { ...config.offer, active: true } });
    } else if (macro.action === "scarcity") {
      await updateConfig({ scarcity: { ...config.scarcity, enabled: true } });
    }
    setLastActionTime(Date.now());
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col overflow-hidden font-sans">
      
      {/* Top Bar Mission Control */}
      <header className="h-20 border-b border-slate-800/60 bg-slate-900/80 backdrop-blur-2xl flex items-center justify-between px-8 shrink-0 z-50">
        <div className="flex items-center gap-6">
          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border transition-all duration-500 ${connected ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/10' : 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse'}`}>
            {connected ? <Wifi className="h-6 w-6" /> : <WifiOff className="h-6 w-6" />}
          </div>
          <div>
            <h1 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-3">
              Mission Control <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            </h1>
            <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span>{webinarName}</span>
              <span className="h-1 w-1 rounded-full bg-slate-700" />
              <span className={connected ? "text-emerald-500" : "text-red-500"}>
                {connected ? "Sincronizado" : "Desconectado"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end px-4 border-r border-slate-800">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status Atual</span>
            <span className={`text-xs font-black uppercase ${currentStatus === 'LIVE' ? 'text-red-500' : 'text-primary'}`}>{currentStatus}</span>
          </div>
          <a
            href={`/live/${webinarCode}/${webinarSlug}/watch`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl text-xs font-black transition-all border border-slate-700"
          >
            <PlayCircle className="h-4 w-4" /> VER SALA
          </a>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        
        {/* Sidebar Esquerda: Métricas e Controles de Status */}
        <aside className="w-80 border-r border-slate-800/60 bg-slate-900/40 flex flex-col shrink-0 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          
          {/* Card de Audiência */}
          <div className="p-5 rounded-3xl bg-slate-950 border border-slate-800/60 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Espectadores</p>
                <p className="text-2xl font-black text-white tabular-nums">1.248</p>
              </div>
            </div>
            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
              <div className="h-full bg-primary w-3/4 shadow-[0_0_10px_rgba(124,58,237,0.5)]" />
            </div>
            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
              <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3 text-emerald-500" /> +12%</span>
              <span>Meta: 2.000</span>
            </div>
          </div>

          {/* Controle de Vagas (Escassez) */}
          <div className="p-5 rounded-3xl bg-slate-950 border border-slate-800/60 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Escassez Real</h3>
              <button onClick={toggleSpotsVisibility} className={`p-1.5 rounded-lg transition-all ${spots.show ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-500'}`}>
                {spots.show ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex items-center justify-center gap-6">
              <button onClick={() => updateSpots(-1)} className="h-12 w-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-all active:scale-90 border border-red-500/20">
                <Minus className="h-6 w-6" />
              </button>
              <div className="text-center">
                <p className="text-4xl font-black text-white tabular-nums">{spots.count}</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Vagas</p>
              </div>
              <button onClick={() => updateSpots(1)} className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center hover:bg-emerald-500/20 transition-all active:scale-90 border border-emerald-500/20">
                <Plus className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Status da Transmissão */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Controle de Status</h3>
            <div className="grid grid-cols-1 gap-2">
              {(["LIVE", "REPLAY", "FINISHED"] as WebinarStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => changeStatus(s)}
                  disabled={updatingStatus || currentStatus === s}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-2xl border text-xs font-black transition-all ${
                    currentStatus === s
                      ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                      : "bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300"
                  }`}
                >
                  <span className="uppercase tracking-widest">{s}</span>
                  {currentStatus === s ? <CheckCircle2 className="h-4 w-4" /> : <div className="h-2 w-2 rounded-full bg-slate-700" />}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Área Central: Operação e Chat */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-950 p-6 gap-6">
          
          {/* Grid Superior: Macros e Funções */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 shrink-0">
            {/* Macros de Pitch */}
            <section className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800/60 shadow-xl space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" /> Macros de Operação
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {macros.map((macro, i) => (
                  <button
                    key={macro.id}
                    onClick={() => sendMacro(macro)}
                    className="group relative flex flex-col gap-1 p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-primary/50 transition-all text-left"
                  >
                    <span className="text-xs font-black text-white uppercase truncate">{macro.label}</span>
                    <span className="text-[10px] text-slate-500 font-mono">Ctrl + {i+1}</span>
                    {macro.action !== "none" && <div className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
                  </button>
                ))}
              </div>
            </section>

            {/* Funções da Sala */}
            <section className="p-6 rounded-3xl bg-slate-900/40 border border-slate-800/60 shadow-xl space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Settings className="h-4 w-4 text-slate-500" /> Funções da Sala
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'ambilight', label: 'Ambilight', icon: Sparkles, active: config.layout.ambilight, color: 'text-primary' },
                  { id: 'reactions', label: 'Reações', icon: Heart, active: config.reactions.enabled, color: 'text-red-500' },
                  { id: 'socialProof', label: 'Prova Social', icon: Bell, active: config.socialProof.enabled, color: 'text-amber-500' },
                  { id: 'chat', label: 'Chat', icon: MessageCircle, active: config.chat.enabled, color: 'text-blue-500' },
                ].map((fn) => (
                  <button
                    key={fn.id}
                    onClick={() => {
                      if (fn.id === 'ambilight') updateConfig({ layout: { ...config.layout, ambilight: !config.layout.ambilight } });
                      if (fn.id === 'reactions') updateConfig({ reactions: { ...config.reactions, enabled: !config.reactions.enabled } });
                      if (fn.id === 'socialProof') updateConfig({ socialProof: { ...config.socialProof, enabled: !config.socialProof.enabled } });
                      if (fn.id === 'chat') updateConfig({ chat: { ...config.chat, enabled: !config.chat.enabled } });
                    }}
                    className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                      fn.active 
                        ? "bg-slate-950 border-slate-700 text-white" 
                        : "bg-slate-900/20 border-transparent text-slate-600"
                    }`}
                  >
                    <fn.icon className={`h-4 w-4 ${fn.active ? fn.color : ''}`} />
                    <span className="text-xs font-black uppercase tracking-widest">{fn.label}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* Área Inferior: Chat e Enquetes */}
          <div className="flex-1 flex gap-6 min-h-0">
            {/* Chat Master */}
            <section className="flex-1 flex flex-col rounded-3xl bg-slate-900/40 border border-slate-800/60 shadow-xl overflow-hidden">
              <div className="p-4 border-b border-slate-800/60 flex items-center justify-between bg-slate-900/60">
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-4 w-4 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Chat Master</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{messages.length} Mensagens</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
                {messages.map((m) => (
                  <div key={m.id} className={`group flex flex-col gap-1.5 p-4 rounded-2xl transition-all ${m.pinned ? 'bg-primary/10 border border-primary/20' : 'bg-slate-950/50 border border-transparent hover:border-slate-800'}`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${m.author === 'Equipe' ? 'text-primary' : 'text-slate-500'}`}>{m.author}</span>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="text-slate-600 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                        {!m.pinned && <button className="text-slate-600 hover:text-amber-500"><Pin className="h-3.5 w-3.5" /></button>}
                      </div>
                    </div>
                    <p className="text-xs font-medium text-slate-300 leading-relaxed">{m.content}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Enquetes Live */}
            <section className="w-96 flex flex-col rounded-3xl bg-slate-900/40 border border-slate-800/60 shadow-xl overflow-hidden">
              <div className="p-4 border-b border-slate-800/60 bg-slate-900/60">
                <div className="flex items-center gap-3">
                  <BarChart2 className="h-4 w-4 text-primary" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Enquetes Live</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                <PollAdmin webinarId={webinarId} />
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* Modal de Confirmação Premium */}
      {confirmAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-[40px] border border-slate-800 bg-slate-900 p-10 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/10 text-amber-500 border border-amber-500/20 mx-auto">
              <AlertTriangle className="h-10 w-10" />
            </div>
            <h3 className="mb-4 text-2xl font-black text-white text-center uppercase tracking-tight">Ação Crítica</h3>
            <p className="mb-10 text-sm text-slate-400 text-center leading-relaxed">
              Você está prestes a mudar o status para <span className="font-black text-white">{confirmAction.next}</span>. 
              Esta ação é irreversível e afetará todos os espectadores.
            </p>
            <div className="flex gap-4">
              <button onClick={() => setConfirmAction(null)} className="flex-1 rounded-2xl bg-slate-800 py-4 text-xs font-black uppercase tracking-widest text-slate-300 hover:bg-slate-700 transition-all">Cancelar</button>
              <button onClick={() => changeStatus(confirmAction.next, true)} className="flex-1 rounded-2xl bg-primary py-4 text-xs font-black uppercase tracking-widest text-white hover:brightness-110 transition-all shadow-xl shadow-primary/20">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
