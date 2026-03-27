"use client";

import type { WheelEvent } from "react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { SponsorsList, type Sponsor } from "./SponsorsList";
import type { WebinarConfig } from "@/lib/webinar-templates";
import { formatWebinarStartLabelPtBr } from "@/lib/webinar-timing";

interface RegistrationPagePreviewProps {
  bgImage?: string;
  bgPosition?: { x: number; y: number };
  logoUrl?: string;
  description?: string;
  title?: string;
  ctaText?: string;
  sponsors?: Sponsor[];
  primaryColor?: string;
  /** Data/hora de início (mesmas props do webinar) — sincroniza com Configurações gerais */
  eventStartDate?: string;
  eventStartTime?: string;
  countdown?: WebinarConfig["countdown"];
  logoPosition?: "left" | "center";
  logoSize?: "sm" | "md" | "lg";
  overlayOpacity?: number;
  overlayTintColor?: string;
  formSubtitle?: string;
  onLogoPick?: () => void;
  onLogoDrop?: (file: File) => void;
  onTitleChange?: (value: string) => void;
  onDescriptionChange?: (value: string) => void;
  onCtaTextChange?: (value: string) => void;
  onFormSubtitleChange?: (value: string) => void;
  onSponsorsChange?: (value: Sponsor[]) => void;
}

