"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Palette, Type, Play, Tag, AlertTriangle, MessageCircle,
  Users, Layout, Timer, Gift, Shield, CheckSquare, ArrowLeft,
  ExternalLink, CheckCircle2, Loader2, AlertCircle, Settings, Target, Zap, Flag, Sparkles,
  Monitor, Smartphone, ChevronRight, ChevronLeft, Save
} from "lucide-react";

import { useWebinarStore } from "@/store/useWebinarStore";
import type { WebinarConfig } from "@/lib/webinar-templates";

import { WebinarPreview } from "@/components/preview/WebinarPreview";
import { BrandingPanel } from "@/components/builder/BrandingPanel";
import { ContentPanel } from "@/components/builder/ContentPanel";
import { VideoPanel } from "@/components/builder/VideoPanel";
import { OfferPanel } from "@/components/builder/OfferPanel";
import { ScarcityPanel } from "@/components/builder/ScarcityPanel";
import { ChatPanel } from "@/components/builder/ChatPanel";
import { ParticipantsPanel } from "@/components/builder/ParticipantsPanel";
import { LayoutPanel } from "@/components/builder/LayoutPanel";
import { CountdownPanel } from "@/components/builder/CountdownPanel";
import { OfferPopupPanel } from "@/components/builder/OfferPopupPanel";
import { SocialProofPanel } from "@/components/builder/SocialProofPanel";
import { FinishedPanel } from "@/components/builder/FinishedPanel";
import { MacrosPanel } from "@/components/builder/MacrosPanel";
import { RoomSettingsTab } from "@/components/builder/RoomSettingsTab";

interface WebinarData {
  id: string;
  name: string;
  status: string;
  code: string;
  slug: string;
  videoUrl: string;
  startDate: string | null;
  startTime: string | null;
  useNativeStreaming: boolean;
  redirectEnabled: boolean;
  redirectUrl: string | null;
  passwordEnabled: boolean;
  hasCapturePassword: boolean;
  replayEnabled: boolean;
  lgpdEnabled: boolean;
  lgpdText: string | null;
  regBgImage: string | null;
  regLogoUrl: string | null;
  regDescription: string | null;
  regTitle: string | null;
  regCtaText: string | null;
  regSponsors: { name: string; logoUrl: string }[];
  config: WebinarConfig;
  macros: any[];
}

interface BuilderClientProps {
  webinar: WebinarData;
}

const STEPS = [
  { 
    id: "fundamentos", 
    label: "Fundamentos", 
    icon: Settings,
    tabs: [
      { id: "branding", label: "Branding", Icon: Palette, component: BrandingPanel },
      { id: "layout", label: "Layout", Icon: Layout, component: LayoutPanel },
      { id: "content", label: "Conteúdo", Icon: Type, component: ContentPanel },
      { id: "video", label: "Vídeo", Icon: Play, component: VideoPanel },
    ]
  },
  { 
    id: "engajamento", 
    label: "Engajamento", 
    icon: Target,
    tabs: [
      { id: "chat", label: "Chat", Icon: MessageCircle, component: ChatPanel },
      { id: "participants", label: "Participantes", Icon: Users, component: ParticipantsPanel },
      { id: "social-proof", label: "Prova Social", Icon: Shield, component: SocialProofPanel },
      { id: "room-settings", label: "Sala Live", Icon: Sparkles, component: RoomSettingsTab },
    ]
  },
  { 
    id: "conversao", 
    label: "Conversão", 
    icon: Zap,
    tabs: [
      { id: "offer", label: "Oferta", Icon: Tag, component: OfferPanel },
      { id: "offer-popup", label: "Pop-up Oferta", Icon: Gift, component: OfferPopupPanel },
      { id: "scarcity", label: "Escassez", Icon: AlertTriangle, component: ScarcityPanel },
      { id: "countdown", label: "Countdown", Icon: Timer, component: CountdownPanel },
      { id: "macros", label: "Macros Live", Icon: Zap, component: MacrosPanel },
    ]
  },
  { 
    id: "finalizacao", 
    label: "Finalização", 
    icon: Flag,
    tabs: [
      { id: "finished", label: "Encerramento", Icon: CheckSquare, component: FinishedPanel },
    ]
  }
];

const SAVE_LABELS: Record<string, { label: string; Icon: React.ElementType; className: string }> = {
  idle: { label: "Salvo", Icon: CheckCircle2, className: "text-slate-500" },
  saving: { label: "Salvando...", Icon: Loader2, className: "animate-spin text-primary" },
  saved: { label: "Alterações salvas!", Icon: CheckCircle2, className: "text-emerald-400" },
  error: { label: "Erro ao salvar", Icon: AlertCircle, className: "text-red-400" },
};

