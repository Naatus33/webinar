"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
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

export function WatchPageClient({
  webinar: initialWebinar,
}: {
  webinar: WebinarData;
}) {
  const { messages, polls, status: sseStatus, config: sseConfig, spots, connected } = useWebinarSse(initialWebinar.id, true, 1500);
  
  const config = sseConfig || initialWebinar.config;
  const currentStatus = sseStatus || initialWebinar.status;

  const [phase, setPhase] = useState<"waiting" | "live" | "replay">("live");
  const [countdown, setCountdown] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
  
  const [chatOpen, setChatOpen] = useState(true);
  const [focusMode, setFocusMode] = useState(false);
  const [playerSeconds, setPlayerSeconds] = useState(0);
  const [chatInput, setChatInput] = useState("");
  const [participants, setParticipants] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  
  // Reações flutuantes
  const [floatingReactions, setFloatingReactions] = useState<{id: number, type: string, left: number}[]>([]);
  const reactionCounter = useRef(0);

  // Prova Social
  const [socialProof, setSocialProof] = useState<{ name: string, city: string } | null>(null);
  
  // Scroll do Chat
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [userIsScrolling, setUserIsScrolling] = useState(false);

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

  // Scroll automático do chat
  useEffect(() => {
    if (!userIsScrolling) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      
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

  async function sendChatMessage() {
    if (!chatInput.trim()) return;
    const content = chatInput;
    setChatInput("");
    await fetch(`/api/webinars/${initialWebinar.id}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        author: "Participante",
        content,
        timestamp: Math.floor(playerSeconds),
      }),
    });
  }

  // Efeito Ambilight Dinâmico
  const ambilightColor = config.offer.active ? 'rgba(249, 115, 22, 0.15)' : 'rgba(124, 58, 237, 0.05)';

  return (
    <div className={`min-h-[100dvh] bg-slate-950 text-slate-200 flex flex-col overflow-hidden transition-all duration-1000 ${focusMode ? 'bg-black' : ''}`}>
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
        
        /* Player Blindado - Esconder marcas d'água e branding */
        .player-wrapper iframe {
          pointer-events: none; /* Bloqueia cliques diretos no iframe */
        }
        .player-container:hover .player-overlay {
          opacity: 1;
        }
        /* Esconder títulos e botões de compartilhamento do YouTube/Vimeo via CSS se possível */
        .ytp-chrome-top, .ytp-show-cards-title, .ytp-share-button, .ytp-pause-overlay {
          display: none !important;
        }
      `}} />

      {/* Ambilight Background */}
      {config.layout.ambilight && (
        <div className="absolute inset-0 ambilight pointer-events-none z-0 transition-all duration-1000" />
      )}

      {/* Header Premium */}
      {!focusMode && (
        <header className="h-16 md:h-20 border-b border-slate-800/40 bg-slate-900/60 backdrop-blur-2xl flex items-center justify-between px-6 md:px-10 z-50 shrink-0">
          <div className="flex items-center gap-6">
            {config.branding.logo ? (
              <img src={config.branding.logo} alt="Logo" className="h-10 md:h-12 w-auto object-contain transition-transform hover:scale-105" />
            ) : (
              <div className="h-10 w-10 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30 shadow-lg shadow-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
            )}
            <div className="flex flex-col">
              <h1 className="font-black text-sm md:text-lg text-white tracking-tight truncate max-w-[200px] md:max-w-xl">
                {config.content.title || initialWebinar.name}
              </h1>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] md:text-xs font-bold text-emerald-400 tabular-nums">
                    {participants || 0} assistindo agora
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative z-10">
        
        {/* Video Area */}
        <div className={`flex-1 relative bg-black flex items-center justify-center transition-all duration-500 ${focusMode ? 'lg:p-0' : 'lg:p-8'}`}>
          <div className="w-full aspect-video max-h-full shadow-2xl shadow-black/80 relative group player-container overflow-hidden">
            
            {/* Player Wrapper */}
            <div className="w-full h-full player-wrapper">
              <ReactPlayer
                url={initialWebinar.videoUrl}
                width="100%"
                height="100%"
                playing={true}
                muted={isMuted}
                controls={false} // Desativa controles nativos
                config={{
                  youtube: {
                    playerVars: {
                      controls: 0,
                      modestbranding: 1,
                      rel: 0,
                      showinfo: 0,
                      iv_load_policy: 3,
                      disablekb: 1, // Desativa atalhos de teclado do YT
                    }
                  },
                  vimeo: {
                    playerOptions: {
                      controls: false,
                      badge: false,
                      byline: false,
                      portrait: false,
                      title: false,
                      dnt: true,
                    }
                  }
                }}
              />
            </div>

            {/* Overlay Invisível Anti-Pausa */}
            <div className="absolute inset-0 z-10 cursor-default" />
            
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

        {/* Sidebar (Chat & Oferta) */}
        <aside className={`w-full lg:w-[420px] border-l border-slate-800/40 bg-slate-900/30 backdrop-blur-3xl flex flex-col shrink-0 transition-all duration-500 ${focusMode ? 'lg:translate-x-full lg:opacity-0' : ''}`}>
          
          {/* Botão de Oferta (Sempre Visível se Ativo) */}
          {config.offer.active && (
            <div className="p-5 border-b border-slate-800/40 bg-primary/5 animate-in slide-in-from-top duration-500">
              <a 
                href={config.offer.url} 
                target="_blank" 
                className="group relative flex flex-col items-center gap-1 w-full bg-primary hover:brightness-110 text-white p-5 rounded-2xl font-black text-lg shadow-2xl shadow-primary/30 transition-all active:scale-[0.98] overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer" />
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-6 w-6" />
                  <span>{offerComputed.text}</span>
                </div>
                {spots.show && (
                  <span className="text-[10px] opacity-80 uppercase tracking-[0.2em] font-bold">Restam apenas {spots.count} vagas</span>
                )}
              </a>
              
              {/* Barra de Lote */}
              {spots.show && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 tracking-widest">
                    <span>Progresso do Lote</span>
                    <span className="text-primary">{Math.round((1 - spots.count / spots.total) * 100)}% Vendido</span>
                  </div>
                  <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
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
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-5 border-b border-slate-800/40 flex items-center justify-between bg-slate-900/40">
              <div className="flex items-center gap-3">
                <MessageCircle className="h-5 w-5 text-primary" />
                <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Chat ao Vivo</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setFocusMode(!focusMode)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-500 hover:text-white">
                  <Maximize2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {config.chat.enabled ? (
              <div 
                className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-hide"
                onScroll={(e) => {
                  const target = e.currentTarget;
                  const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 100;
                  setUserIsScrolling(!isAtBottom);
                }}
              >
                {messages.map((m) => (
                  <div key={m.id} className={`flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300 ${m.pinned ? 'bg-primary/10 p-4 rounded-2xl border border-primary/20 shadow-lg shadow-primary/5' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${m.author === 'Equipe' ? 'text-primary' : 'text-slate-500'}`}>
                        {m.author}
                      </span>
                      {m.pinned && <Zap className="h-3 w-3 text-primary fill-primary" />}
                    </div>
                    <p className="text-sm leading-relaxed text-slate-200 font-medium">{m.content}</p>
                  </div>
                ))}
                <div ref={chatEndRef} />
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
              <div className="p-5 border-t border-slate-800/40 bg-slate-900/40 flex justify-center gap-6">
                {REACTION_ICONS.map(({ id, Icon, color }) => (
                  <button 
                    key={id}
                    onClick={() => addReaction(id)}
                    className={`text-2xl transition-all hover:scale-150 active:scale-90 ${color} hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]`}
                  >
                    <Icon className="h-6 w-6 fill-current" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>
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