export function RegistrationPagePreview({
  bgImage,
  bgPosition,
  logoUrl,
  description,
  title,
  ctaText,
  sponsors = [],
  primaryColor = "#8B0000",
  eventStartDate,
  eventStartTime,
  countdown,
  logoSize = "md",
  overlayOpacity = 0.5,
  overlayTintColor = "#000000",
  formSubtitle = "",
  onLogoPick,
  onLogoDrop,
  onTitleChange,
  onDescriptionChange,
  onCtaTextChange,
  onFormSubtitleChange,
  onSponsorsChange,
}: RegistrationPagePreviewProps) {
  const titleSafe = title ?? "";
  const descriptionSafe = description ?? "";
  const ctaTextSafe = ctaText ?? "";

  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editingCta, setEditingCta] = useState(false);
  const [editingFormSubtitle, setEditingFormSubtitle] = useState(false);
  const [editingSponsors, setEditingSponsors] = useState(false);
  const [logoScale, setLogoScale] = useState(1);
  const [sponsorTileScale, setSponsorTileScale] = useState(1);

  const [titleDraft, setTitleDraft] = useState(titleSafe);
  const [descriptionDraft, setDescriptionDraft] = useState(descriptionSafe);
  const [ctaDraft, setCtaDraft] = useState(ctaTextSafe);
  const [formSubtitleDraft, setFormSubtitleDraft] = useState(formSubtitle);

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

  const logoWheelDeltaRef = useRef(0);
  const logoWheelRafRef = useRef<number | null>(null);
  const sponsorWheelDeltaRef = useRef(0);
  const sponsorWheelRafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (logoWheelRafRef.current) cancelAnimationFrame(logoWheelRafRef.current);
      if (sponsorWheelRafRef.current) cancelAnimationFrame(sponsorWheelRafRef.current);
    };
  }, []);

  useEffect(() => {
    setFormSubtitleDraft(formSubtitle);
  }, [formSubtitle]);

  const handleLogoWheelZoom = (e: WheelEvent) => {
    e.preventDefault();
    const direction = e.deltaY < 0 ? 1 : -1; // scroll para cima aumenta
    logoWheelDeltaRef.current += direction;
    if (logoWheelRafRef.current) return;

    logoWheelRafRef.current = requestAnimationFrame(() => {
      setLogoScale((prev) =>
        clamp(prev + logoWheelDeltaRef.current * 0.08, 0.75, 2)
      );
      logoWheelDeltaRef.current = 0;
      logoWheelRafRef.current = null;
    });
  };
  const handleSponsorWheelZoom = (e: WheelEvent) => {
    e.preventDefault();
    const direction = e.deltaY < 0 ? 1 : -1;
    sponsorWheelDeltaRef.current += direction;
    if (sponsorWheelRafRef.current) return;

    sponsorWheelRafRef.current = requestAnimationFrame(() => {
      setSponsorTileScale((prev) =>
        clamp(prev + sponsorWheelDeltaRef.current * 0.08, 0.75, 2)
      );
      sponsorWheelDeltaRef.current = 0;
      sponsorWheelRafRef.current = null;
    });
  };

  const baseLogoHeight = logoSize === "sm" ? 32 : logoSize === "lg" ? 56 : 40; // h-8/h-14/h-10
  const logoHeight = Math.round(baseLogoHeight * logoScale);
  const placeholderRatio = 2.4; // w-24 / h-10 (aprox)
  const placeholderHeight = logoHeight;
  const placeholderWidth = Math.round(logoHeight * placeholderRatio);

  const sponsorTileBase = 24; // h-6 w-6
  const sponsorLogoBase = 16; // h-4 w-4
  const sponsorTileSize = Math.round(sponsorTileBase * sponsorTileScale);
  const sponsorLogoSize = Math.round(sponsorLogoBase * sponsorTileScale);
  const bgPositionCss =
    bgPosition && Number.isFinite(bgPosition.x) && Number.isFinite(bgPosition.y)
      ? `${bgPosition.x * 100}% ${bgPosition.y * 100}%`
      : "center";

  const resolvedCtaText = useMemo(() => ctaTextSafe || "Ir para o webinar!", [ctaTextSafe]);
  const resolvedFormSubtitle = useMemo(
    () => formSubtitle.trim() || "Texto de apoio do formulário (edite na configuração).",
    [formSubtitle],
  );
  const resolvedTitle = useMemo(() => titleSafe || "Insira aqui o título da captura", [titleSafe]);
  const resolvedDescription = useMemo(
    () => descriptionSafe || "Texto descritivo do seu webinar aparecerá aqui.",
    [descriptionSafe]
  );

  const eventStartLabel = useMemo(
    () => formatWebinarStartLabelPtBr(eventStartDate || null, eventStartTime || null),
    [eventStartDate, eventStartTime],
  );

  const showCountdownBanner =
    Boolean(countdown?.enabled && countdown?.showOnCapture && eventStartDate);

  function commitTitle() {
    setEditingTitle(false);
    onTitleChange?.(titleDraft);
  }

  function commitDescription() {
    setEditingDescription(false);
    onDescriptionChange?.(descriptionDraft);
  }

  function commitCta() {
    setEditingCta(false);
    onCtaTextChange?.(ctaDraft);
  }

  function commitFormSubtitle() {
    setEditingFormSubtitle(false);
    onFormSubtitleChange?.(formSubtitleDraft);
  }

  const canEditTitle = Boolean(onTitleChange);
  const canEditDescription = Boolean(onDescriptionChange);
  const canEditCta = Boolean(onCtaTextChange);
  const canEditFormSubtitle = Boolean(onFormSubtitleChange);
  const canEditSponsors = Boolean(onSponsorsChange);
  const hasSponsorLogos = sponsors.some((s) => Boolean(s.logoUrl));

  return (
    <div
      className="group relative flex min-h-[360px] w-full flex-col overflow-hidden rounded-xl bg-zinc-950 transition-all duration-300 lg:min-h-[420px] lg:flex-row"
      style={{
        backgroundImage: bgImage ? `url(${bgImage})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: bgImage ? bgPositionCss : undefined,
        backgroundColor: bgImage ? undefined : "#0a0a0a",
      }}
    >
      <div className="relative z-10 flex h-full w-full min-w-0 flex-col lg:flex-row">
        {/* Card esquerdo */}
        <div
          className={`relative min-w-0 flex flex-1 flex-col justify-between gap-3 p-4 sm:p-5 ${
            overlayOpacity > 0 ? "backdrop-blur-[1px]" : ""
          } transition-all duration-300`}
        >
          {bgImage && (
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to bottom right, color-mix(in srgb, ${overlayTintColor} 72%, transparent), color-mix(in srgb, ${overlayTintColor} 42%, transparent), color-mix(in srgb, ${overlayTintColor} 48%, transparent))`,
                opacity: Math.min(1, Math.max(0.1, overlayOpacity)),
              }}
            />
          )}
          <div className="relative z-10 space-y-3 transition-all duration-300 group-hover:translate-y-[-2px]">
            {(showCountdownBanner || eventStartLabel) && (
              <div className="space-y-0.5">
                {showCountdownBanner && (
                  <p className="text-[10px] font-medium text-white/95 sm:text-xs">{countdown!.message}</p>
                )}
                {eventStartLabel && (
                  <p className="text-[10px] text-white/80 sm:text-[11px]">Início: {eventStartLabel}</p>
                )}
              </div>
            )}
          {/* Centraliza sempre a logo no preview */}
          <div className="flex w-full items-center justify-start">
            {onLogoPick ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onLogoPick();
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file && onLogoDrop) onLogoDrop(file);
                }}
                className="inline-flex w-full items-center justify-start rounded-sm outline-none"
                aria-label="Selecionar logo"
                onWheel={handleLogoWheelZoom}
              >
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt="Logo"
                    className="w-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                    style={{ height: logoHeight }}
                    width={0}
                    height={0}
                    sizes="100vw"
                  />
                ) : (
                  <div
                    className="rounded bg-white/20"
                    style={{ height: placeholderHeight, width: placeholderWidth }}
                  />
                )}
              </button>
            ) : logoUrl ? (
              <Image
                src={logoUrl}
                alt="Logo"
                className="w-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                style={{ height: logoHeight }}
                onWheel={handleLogoWheelZoom}
                width={0}
                height={0}
                sizes="100vw"
              />
            ) : (
              <div
                className="rounded bg-white/20"
                style={{ height: placeholderHeight, width: placeholderWidth }}
                onWheel={handleLogoWheelZoom}
              />
            )}
          </div>
          {/* Descrição (clicável para editar) */}
          {canEditDescription ? (
            editingDescription ? (
              <div
                onClick={(e) => e.stopPropagation()}
                className="rounded-md border border-white/20 bg-black/20 p-2 sm:p-2"
              >
                <textarea
                  value={descriptionDraft}
                  onChange={(e) => setDescriptionDraft(e.target.value)}
                  onBlur={commitDescription}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setEditingDescription(false);
                      setDescriptionDraft(descriptionSafe);
                    }
                    // Ctrl/Cmd+Enter para salvar
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      commitDescription();
                    }
                  }}
                  rows={3}
                  autoFocus
                  className="w-full resize-none rounded-md bg-slate-900/30 px-2 py-1 text-xs sm:text-sm text-white/90 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-primary/60"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDescriptionDraft(descriptionSafe);
                  setEditingDescription(true);
                }}
                className="text-left text-xs sm:text-sm text-white/90 leading-relaxed"
              >
                {resolvedDescription}
              </button>
            )
          ) : (
            <p className="text-xs sm:text-sm text-white/90 leading-relaxed">{resolvedDescription}</p>
          )}
          </div>

          {/* Patrocinadores (clicáveis para editar) */}
          {canEditSponsors ? (
            editingSponsors ? (
              <div
                onClick={(e) => e.stopPropagation()}
                className="max-h-[40vh] overflow-y-auto rounded-md border border-white/20 bg-black/20 p-3 sm:max-h-[55vh]"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-medium text-white/70">Patrocinadores</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingSponsors(false);
                    }}
                    className="text-xs text-white/60 hover:text-white/90"
                  >
                    Fechar
                  </button>
                </div>
                <SponsorsList sponsors={sponsors} onChange={onSponsorsChange!} />
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingSponsors(true);
                }}
                className="relative z-10 flex w-full flex-col items-start justify-center gap-1 border-t border-white/20 pt-2 text-left transition-all duration-300 hover:border-white/35"
              >
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/60">Patrocinadores</p>
                {hasSponsorLogos ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {sponsors.map((s, i) =>
                      s.logoUrl ? (
                        <div
                          key={i}
                          className="flex items-center justify-center overflow-hidden rounded-md border border-white/20 bg-white/10"
                          aria-label={s.name || "Logo patrocinador"}
                          style={{ width: sponsorTileSize, height: sponsorTileSize }}
                          onWheel={handleSponsorWheelZoom}
                        >
                          <Image
                            src={s.logoUrl}
                            alt={s.name || "Logo patrocinador"}
                            className="object-contain brightness-0 invert"
                            style={{ width: sponsorLogoSize, height: sponsorLogoSize }}
                            width={0}
                            height={0}
                            sizes="100vw"
                          />
                        </div>
                      ) : (
                        <div
                          key={i}
                          className="flex items-center justify-center overflow-hidden rounded-md border border-white/20 bg-white/10"
                          aria-hidden="true"
                          style={{ width: sponsorTileSize, height: sponsorTileSize }}
                          onWheel={handleSponsorWheelZoom}
                        >
                          <div
                            className="rounded bg-white/10"
                            style={{ width: sponsorLogoSize, height: sponsorLogoSize }}
                          />
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-white/60">Adicionar patrocinadores</span>
                )}
              </button>
            )
          ) : hasSponsorLogos ? (
            <div className="relative z-10 flex flex-col items-start gap-1 border-t border-white/20 pt-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/60">Patrocinadores</p>
              <div className="flex flex-wrap items-center gap-2">
                {sponsors.map((s, i) =>
                  s.logoUrl ? (
                    <div
                      key={i}
                      className="flex items-center justify-center overflow-hidden rounded-md border border-white/20 bg-white/10"
                      aria-label={s.name || "Logo patrocinador"}
                      style={{ width: sponsorTileSize, height: sponsorTileSize }}
                      onWheel={handleSponsorWheelZoom}
                    >
                      <Image
                        src={s.logoUrl}
                        alt={s.name || "Logo patrocinador"}
                        className="object-contain brightness-0 invert"
                        style={{ width: sponsorLogoSize, height: sponsorLogoSize }}
                        width={0}
                        height={0}
                        sizes="100vw"
                      />
                    </div>
                  ) : (
                    <div
                      key={i}
                      className="flex items-center justify-center overflow-hidden rounded-md border border-white/20 bg-white/10"
                      aria-hidden="true"
                      style={{ width: sponsorTileSize, height: sponsorTileSize }}
                      onWheel={handleSponsorWheelZoom}
                    >
                      <div
                        className="rounded bg-white/10"
                        style={{ width: sponsorLogoSize, height: sponsorLogoSize }}
                      />
                    </div>
                  )
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Card direito */}
        <div className="min-w-0 flex flex-1 flex-col justify-center gap-3 bg-zinc-900 px-4 py-5 transition-all duration-300 group-hover:bg-zinc-900/95 sm:px-5">
          {editingTitle && canEditTitle ? (
            <div onClick={(e) => e.stopPropagation()}>
              <input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setEditingTitle(false);
                    setTitleDraft(titleSafe);
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitTitle();
                  }
                }}
                autoFocus
                className="w-full rounded-md border border-white/20 bg-zinc-800 px-2 py-1 text-xs sm:text-sm font-bold text-white outline-none ring-primary focus:ring-2"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                if (!onTitleChange) return;
                e.stopPropagation();
                setTitleDraft(titleSafe);
                setEditingTitle(true);
              }}
              className="text-left text-xs sm:text-sm font-bold text-white"
              disabled={!onTitleChange}
            >
              {resolvedTitle}
            </button>
          )}
          {canEditFormSubtitle ? (
            editingFormSubtitle ? (
              <div onClick={(e) => e.stopPropagation()}>
                <textarea
                  value={formSubtitleDraft}
                  onChange={(e) => setFormSubtitleDraft(e.target.value)}
                  onBlur={commitFormSubtitle}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setEditingFormSubtitle(false);
                      setFormSubtitleDraft(formSubtitle);
                    }
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      commitFormSubtitle();
                    }
                  }}
                  rows={2}
                  autoFocus
                  className="w-full resize-none rounded-md border border-white/20 bg-zinc-800 px-2 py-1 text-[11px] text-white/80 outline-none ring-primary focus:ring-2"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFormSubtitleDraft(formSubtitle);
                  setEditingFormSubtitle(true);
                }}
                className="text-left text-[11px] leading-relaxed text-white/50"
              >
                {formSubtitle.trim() ? formSubtitle : resolvedFormSubtitle}
              </button>
            )
          ) : (
            <p className="text-[11px] leading-relaxed text-white/50">{resolvedFormSubtitle}</p>
          )}
          <div className="space-y-2">
            <div className="space-y-1">
              <label className="block text-[10px] uppercase tracking-[0.16em] text-white/60">Nome *</label>
              <div className="h-8 w-full border-b border-white/30 bg-transparent transition-all duration-300 group-hover:border-white/45" />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] uppercase tracking-[0.16em] text-white/60">E-mail *</label>
              <div className="h-8 w-full border-b border-white/30 bg-transparent transition-all duration-300 group-hover:border-white/45" />
            </div>
          </div>
          {/* CTA (clicável para editar) */}
          {editingCta && canEditCta ? (
            <div onClick={(e) => e.stopPropagation()}>
              <input
                value={ctaDraft}
                onChange={(e) => setCtaDraft(e.target.value)}
                onBlur={commitCta}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setEditingCta(false);
                    setCtaDraft(ctaTextSafe);
                  }
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitCta();
                  }
                }}
                autoFocus
                className="w-full rounded-md border border-white/20 bg-zinc-800 px-3 py-2 text-xs sm:text-sm font-semibold text-white outline-none ring-primary focus:ring-2"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                if (!onCtaTextChange) return;
                e.stopPropagation();
                setCtaDraft(ctaTextSafe);
                setEditingCta(true);
              }}
              className="w-full rounded-xl py-2 text-xs sm:text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:brightness-110"
              style={{ backgroundColor: primaryColor }}
              disabled={!onCtaTextChange}
            >
              {resolvedCtaText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
