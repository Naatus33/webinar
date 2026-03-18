"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Palette, Type, Play, Tag, AlertTriangle, MessageCircle,
  Users, Layout, Timer, Gift, Shield, CheckSquare, ArrowLeft,
  ExternalLink, CheckCircle2, Loader2, AlertCircle, Settings, Target, Zap, Flag
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
  password: string | null;
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
}

interface BuilderClientProps {
  webinar: WebinarData;
}

const TABS = [
  { id: "branding", label: "Branding", Icon: Palette, component: BrandingPanel },
  { id: "layout", label: "Layout", Icon: Layout, component: LayoutPanel },
  { id: "content", label: "Conteúdo", Icon: Type, component: ContentPanel },
  { id: "video", label: "Vídeo", Icon: Play, component: VideoPanel },
  
  { id: "chat", label: "Chat", Icon: MessageCircle, component: ChatPanel },
  { id: "participants", label: "Participantes", Icon: Users, component: ParticipantsPanel },
  { id: "social-proof", label: "Prova Social", Icon: Shield, component: SocialProofPanel },
  
  { id: "offer", label: "Oferta", Icon: Tag, component: OfferPanel },
  { id: "offer-popup", label: "Pop-up Oferta", Icon: Gift, component: OfferPopupPanel },
  { id: "scarcity", label: "Escassez", Icon: AlertTriangle, component: ScarcityPanel },
  { id: "countdown", label: "Countdown", Icon: Timer, component: CountdownPanel },
  
  { id: "finished", label: "Encerramento", Icon: CheckSquare, component: FinishedPanel },
];

const CATEGORIES = [
  {
    id: "fundamentos",
    label: "Fundamentos",
    icon: Settings,
    description: "Visual e conteúdo base",
    tabs: ["branding", "layout", "content", "video"]
  },
  {
    id: "engajamento",
    label: "Engajamento",
    icon: Target,
    description: "Chat e prova social",
    tabs: ["chat", "participants", "social-proof"]
  },
  {
    id: "conversao",
    label: "Conversão",
    icon: Zap,
    description: "Ofertas e escassez",
    tabs: ["offer", "offer-popup", "scarcity", "countdown"]
  },
  {
    id: "pos-webinar",
    label: "Finalização",
    icon: Flag,
    description: "Comportamento ao fim",
    tabs: ["finished"]
  }
];

const SAVE_LABELS: Record<string, { label: string; Icon: React.ElementType; className: string }> = {
  idle: { label: "Todas alterações salvas", Icon: CheckCircle2, className: "text-slate-500" },
  saving: { label: "Salvando alterações...", Icon: Loader2, className: "animate-spin text-violet-400" },
  saved: { label: "Alterações salvas!", Icon: CheckCircle2, className: "text-emerald-400" },
  error: { label: "Erro ao salvar", Icon: AlertCircle, className: "text-red-400" },
};

export function BuilderClient({ webinar }: BuilderClientProps) {
  const [activeCategory, setActiveCategory] = useState("fundamentos");
  const [activeTab, setActiveTab] = useState("branding");
  
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
        password: webinar.password,
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
      webinar.config
    );
  }, [webinar.id, loadFromServer, webinar]); // added deps

  // Change active tab to the first tab of category when switching categories
  const handleCategoryChange = (categoryId: string) => {
    setActiveCategory(categoryId);
    const cat = CATEGORIES.find(c => c.id === categoryId);
    if (cat) setActiveTab(cat.tabs[0]);
  };

  const ActivePanel = TABS.find((t) => t.id === activeTab)?.component ?? BrandingPanel;
  const saveInfo = SAVE_LABELS[saveStatus] ?? SAVE_LABELS.idle;
  const SaveIcon = saveInfo.Icon;

  const currentCategoryObj = CATEGORIES.find(c => c.id === activeCategory);
  const currentCategoryTabs = TABS.filter(t => currentCategoryObj?.tabs.includes(t.id));

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 font-sans">
      
      {/* Coluna 1: Thin Sidebar Categories */}
      <div className="flex w-[80px] flex-shrink-0 flex-col items-center border-r border-slate-800/80 bg-slate-900/40 py-4 z-10">
        <Link href="/dashboard" className="mb-8 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800/50 text-slate-400 transition hover:bg-slate-700 hover:text-white" title="Voltar ao Dashboard">
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <div className="flex flex-col gap-4">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                title={cat.label}
                className={`group relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300 ${
                  isActive 
                    ? "bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.4)]" 
                    : "bg-transparent text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "scale-110" : "scale-100 group-hover:scale-110"} transition-transform`} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Coluna 2: Config Panel */}
      <div className="flex w-[340px] flex-shrink-0 flex-col border-r border-slate-800/80 bg-slate-900/20 z-10 relative">
        {/* Header do Config Panel */}
        <div className="border-b border-slate-800/60 p-5">
          <h2 className="text-lg font-bold text-white tracking-tight">{currentCategoryObj?.label}</h2>
          <p className="text-xs text-slate-400 mt-1">{currentCategoryObj?.description}</p>
        </div>

        {/* Sub-tabs list (vertical pills) */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {currentCategoryTabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                activeTab === id
                  ? "bg-slate-800 text-violet-300 shadow-sm border border-slate-700/50"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent"
              }`}
            >
              <Icon className={`h-4 w-4 ${activeTab === id ? "text-violet-400" : "text-slate-500"}`} />
              {label}
            </button>
          ))}

          <div className="pt-4 mt-4 border-t border-slate-800/50">
            <ActivePanel />
          </div>
        </div>
      </div>

      {/* Coluna 3: Live Preview (Right side) */}
      <div className="flex flex-1 flex-col overflow-hidden bg-[url('/grid-bg.svg')] bg-center bg-slate-950">
        
        {/* Top Bar Right */}
        <div className="flex items-center justify-between border-b border-slate-800/60 bg-slate-900/80 backdrop-blur-md px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-medium text-slate-300">Preview em tempo real</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/50 border border-slate-700/50 text-xs">
              <SaveIcon className={`h-4 w-4 ${saveInfo.className}`} />
              <span className="text-slate-300 font-medium">{saveInfo.label}</span>
            </div>
            
            <a
              href={`/live/${webinar.code}/${webinar.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/5 px-4 py-2 text-sm font-medium text-white transition-all shadow-sm"
            >
              <ExternalLink className="h-4 w-4" /> 
              Ver Página
            </a>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center items-start">
          <div className="w-full max-w-[1200px] shadow-2xl rounded-2xl overflow-hidden border border-slate-800/60 ring-1 ring-white/5">
            <WebinarPreview />
          </div>
        </div>
      </div>

    </div>
  );
}