/** Largura lógica do preview desktop antes de escalar — evita layout espremido na coluna estreita. */
const DESKTOP_PREVIEW_CANVAS_W = 1100;
const DESKTOP_PREVIEW_CANVAS_H = 640;

export function BuilderClient({ webinar }: BuilderClientProps) {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [activeTabId, setActiveTabId] = useState("branding");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const previewAreaRef = useRef<HTMLDivElement>(null);
  const [previewAreaWidth, setPreviewAreaWidth] = useState(0);

  const { loadFromServer, saveStatus } = useWebinarStore();

  useEffect(() => {
    loadFromServer(
      webinar.id,
      {
        id: webinar.id,
        name: webinar.name,
        status: webinar.status,
        code: webinar.code,
        slug: webinar.slug,
        videoUrl: webinar.videoUrl,
        startDate: webinar.startDate,
        startTime: webinar.startTime,
        useNativeStreaming: webinar.useNativeStreaming,
        redirectEnabled: webinar.redirectEnabled,
        redirectUrl: webinar.redirectUrl,
        passwordEnabled: webinar.passwordEnabled,
        hasCapturePassword: webinar.hasCapturePassword,
        replayEnabled: webinar.replayEnabled,
        lgpdEnabled: webinar.lgpdEnabled,
        lgpdText: webinar.lgpdText,
        regBgImage: webinar.regBgImage,
        regLogoUrl: webinar.regLogoUrl,
        regDescription: webinar.regDescription,
        regTitle: webinar.regTitle,
        regCtaText: webinar.regCtaText,
        regSponsors: webinar.regSponsors,
      },
      webinar.config,
      webinar.macros
    );
  }, [webinar.id, loadFromServer, webinar]);

  useEffect(() => {
    const el = previewAreaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setPreviewAreaWidth(el.getBoundingClientRect().width);
    });
    ro.observe(el);
    setPreviewAreaWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, [previewMode]);

  const desktopPreviewScale =
    previewMode === "desktop" && previewAreaWidth > 0
      ? Math.min(1, previewAreaWidth / DESKTOP_PREVIEW_CANVAS_W)
      : 1;

  const currentStep = STEPS[activeStepIndex];
  const activeTab = currentStep.tabs.find(t => t.id === activeTabId) || currentStep.tabs[0];
  const ActivePanel = activeTab.component;
  
  const saveInfo = SAVE_LABELS[saveStatus] ?? SAVE_LABELS.idle;
  const SaveIcon = saveInfo.Icon;

  const nextStep = () => {
    if (activeStepIndex < STEPS.length - 1) {
      setActiveStepIndex(prev => prev + 1);
      setActiveTabId(STEPS[activeStepIndex + 1].tabs[0].id);
    }
  };

  const prevStep = () => {
    if (activeStepIndex > 0) {
      setActiveStepIndex(prev => prev - 1);
      setActiveTabId(STEPS[activeStepIndex - 1].tabs[0].id);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-200 overflow-hidden font-sans">
      
      {/* Top Bar Premium */}
      <header className="h-16 border-b border-slate-800/60 bg-slate-900/80 backdrop-blur-xl flex items-center justify-between gap-3 px-3 sm:px-6 shrink-0 z-50">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Link href="/dashboard" className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="h-6 w-px bg-slate-800 mx-2" />
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-black text-white uppercase tracking-widest truncate">{webinar.name}</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase hidden sm:block">Construtor de Experiência</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-6 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950 border border-slate-800">
            <SaveIcon className={`h-3.5 w-3.5 ${saveInfo.className}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{saveInfo.label}</span>
          </div>
          <a
            href={`/live/${webinar.code}/${webinar.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-primary hover:brightness-110 text-white px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-black transition-all shadow-lg shadow-primary/20 whitespace-nowrap"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" /> PUBLICAR
          </a>
        </div>
      </header>

      <div className="flex-1 flex flex-col min-h-0 xl:flex-row xl:overflow-hidden overflow-y-auto">
        
        {/* Sidebar de Navegação por Passos */}
        <aside className="w-full max-h-[min(42vh,320px)] xl:max-h-none xl:w-72 border-b xl:border-b-0 xl:border-r border-slate-800/60 bg-slate-900/40 flex flex-col shrink-0 overflow-hidden xl:overflow-visible">
          <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 flex-1 overflow-y-auto min-h-0">
            
            {/* Indicador de Passos */}
            <div className="space-y-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-2">Fluxo de Criação</h2>
              <div className="space-y-1">
                {STEPS.map((step, idx) => {
                  const Icon = step.icon;
                  const isActive = activeStepIndex === idx;
                  const isPast = activeStepIndex > idx;
                  return (
                    <button
                      key={step.id}
                      onClick={() => {
                        setActiveStepIndex(idx);
                        setActiveTabId(step.tabs[0].id);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black transition-all border ${
                        isActive 
                          ? "bg-primary/10 border-primary/30 text-primary shadow-lg shadow-primary/5" 
                          : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
                      }`}
                    >
                      <div className={`h-6 w-6 rounded-lg flex items-center justify-center ${isActive ? 'bg-primary text-white' : isPast ? 'bg-emerald-500/20 text-emerald-500' : 'bg-slate-800 text-slate-600'}`}>
                        {isPast ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                      </div>
                      <span className="uppercase tracking-widest">{step.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sub-abas do Passo Atual */}
            <div className="space-y-4 pt-4 border-t border-slate-800/60">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-2">Configurações</h2>
              <div className="space-y-1">
                {currentStep.tabs.map((tab) => {
                  const Icon = tab.Icon;
                  const isActive = activeTabId === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTabId(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                        isActive 
                          ? "bg-slate-800 text-white border border-slate-700" 
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : ''}`} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Navegação de Rodapé */}
          <div className="p-4 border-t border-slate-800/60 bg-slate-900/60 flex gap-2">
            <button 
              onClick={prevStep}
              disabled={activeStepIndex === 0}
              className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-not-allowed transition-all text-[10px] font-black uppercase"
            >
              <ChevronLeft className="h-4 w-4" /> Voltar
            </button>
            <button 
              onClick={nextStep}
              disabled={activeStepIndex === STEPS.length - 1}
              className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl bg-primary hover:brightness-110 disabled:opacity-30 transition-all text-[10px] font-black uppercase text-white"
            >
              Próximo <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </aside>

        {/* Área Central: Editor */}
        <main className="flex-1 min-w-0 min-h-0 overflow-y-auto bg-slate-950 p-4 sm:p-6 lg:p-8 scrollbar-hide">
          <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
            <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <activeTab.Icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">{activeTab.label}</h2>
                <p className="text-xs sm:text-sm text-slate-500">Personalize os detalhes do seu webinar em tempo real.</p>
              </div>
            </div>
            
            <div className="bg-slate-900/30 rounded-2xl sm:rounded-3xl border border-slate-800/60 p-4 sm:p-6 lg:p-8 shadow-2xl backdrop-blur-sm">
              <ActivePanel />
            </div>
          </div>
        </main>

        {/* Sidebar de Preview (Desktop/Mobile) */}
        <aside className="w-full min-h-[min(52vh,480px)] h-[min(52vh,480px)] xl:h-auto xl:min-h-0 xl:w-[min(100%,460px)] 2xl:w-[min(100%,520px)] border-t xl:border-t-0 xl:border-l border-slate-800/60 bg-slate-900/20 flex flex-col shrink-0 overflow-hidden xl:max-w-[min(520px,42vw)]">
          <div className="h-12 sm:h-14 border-b border-slate-800/60 flex items-center justify-between px-4 sm:px-6 bg-slate-900/40 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Visualização</span>
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button 
                onClick={() => setPreviewMode("desktop")}
                className={`p-1.5 rounded-lg transition-all ${previewMode === "desktop" ? 'bg-slate-800 text-primary shadow-inner' : 'text-slate-600 hover:text-slate-400'}`}
              >
                <Monitor className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setPreviewMode("mobile")}
                className={`p-1.5 rounded-lg transition-all ${previewMode === "mobile" ? 'bg-slate-800 text-primary shadow-inner' : 'text-slate-600 hover:text-slate-400'}`}
              >
                <Smartphone className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            ref={previewAreaRef}
            className="flex-1 min-h-0 min-w-0 bg-slate-950/50 p-3 sm:p-4 md:p-6 flex items-start justify-center overflow-auto"
          >
            {previewMode === "mobile" ? (
              <div className="transition-all duration-500 shadow-2xl border border-slate-800 rounded-3xl overflow-hidden bg-slate-900 w-[min(280px,92vw)] h-[min(560px,70vh)] shrink-0">
                <div className="w-full h-full overflow-y-auto scrollbar-hide">
                  <WebinarPreview />
                </div>
              </div>
            ) : (
              <div
                className="shadow-2xl shrink-0"
                style={{
                  width: DESKTOP_PREVIEW_CANVAS_W * desktopPreviewScale,
                  height: DESKTOP_PREVIEW_CANVAS_H * desktopPreviewScale,
                }}
              >
                <div
                  className="rounded-2xl sm:rounded-3xl border border-slate-800 overflow-hidden bg-slate-900"
                  style={{
                    width: DESKTOP_PREVIEW_CANVAS_W,
                    height: DESKTOP_PREVIEW_CANVAS_H,
                    transform: `scale(${desktopPreviewScale})`,
                    transformOrigin: "top left",
                  }}
                >
                  <div className="h-full w-full overflow-y-auto scrollbar-hide">
                    <WebinarPreview />
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
