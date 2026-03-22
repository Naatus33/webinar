"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useCallback } from "react";
import { MessageCircle, X, Users, AlertTriangle, ChevronUp, Pin, Maximize2, Minimize2, Heart, Timer } from "lucide-react";
import type { WebinarConfig } from "@/lib/webinar-templates";
import { computePublicWatchPhase } from "@/lib/webinar-timing";
import { useChatSse } from "@/lib/useChatSse";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReactPlayer = dynamic(() => import("react-player"), { ssr: false }) as any;

interface ChatMessage {
  id: string;
  author: string;
  content: string;
  pinned: boolean;
  timestamp: number | null;
  createdAt: string;
}

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
  green: "#10B981", // Emerald 500
  yellow: "#EAB308", // Yellow 500
  orange: "#F97316", // Orange 500
  red: "#EF4444",   // Red 500
};

export function WatchPageClient({ webinar }: { webinar: WebinarData }) {
  const { config } = webinar;
  const [phase, setPhase] = useState<"waiting" | "live" | "replay">("live");
  const [countdown, setCountdown] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
  
  const [chatOpen, setChatOpen] = useState(false); // mobile
  const [focusMode, setFocusMode] = useState(false); // teatro mode
  
  const [playerSeconds, setPlayerSeconds] = useState(0);
  const [name] = useState(() => typeof window !== "undefined" ? (sessionStorage.getItem("lead_name") ?? "Participante") : "Participante");
  const [chatInput, setChatInput] = useState("");
  
  const [offerPhase, setOfferPhase] = useState<"green" | "yellow" | "orange" | "red">("green");
  const [offerVisible, setOfferVisible] = useState(false); // Initially false to allow animation
  const [popupVisible, setPopupVisible] = useState(false);
  const [participants, setParticipants] = useState<number | null>(null);
  
  const [hearts, setHearts] = useState<{id: number, left: number}[]>([]);
  const heartCounter = useRef(0);

  const tickPhase = useCallback(() => {
    const { phase: p, secondsUntilStart, secondsSinceStart } = computePublicWatchPhase({
      startDate: webinar.startDate,
      startTime: webinar.startTime,
      replayEnabled: webinar.replayEnabled,
      status: webinar.status,
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

    // Mantém o tempo de playback usado por: chat em replay, presença e outras timers.
    if (p === "live" || p === "replay") {
      setPlayerSeconds((prev) => {
        if (secondsSinceStart <= 0) return prev;
        // Evita "regressão" caso o servidor/client difira um pouco.
        return prev < secondsSinceStart ? secondsSinceStart : prev;
      });
    } else {
      setPlayerSeconds(0);
    }
  }, [webinar.startDate, webinar.startTime, webinar.replayEnabled, webinar.status]);

  useEffect(() => {
    tickPhase();
    const interval = setInterval(tickPhase, 1000);
    return () => clearInterval(interval);
  }, [tickPhase]);

  useEffect(() => {
    const initial = Math.floor(Math.random() * (config.participants.max - config.participants.min + 1)) + config.participants.min;
    setParticipants(initial);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const phaseElapsed = useRef(0);

  const { messages: chatMessages } = useChatSse(webinar.id, config.chat.enabled);

  const visibleMessages =
    config.chat.mode === "replay"
      ? chatMessages.filter(
          (m) => m.timestamp !== null && m.timestamp <= playerSeconds,
        )
      : chatMessages;

  const pinnedMessage = visibleMessages.find((m) => m.pinned);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMessages, chatOpen]);

  // Ping de presença
  useEffect(() => {
    const leadId = typeof window !== "undefined" ? sessionStorage.getItem("lead_id") : null;
    const interval = setInterval(() => {
      const minute = Math.floor(playerSeconds / 60);
      fetch(`/api/webinars/${webinar.id}/ping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, minute }),
      });
    }, 30_000);
    return () => clearInterval(interval);
  }, [playerSeconds, webinar.id]);

  // Variação participantes
  useEffect(() => {
    if (!config.participants.autoVariation) return;
    const interval = setInterval(() => {
      const delta = Math.floor(Math.random() * 21) - 10;
      setParticipants((c) => {
        if (c === null) return null;
        return Math.min(config.participants.max, Math.max(config.participants.min, c + delta));
      });
    }, 35_000);
    return () => clearInterval(interval);
  }, [config.participants]);

  // Delay da Oferta Principal (Botão)
  useEffect(() => {
    if (!config.offer.active) return;
    // Se for replay ou não tiver timer configurado (simulando delay simples), mostramos após 2s por padrao para ter animação
    // Aqui assumimos que a oferta já devia estar ativa pelo config, mas adicionamos o efeito visual.
    const timer = setTimeout(() => setOfferVisible(true), 1500);
    return () => clearTimeout(timer);
  }, [config.offer.active]);

  // Paleta automática do botão de oferta
  useEffect(() => {
    if (!config.offer.active || !config.offer.colorTimer.enabled) return;
    const interval = setInterval(() => {
      phaseElapsed.current += 1;
      const phases = ["green", "yellow", "orange", "red"] as const;
      let cumulative = 0;
      for (const p of phases) {
        cumulative += config.offer.colorTimer.phases[p].seconds;
        if (phaseElapsed.current < cumulative) {
          setOfferPhase(p);
          return;
        }
      }
      setOfferPhase("red");
    }, 1000);
    return () => clearInterval(interval);
  }, [config.offer]);

  // Pop-up de oferta
  useEffect(() => {
    if (!config.offerPopup.enabled) return;
    const delay = config.offerPopup.delayMinutes * 60 * 1000;
    const timer = setTimeout(() => setPopupVisible(true), delay);
    return () => clearTimeout(timer);
  }, [config.offerPopup]);

  // Auto-fechar pop-up
  useEffect(() => {
    if (!popupVisible || config.offerPopup.autoCloseSeconds === 0) return;
    const timer = setTimeout(() => setPopupVisible(false), config.offerPopup.autoCloseSeconds * 1000);
    return () => clearTimeout(timer);
  }, [popupVisible, config.offerPopup.autoCloseSeconds]);

  async function sendMessage() {
    if (!chatInput.trim() || config.chat.readonly) return;
    await fetch(`/api/webinars/${webinar.id}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        author: name,
        content: chatInput.trim(),
        // No modo replay, o timestamp é usado para renderizar a mensagem no "tempo" certo.
        timestamp:
          config.chat.mode === "replay" ? playerSeconds : undefined,
      }),
    });
    setChatInput("");
  }

  const handleHeartClick = () => {
    const id = heartCounter.current++;
    const left = Math.random() * 80 + 10; // 10% to 90%
    setHearts(prev => [...prev, { id, left }]);
    setTimeout(() => {
      setHearts(prev => prev.filter(h => h.id !== id));
    }, 2000); // tempo da animacao no css
  };

  const offerColor = config.offer.colorTimer.enabled ? PHASE_COLORS[offerPhase] : config.branding.primaryColor;
  const offerText = config.offer.colorTimer.enabled
    ? config.offer.colorTimer.phases[offerPhase].text
    : "Quero participar!";

  return (
    <div
      className={`flex h-[100dvh] flex-col overflow-hidden transition-colors duration-500`}
      style={{ backgroundColor: focusMode ? '#000000' : config.layout.bgColor }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes floatUp {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-100px) scale(1.5); opacity: 0; }
        }
        .animate-float {
          animation: floatUp 2s ease-out forwards;
        }
      `}} />

      {/* Header - Hides in Focus Mode */}
      <header className={`flex items-center justify-between border-b border-white/10 px-4 py-3 transition-all duration-300 ${focusMode ? 'h-0 opacity-0 overflow-hidden py-0 border-none' : 'h-14 opacity-100'}`}>
        <div className="flex items-center gap-3">
          {config.branding.logo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={config.branding.logo} alt="Logo" className="h-8 w-auto object-contain" />
          ) : (
            <div className="h-8 w-8 rounded-full shadow-lg" style={{ backgroundColor: config.branding.primaryColor }} />
          )}
          <p className="text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-md">{webinar.name}</p>
        </div>
        
        <div className="flex items-center gap-4">
          {config.participants.enabled && participants !== null && (
            <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-slate-200 bg-black/20 px-3 py-1.5 rounded-full border border-white/5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              <Users className="h-4 w-4 text-slate-400" />
              {participants.toLocaleString("pt-BR")}
            </div>
          )}
        </div>
      </header>

      {/* Scarcity banner */}
      {config.scarcity.enabled && !focusMode && (
        <div className="flex items-center justify-center gap-2 px-4 py-2.5 text-white text-sm font-bold animate-in slide-in-from-top-2 duration-500 shadow-md"
          style={{ backgroundColor: PHASE_COLORS.red }}>
          <AlertTriangle className="h-4 w-4 animate-pulse" />
          <span>{config.scarcity.message}</span>
          {config.scarcity.count > 0 && <span className="bg-black/20 px-2 py-0.5 rounded ml-2">{config.scarcity.count} vagas restantes</span>}
        </div>
      )}

      {/* Main Content Area */}
      <div className={`flex flex-1 overflow-hidden relative ${focusMode ? 'p-0' : 'p-0 md:p-4 gap-4'}`}>
        
        {/* Container Central (Player + Content) */}
        <div
          className={`flex flex-1 flex-col transition-all duration-500 ${
            focusMode ? "w-full max-w-none" : "w-full min-w-0"
          }`}
        >
          
          {/* Player Wrapper */}
          <div className={`relative w-full bg-black flex-shrink-0 group ${focusMode ? 'h-full' : 'rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10'}`}>
            <div className={`w-full ${focusMode ? 'h-full flex items-center justify-center' : 'aspect-video'}`}>
              
              {/* Focus Mode Toggle Button */}
              <button 
                onClick={() => setFocusMode(!focusMode)}
                className="absolute top-4 right-4 z-20 bg-black/50 hover:bg-black/80 text-white p-2 rounded-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                title={focusMode ? "Sair do modo foco" : "Modo foco (Teatro)"}
              >
                {focusMode ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
              </button>

              {/* Like Button overlay */}
              <div className="absolute bottom-16 right-4 z-20">
                <button 
                  onClick={handleHeartClick}
                  className="bg-black/20 hover:bg-black/40 backdrop-blur-md border border-white/10 text-white p-3 rounded-full transition-transform active:scale-90"
                >
                  <Heart className="h-6 w-6 text-red-500 fill-current" />
                </button>
                {hearts.map(h => (
                  <Heart key={h.id} className="absolute bottom-12 h-6 w-6 text-red-500 fill-current animate-float pointer-events-none" style={{ left: `${h.left}%` }} />
                ))}
              </div>

              {phase === "waiting" ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 px-4 text-center">
                  <div className="h-16 w-16 mb-6 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                    <Timer className="h-8 w-8 text-white/50" />
                  </div>
                  <p className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">O evento começará em breve</p>
                  <h1 className="text-3xl md:text-5xl font-bold text-white mb-8 tracking-tight">{webinar.name}</h1>
                  
                  {countdown && (
                    <div className="flex items-center justify-center gap-4 text-white">
                      <div className="flex flex-col items-center">
                        <span className="flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-2xl bg-white/10 text-2xl md:text-3xl font-mono font-bold backdrop-blur-md border border-white/20 shadow-xl">
                          {countdown.hours.toString().padStart(2, "0")}
                        </span>
                        <span className="text-xs text-slate-400 mt-2 font-medium uppercase">Horas</span>
                      </div>
                      <span className="text-2xl font-bold text-white/30 -mt-6">:</span>
                      <div className="flex flex-col items-center">
                        <span className="flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-2xl bg-white/10 text-2xl md:text-3xl font-mono font-bold backdrop-blur-md border border-white/20 shadow-xl">
                          {countdown.minutes.toString().padStart(2, "0")}
                        </span>
                        <span className="text-xs text-slate-400 mt-2 font-medium uppercase">Minutos</span>
                      </div>
                      <span className="text-2xl font-bold text-white/30 -mt-6">:</span>
                      <div className="flex flex-col items-center">
                        <span className="flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-2xl bg-white/10 text-2xl md:text-3xl font-mono font-bold backdrop-blur-md border border-white/20 shadow-xl text-emerald-400">
                          {countdown.seconds.toString().padStart(2, "0")}
                        </span>
                        <span className="text-xs text-slate-400 mt-2 font-medium uppercase">Segundos</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : webinar.videoUrl ? (
                <ReactPlayer
                  url={webinar.videoUrl}
                  width="100%"
                  height="100%"
                  className="absolute top-0 left-0"
                  playing={config.video.autoplay}
                  muted={config.video.autoplay}
                  controls={!config.video.hideControls}
                  onProgress={({ playedSeconds }: { playedSeconds: number }) =>
                    setPlayerSeconds(Math.floor(playedSeconds))
                  }
                  config={{
                    youtube: {
                      playerVars: {
                        controls: config.video.hideControls ? 0 : 1,
                        rel: 0,
                        modestbranding: 1,
                        autoplay: config.video.autoplay ? 1 : 0,
                      },
                    },
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                  <p className="text-sm text-slate-500">Transmissão indisponível no momento</p>
                </div>
              )}
            </div>
          </div>

          {/* Description Below Player - Hides in Focus Mode */}
          {!focusMode && (config.content.title || config.content.description) && (
            <div className="px-4 py-6 md:px-2 animate-in fade-in duration-700">
              {config.content.title && <h2 className="text-2xl font-bold text-white tracking-tight">{config.content.title}</h2>}
              {config.content.description && (
                <p className="mt-2 text-base leading-relaxed text-white/70 max-w-3xl">{config.content.description}</p>
              )}
            </div>
          )}

          {/* Offer Button Inline (Desktop or when not sticky) - Hides in Focus Mode */}
          {!focusMode && config.offer.active && offerVisible && config.offer.position !== "bottom" && (
            <div className="px-4 py-4 md:px-2 animate-in slide-in-from-bottom-4 fade-in duration-700">
               <a href={config.offer.url || "#"} target="_blank" rel="noopener noreferrer"
                  className="flex h-14 w-full md:w-auto md:inline-flex md:px-12 items-center justify-center rounded-xl text-lg font-bold text-white shadow-2xl transition-all hover:scale-105 hover:brightness-110"
                  style={{ backgroundColor: offerColor }}>
                  {offerText}
                </a>
            </div>
          )}

        </div>

        {/* Desktop Chat Sidebar - Hides in Focus Mode */}
        {config.chat.enabled && !focusMode && (
          <div className="hidden md:flex flex-col w-[340px] flex-shrink-0 h-full min-h-0 overflow-hidden">
            <ChatBox
              messages={visibleMessages}
              pinnedMessage={pinnedMessage}
              readonly={config.chat.readonly}
              input={chatInput}
              onInputChange={setChatInput}
              onSend={sendMessage}
              primaryColor={config.branding.primaryColor}
              chatEndRef={chatEndRef}
            />
          </div>
        )}

      </div>

      {/* Sticky Bottom Offer (Mobile/Global) - Hides in Focus Mode */}
      {!focusMode && config.offer.active && offerVisible && config.offer.position === "bottom" && (
        <div className="bg-slate-950/80 backdrop-blur-xl border-t border-white/10 px-4 py-4 animate-in slide-in-from-bottom-full duration-500 z-40">
          <a href={config.offer.url || "#"} target="_blank" rel="noopener noreferrer"
            className="flex h-14 w-full max-w-5xl mx-auto items-center justify-center rounded-xl text-lg font-bold text-white shadow-[0_0_40px_rgba(0,0,0,0.3)] transition-all hover:scale-[1.02] hover:brightness-110"
            style={{ backgroundColor: offerColor }}>
            {offerText}
          </a>
        </div>
      )}

      {/* Mobile Chat Overlay Bottom Sheet */}
      {config.chat.enabled && !focusMode && (
        <div className="md:hidden z-30 relative">
          
          {/* Chat Toggle Handle */}
          <div className={`absolute bottom-0 w-full transition-transform duration-300 ${chatOpen ? 'translate-y-[-60vh]' : 'translate-y-0'}`}>
             <button 
              onClick={() => setChatOpen(!chatOpen)}
              className="flex w-full items-center justify-center gap-2 bg-slate-900/90 backdrop-blur-md py-3 text-sm font-medium text-white border-t border-white/10 shadow-[0_-10px_20px_rgba(0,0,0,0.2)] rounded-t-2xl"
            >
              <MessageCircle className="h-4 w-4" style={{ color: config.branding.primaryColor }} />
              {chatOpen ? "Esconder Chat" : "Mostrar Chat"}
              <ChevronUp className={`h-4 w-4 transition-transform duration-300 ${chatOpen ? "rotate-180" : ""}`} />
            </button>
          </div>

          {/* Chat Panel Mobile */}
          <div className={`absolute bottom-0 w-full h-[60vh] bg-slate-900 transition-transform duration-300 ${chatOpen ? 'translate-y-0' : 'translate-y-full'}`}>
             <ChatBox
                messages={visibleMessages}
                pinnedMessage={pinnedMessage}
                readonly={config.chat.readonly}
                input={chatInput}
                onInputChange={setChatInput}
                onSend={sendMessage}
                primaryColor={config.branding.primaryColor}
                chatEndRef={chatEndRef}
                isMobile={true}
              />
          </div>
        </div>
      )}

      {/* Offer Popup Modal */}
      {popupVisible && config.offerPopup.enabled && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative w-full max-w-md rounded-3xl bg-slate-900 p-1 text-white shadow-2xl animate-in zoom-in-95 duration-500 border border-white/10 overflow-hidden">
            
            <button onClick={() => setPopupVisible(false)} className="absolute right-4 top-4 z-10 bg-black/40 p-2 rounded-full text-white/70 hover:text-white hover:bg-black/60 transition-colors">
              <X className="h-4 w-4" />
            </button>
            
            <div className="bg-slate-800/50 rounded-2xl p-6">
              {config.offerPopup.image && (
                <div className="mb-6 -mx-6 -mt-6">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                   <img src={config.offerPopup.image} alt="Oferta" className="w-full h-48 object-cover rounded-t-2xl" />
                </div>
              )}
              
              <div className="text-center">
                {config.offerPopup.title && <h3 className="mb-3 text-2xl font-black tracking-tight">{config.offerPopup.title}</h3>}
                {config.offerPopup.text && <p className="mb-6 text-base text-slate-300 leading-relaxed">{config.offerPopup.text}</p>}
                
                <a href={config.offerPopup.buttonUrl || "#"} target="_blank" rel="noopener noreferrer"
                  className="flex h-14 w-full items-center justify-center rounded-xl font-bold text-white text-lg shadow-lg hover:scale-105 transition-all"
                  style={{ backgroundColor: config.branding.primaryColor }}>
                  {config.offerPopup.buttonText || "Aproveitar oferta agora"}
                </a>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

function ChatBox({
  messages, pinnedMessage, readonly, input, onInputChange, onSend, primaryColor, chatEndRef, isMobile = false
}: {
  messages: ChatMessage[];
  pinnedMessage?: ChatMessage;
  readonly: boolean;
  input: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  primaryColor: string;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  isMobile?: boolean;
}) {
  return (
    <div className={`flex h-full flex-col overflow-hidden bg-slate-900/95 backdrop-blur-xl ${!isMobile ? 'rounded-2xl border border-white/10 ring-1 ring-black/50 shadow-xl' : ''}`}>
      
      {!isMobile && (
        <div className="flex items-center gap-2 border-b border-white/5 bg-white/5 px-4 py-3">
          <MessageCircle className="h-4 w-4" style={{ color: primaryColor }} />
          <span className="text-sm font-bold text-white tracking-wide">Chat ao Vivo</span>
          {readonly && <span className="ml-auto text-[10px] uppercase font-bold tracking-wider text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded">Somente leitura</span>}
        </div>
      )}

      {pinnedMessage && (
        <div className="flex items-start gap-3 border-b border-white/5 bg-slate-800/80 px-4 py-3 shadow-inner z-10">
          <Pin className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: primaryColor }} />
          <div>
            <p className="text-xs font-bold" style={{ color: primaryColor }}>{pinnedMessage.author} <span className="text-white/40 font-normal ml-1">Fixado</span></p>
            <p className="text-sm text-white/90 mt-0.5 leading-snug">{pinnedMessage.content}</p>
          </div>
        </div>
      )}

      <div className="flex-1 space-y-4 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {messages.filter((m) => !m.pinned).map((m) => (
          <div key={m.id} className="flex flex-col gap-1">
            <span className="text-xs font-bold" style={{ color: primaryColor }}>{m.author}</span>
            <div className="bg-white/5 inline-block rounded-2xl rounded-tl-sm px-4 py-2 w-fit max-w-[90%]">
               <p className="text-sm text-white/90 leading-relaxed">{m.content}</p>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {!readonly && (
        <div className="border-t border-white/10 bg-black/20 p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onSend(); } }}
              className="flex-1 rounded-xl border border-white/10 bg-slate-800 px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all"
              placeholder="Envie uma mensagem..."
            />
            <button onClick={onSend} className="rounded-xl px-5 py-2.5 text-sm font-bold text-white hover:brightness-110 transition-all active:scale-95"
              style={{ backgroundColor: primaryColor }}>
              Enviar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
