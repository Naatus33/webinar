"use client";

import { useRef } from "react";
import { HexColorPicker } from "react-colorful";
import { useState } from "react";
import { useWebinarStore } from "@/store/useWebinarStore";
import { Upload } from "lucide-react";

export function BrandingPanel() {
  const { config, updateConfig } = useWebinarStore();
  const { branding } = config;
  const [colorPicker, setColorPicker] = useState<"primary" | "secondary" | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  async function handleLogoUpload(file: File) {
    const { webinarId } = useWebinarStore.getState();
    const formData = new FormData();
    formData.append("file", file);
    if (webinarId) formData.append("webinarId", webinarId);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (res.ok) {
      const data = await res.json();
      updateConfig("branding", { logo: data.url });
    }
  }

  return (
    <div className="space-y-5 p-5">
      <div>
        <h3 className="text-sm font-semibold text-slate-200">Branding</h3>
        <p className="text-xs text-slate-500">Logo e cores principais do webinar.</p>
      </div>

      {/* Logo */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-slate-400">Logo</label>
        <button
          type="button"
          onClick={() => logoRef.current?.click()}
          className="flex h-20 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-700 text-sm text-slate-500 hover:border-slate-500 hover:text-slate-300"
        >
          {branding.logo ? (
            <img src={branding.logo} alt="Logo" className="h-full w-auto object-contain p-2" />
          ) : (
            <>
              <Upload className="h-4 w-4" /> Enviar logo
            </>
          )}
        </button>
        <input
          ref={logoRef}
          type="file"
          className="hidden"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleLogoUpload(f);
          }}
        />
      </div>

      {/* Cor primária */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-slate-400">Cor primária</label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setColorPicker(colorPicker === "primary" ? null : "primary")}
            className="flex h-9 w-full items-center gap-3 rounded-md border border-slate-700 bg-slate-900 px-3"
          >
            <span
              className="h-5 w-5 flex-shrink-0 rounded-full border border-slate-600"
              style={{ backgroundColor: branding.primaryColor }}
            />
            <span className="text-sm text-slate-300">{branding.primaryColor}</span>
          </button>
          {colorPicker === "primary" && (
            <div className="absolute left-0 top-10 z-20 rounded-xl bg-slate-800 p-3 shadow-xl">
              <HexColorPicker
                color={branding.primaryColor}
                onChange={(c) => updateConfig("branding", { primaryColor: c })}
              />
            </div>
          )}
        </div>
      </div>

      {/* Cor secundária */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-slate-400">Cor secundária</label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setColorPicker(colorPicker === "secondary" ? null : "secondary")}
            className="flex h-9 w-full items-center gap-3 rounded-md border border-slate-700 bg-slate-900 px-3"
          >
            <span
              className="h-5 w-5 flex-shrink-0 rounded-full border border-slate-600"
              style={{ backgroundColor: branding.secondaryColor }}
            />
            <span className="text-sm text-slate-300">{branding.secondaryColor}</span>
          </button>
          {colorPicker === "secondary" && (
            <div className="absolute left-0 top-10 z-20 rounded-xl bg-slate-800 p-3 shadow-xl">
              <HexColorPicker
                color={branding.secondaryColor}
                onChange={(c) => updateConfig("branding", { secondaryColor: c })}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
