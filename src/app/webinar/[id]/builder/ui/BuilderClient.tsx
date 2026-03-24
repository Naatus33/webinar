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
  idle: { label: "Todas alterações salvas", Icon: CheckCircle2, className: "text-muted-foreground" },
  saving: { label: "Salvando alterações...", Icon: Loader2, className: "animate-spin text-primary" },
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
      webinar.config
    );
  }, [webinar.id, loadFromServer, webinar]);

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

  const configSidebar = (
    <>
      <div className="border-b border-border/70 p-4 md:p-5">
        <h2 className="text-lg font-bold tracking-tight text-foreground">{currentCategoryObj?.label}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{currentCategoryObj?.description}</p>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto overscroll-contain p-2 md:p-3">
        <div className="flex gap-2 overflow-x-auto pb-2 md:hidden">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryChange(cat.id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium motion-transition motion-safe:active:scale-[0.98] ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        <div className="space-y-1">
          {currentCategoryTabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium motion-transition md:px-4 md:py-3 ${
                activeTab === id
                  ? "border border-border/80 bg-card text-primary shadow-sm"
                  : "border border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${activeTab === id ? "text-primary" : "text-muted-foreground"}`} />
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 border-t border-border/60 pt-4">
          <ActivePanel />
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background font-sans md:flex-row">
      {/* Rail categorias — desktop */}
      <div className="relative z-10 hidden w-[80px] flex-shrink-0 flex-col items-center border-r border-border/80 bg-card/40 py-4 md:flex">
        <Link
          href="/dashboard"
          className="mb-8 flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground motion-transition hover:bg-muted hover:text-foreground"
          title="Voltar ao Dashboard"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>

        <div className="flex flex-col gap-4">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryChange(cat.id)}
                title={cat.label}
                className={`group relative flex h-12 w-12 items-center justify-center rounded-2xl motion-transition motion-safe:active:scale-95 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-[0_0_24px_rgba(249,177,122,0.35)]"
                    : "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 transition-transform duration-[var(--motion-duration-normal,220ms)] ${isActive ? "scale-110" : "scale-100 group-hover:scale-105"}`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Painel de configuração */}
      <div className="relative z-10 flex max-h-[42vh] min-h-0 w-full flex-shrink-0 flex-col border-border/80 bg-card/30 md:max-h-none md:h-full md:w-[min(100%,380px)] md:border-r">
        {configSidebar}
      </div>

      {/* Preview */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[url('/grid-bg.svg')] bg-center bg-muted/20">
        <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b border-border/70 bg-card/85 px-3 py-3 backdrop-blur-md md:px-6 md:py-4">
          <div className="flex min-w-0 items-center gap-2 md:gap-3">
            <div className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500 motion-reduce:animate-none" />
            <span className="truncate text-xs font-medium text-muted-foreground md:text-sm">
              Preview em tempo real
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2 md:gap-4">
            <div className="hidden items-center gap-2 rounded-full border border-border/80 bg-muted/40 px-2.5 py-1.5 text-xs sm:flex">
              <SaveIcon className={`h-4 w-4 ${saveInfo.className}`} />
              <span className="font-medium text-foreground">{saveInfo.label}</span>
            </div>

            <a
              href={`/live/${webinar.code}/${webinar.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-xs font-medium text-foreground motion-transition motion-safe:hover:bg-muted/60 md:gap-2 md:text-sm"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">Ver Página</span>
              <span className="sm:hidden">Abrir</span>
            </a>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 justify-center overflow-y-auto p-3 sm:p-6 md:p-8">
          <div className="w-full max-w-[1200px] overflow-hidden rounded-2xl border border-border/70 bg-background/40 shadow-2xl ring-1 ring-border/30 motion-safe:transition-shadow motion-safe:hover:shadow-[0_24px_64px_rgba(0,0,0,0.35)]">
            <WebinarPreview />
          </div>
        </div>
      </div>
    </div>
  );
}
