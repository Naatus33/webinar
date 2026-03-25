"use client";

import { useRef } from "react";
import { type Sponsor } from "./SponsorsList";
import { RegistrationPagePreview } from "./RegistrationPagePreview";
import type { WebinarConfig } from "@/lib/webinar-templates";

interface RegistrationPageTabProps {
  bgImage: string;
  bgPosition?: { x: number; y: number };
  logoUrl: string;
  description: string;
  title: string;
  ctaText: string;
  sponsors: Sponsor[];
  primaryColor: string;
  eventStartDate: string;
  eventStartTime: string;
  countdown: WebinarConfig["countdown"];
  onChange: (field: string, value: unknown) => void;
}

export function RegistrationPageTab({
  bgImage,
  bgPosition,
  logoUrl,
  description,
  title,
  ctaText,
  sponsors,
  primaryColor,
  eventStartDate,
  eventStartTime,
  countdown,
  onChange,
}: RegistrationPageTabProps) {
  const bgInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const effectiveBgPosition = bgPosition ?? { x: 0.5, y: 0.5 };

  async function handleUpload(file: File, field: string, webinarId?: string) {
    const formData = new FormData();
    formData.append("file", file);
    if (webinarId) formData.append("webinarId", webinarId);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (res.ok) {
      const data = await res.json();
      onChange(field, data.url);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-50">Página de Cadastro</h2>
        <p className="text-sm text-slate-400">
          Personalize a aparência da página onde o lead se inscreve.
        </p>
      </div>

      {/* Preview */}
      <div
        role="button"
        tabIndex={0}
        className="cursor-pointer"
        onClick={() => bgInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") bgInputRef.current?.click();
        }}
        onDragOver={(e) => {
          // Permite o drop.
          e.preventDefault();
        }}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (!file) return;

          const rect = e.currentTarget.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width;
          const y = (e.clientY - rect.top) / rect.height;
          const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
          const nextPos = { x: clamp01(x), y: clamp01(y) };

          onChange("regBgPosition", nextPos);
          handleUpload(file, "regBgImage");
        }}
      >
        <RegistrationPagePreview
          bgImage={bgImage}
          bgPosition={effectiveBgPosition}
          logoUrl={logoUrl}
          description={description}
          title={title}
          ctaText={ctaText}
          sponsors={sponsors}
          primaryColor={primaryColor}
          eventStartDate={eventStartDate}
          eventStartTime={eventStartTime}
          countdown={countdown}
          logoPosition="left"
          logoSize="md"
          overlayOpacity={0.5}
          onLogoPick={() => logoInputRef.current?.click()}
          onLogoDrop={(file) => handleUpload(file, "regLogoUrl")}
          onTitleChange={(value) => onChange("regTitle", value)}
          onDescriptionChange={(value) => onChange("regDescription", value)}
          onCtaTextChange={(value) => onChange("regCtaText", value)}
          onSponsorsChange={(value) => onChange("regSponsors", value)}
        />
      </div>

      {/* Inputs ocultos: personalização 100% via preview */}
      <input
        ref={bgInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file, "regBgImage");
        }}
      />
      <input
        ref={logoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file, "regLogoUrl");
        }}
      />
    </div>
  );
}
