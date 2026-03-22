"use client";

import type { ChangeEvent, WheelEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Upload } from "lucide-react";

export interface Sponsor {
  name: string;
  logoUrl: string;
}

interface SponsorsListProps {
  sponsors: Sponsor[];
  onChange: (sponsors: Sponsor[]) => void;
}

export function SponsorsList({ sponsors, onChange }: SponsorsListProps) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [logoTileScale, setLogoTileScale] = useState(1);

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

  const logoWheelDeltaRef = useRef(0);
  const logoWheelRafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (logoWheelRafRef.current) cancelAnimationFrame(logoWheelRafRef.current);
    };
  }, []);

  const handleWheelZoom = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const direction = e.deltaY < 0 ? 1 : -1; // scroll para cima aumenta, para baixo diminui
    logoWheelDeltaRef.current += direction;
    if (logoWheelRafRef.current) return;

    logoWheelRafRef.current = requestAnimationFrame(() => {
      setLogoTileScale((prev) => clamp(prev + logoWheelDeltaRef.current * 0.08, 0.75, 1.8));
      logoWheelDeltaRef.current = 0;
      logoWheelRafRef.current = null;
    });
  };

  const tileBase = 48; // h-12 w-12
  const logoBase = 40; // h-10
  const placeholderBase = 24; // h-6 w-6
  const tileSize = Math.round(tileBase * logoTileScale);
  const logoSize = Math.round(logoBase * logoTileScale);
  const placeholderSize = Math.round(placeholderBase * logoTileScale);

  async function uploadLogo(file: File, index: number) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (!res.ok) return;

    const data = await res.json();
    const url: string = data.url;

    const updated = sponsors.map((s, i) => (i === index ? { ...s, logoUrl: url } : s));
    onChange(updated);
  }

  function pickFile(index: number) {
    setActiveIndex(index);
    logoInputRef.current?.click();
  }

  async function handleLogoFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (activeIndex === null) return;

    // Permite selecionar o mesmo arquivo novamente.
    e.target.value = "";
    await uploadLogo(file, activeIndex);
  }

  function add() {
    onChange([...sponsors, { name: "", logoUrl: "" }]);
  }

  function remove(index: number) {
    onChange(sponsors.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-400">Patrocinadores</p>
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1 rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700"
        >
          <Plus className="h-3 w-3" /> Adicionar
        </button>
      </div>

      <input
        ref={logoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleLogoFile}
      />

      {sponsors.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sponsors.map((sponsor, i) => (
            <div
              key={i}
              className="flex w-full items-center gap-2 rounded-md border border-slate-700 bg-slate-900/40 p-2"
            >
              <div
                className="flex items-center justify-center rounded bg-slate-900/60"
                style={{ width: tileSize, height: tileSize }}
                onWheel={handleWheelZoom}
                role="group"
                aria-label="Zoom da logo do patrocinador (use scroll do mouse)"
              >
                {sponsor.logoUrl ? (
                  <img
                    src={sponsor.logoUrl}
                    alt="Logo patrocinador"
                    className="w-auto object-contain"
                    style={{ height: logoSize, maxWidth: tileSize }}
                  />
                ) : (
                  <div
                    className="rounded bg-white/10"
                    style={{ width: placeholderSize, height: placeholderSize }}
                  />
                )}
              </div>

              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => pickFile(i)}
                  className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700"
                >
                  <Upload className="h-3 w-3" />
                  {sponsor.logoUrl ? "Trocar" : "Enviar"}
                </button>

                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="inline-flex items-center justify-center text-xs text-slate-500 hover:text-red-400"
                  aria-label="Remover patrocinador"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
