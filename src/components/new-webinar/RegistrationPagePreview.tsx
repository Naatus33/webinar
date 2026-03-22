"use client";

import type { WheelEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SponsorsList, type Sponsor } from "./SponsorsList";

interface RegistrationPagePreviewProps {
  bgImage?: string;
  bgPosition?: { x: number; y: number };
  logoUrl?: string;
  description?: string;
  title?: string;
  ctaText?: string;
  sponsors?: Sponsor[];
  primaryColor?: string;
  logoPosition?: "left" | "center";
  logoSize?: "sm" | "md" | "lg";
  overlayOpacity?: number;
  onLogoPick?: () => void;
  onLogoDrop?: (file: File) => void;
  onTitleChange?: (value: string) => void;
  onDescriptionChange?: (value: string) => void;
  onCtaTextChange?: (value: string) => void;
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
  primaryColor = "#7C3AED",
  logoSize = "md",
  overlayOpacity = 0.5,
  onLogoPick,
  onLogoDrop,
  onTitleChange,
  onDescriptionChange,
  onCtaTextChange,
  onSponsorsChange,
}: RegistrationPagePreviewProps) {
  const titleSafe = title ?? "";
  const descriptionSafe = description ?? "";
  const ctaTextSafe = ctaText ?? "";

  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editingCta, setEditingCta] = useState(false);
  const [editingSponsors, setEditingSponsors] = useState(false);
  const [logoScale, setLogoScale] = useState(1);
  const [sponsorTileScale, setSponsorTileScale] = useState(1);

  const [titleDraft, setTitleDraft] = useState(titleSafe);
  const [descriptionDraft, setDescriptionDraft] = useState(descriptionSafe);
  const [ctaDraft, setCtaDraft] = useState(ctaTextSafe);

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
  const resolvedTitle = useMemo(() => titleSafe || "Insira aqui o título da captura", [titleSafe]);
  const resolvedDescription = useMemo(
    () => descriptionSafe || "Texto descritivo do seu webinar aparecerá aqui.",
    [descriptionSafe]
  );

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

  const canEditTitle = Boolean(onTitleChange);
  const canEditDescription = Boolean(onDescriptionChange);
  const canEditCta = Boolean(onCtaTextChange);
  const canEditSponsors = Boolean(onSponsorsChange);
  const hasSponsorLogos = sponsors.some((s) => Boolean(s.logoUrl));

  return (
    <div
      className="relative flex min-h-[360px] w-full items-center justify-center overflow-hidden rounded-xl p-3 sm:min-h-[420px] sm:p-6"
      style={{
        backgroundImage: bgImage ? `url(${bgImage})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: bgImage ? bgPositionCss : undefined,
        backgroundColor: bgImage ? undefined : "#1e293b",
      }}
    >
      {/* Overlay escuro se tiver imagem */}
      {bgImage && (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity})` }}
        />
      )}

      <div className="relative z-10 flex w-full max-w-2xl min-w-0 gap-2 sm:gap-4">
        {/* Card esquerdo */}
        <div
          className={`min-w-0 flex flex-1 flex-col gap-2 rounded-xl p-3 sm:gap-3 sm:p-4 ${
            overlayOpacity > 0 ? "backdrop-blur-sm" : ""
          } ${overlayOpacity > 0 ? "bg-white/10" : "bg-slate-900/40"}`}
        >
          {/* Centraliza sempre a logo no preview */}
          <div className="flex w-full items-center justify-center">
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
                className={`inline-flex w-full items-center ${
                  "justify-center"
                } rounded-sm outline-none`}
                aria-label="Selecionar logo"
                onWheel={handleLogoWheelZoom}
              >
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="w-auto object-contain"
                    style={{ height: logoHeight }}
                  />
                ) : (
                  <div
                    className="rounded bg-white/20"
                    style={{ height: placeholderHeight, width: placeholderWidth }}
                  />
                )}
              </button>
            ) : logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="w-auto object-contain"
                style={{ height: logoHeight }}
                onWheel={handleLogoWheelZoom}
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
                  className="w-full resize-none rounded-md bg-slate-900/30 px-2 py-1 text-xs sm:text-sm text-white/90 outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-violet-500/60"
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
                className="text-left text-xs sm:text-sm text-white/80 leading-relaxed"
              >
                {resolvedDescription}
              </button>
            )
          ) : (
            <p className="text-xs sm:text-sm text-white/80 leading-relaxed">{resolvedDescription}</p>
          )}

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
                className="flex w-full flex-col items-center justify-center gap-1 border-t border-white/20 pt-2 text-center"
              >
                <p className="text-[10px] text-white/50">Realização:</p>
                {hasSponsorLogos ? (
                  <div className="grid grid-cols-4 gap-2 place-items-center sm:grid-cols-3">
                    {sponsors.map((s, i) =>
                      s.logoUrl ? (
                        <div
                          key={i}
                          className="flex items-center justify-center overflow-hidden rounded-md border border-white/20 bg-white/10"
                          aria-label={s.name || "Logo patrocinador"}
                          style={{ width: sponsorTileSize, height: sponsorTileSize }}
                          onWheel={handleSponsorWheelZoom}
                        >
                          <img
                            src={s.logoUrl}
                            alt={s.name || "Logo patrocinador"}
                            className="object-contain"
                            style={{ width: sponsorLogoSize, height: sponsorLogoSize }}
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
            <div className="flex flex-col items-center gap-1 border-t border-white/20 pt-2">
              <p className="text-[10px] text-white/50">Realização:</p>
              <div className="grid grid-cols-4 gap-2 place-items-center sm:grid-cols-3">
                {sponsors.map((s, i) =>
                  s.logoUrl ? (
                    <div
                      key={i}
                      className="flex items-center justify-center overflow-hidden rounded-md border border-white/20 bg-white/10"
                      aria-label={s.name || "Logo patrocinador"}
                      style={{ width: sponsorTileSize, height: sponsorTileSize }}
                      onWheel={handleSponsorWheelZoom}
                    >
                      <img
                        src={s.logoUrl}
                        alt={s.name || "Logo patrocinador"}
                        className="object-contain"
                        style={{ width: sponsorLogoSize, height: sponsorLogoSize }}
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
        <div className="min-w-0 flex flex-1 flex-col gap-2 rounded-xl bg-white/95 p-3 shadow-lg sm:gap-3 sm:p-4">
          {/* Título (clicável para editar) */}
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
                className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs sm:text-sm font-bold text-slate-800 outline-none ring-violet-500 focus:ring-2"
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
              className="text-left text-xs sm:text-sm font-bold text-slate-800"
              disabled={!onTitleChange}
            >
              {resolvedTitle}
            </button>
          )}
          <div className="space-y-2">
            <div className="space-y-1">
              <label className="block text-[10px] text-slate-500">Nome *</label>
              <div className="h-8 w-full rounded-md border border-slate-200 bg-slate-50" />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] text-slate-500">E-mail *</label>
              <div className="h-8 w-full rounded-md border border-slate-200 bg-slate-50" />
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
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 outline-none ring-violet-500 focus:ring-2"
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
              className="w-full rounded-lg py-2 text-xs sm:text-sm font-semibold text-white shadow"
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
