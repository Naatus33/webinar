"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface GeneralSettingsTabProps {
  name: string;
  slug: string;
  videoUrl: string;
  startDate: string;
  startTime: string;
  useNativeStreaming: boolean;
  code: string;
  onChangeName: (v: string) => void;
  onChangeSlug: (v: string) => void;
  onChangeVideoUrl: (v: string) => void;
  onChangeStartDate: (v: string) => void;
  onChangeStartTime: (v: string) => void;
  onChangeNativeStreaming: (v: boolean) => void;
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function GeneralSettingsTab({
  name,
  slug,
  videoUrl,
  startDate,
  startTime,
  useNativeStreaming,
  code,
  onChangeName,
  onChangeSlug,
  onChangeVideoUrl,
  onChangeStartDate,
  onChangeStartTime,
  onChangeNativeStreaming,
}: GeneralSettingsTabProps) {
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  useEffect(() => {
    let active = true;

    if (!slug) {
      if (slugStatus !== "idle") setSlugStatus("idle");
      return;
    }
    
    if (slugStatus !== "checking") setSlugStatus("checking");

    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/webinars/check-slug?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();
        if (active) {
          setSlugStatus(data.available ? "available" : "taken");
        }
      } catch (err) {
         console.error(err);
         if (active) setSlugStatus("idle");
      }
    }, 600);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  function handleNameChange(value: string) {
    onChangeName(value);
    onChangeSlug(toSlug(value));
  }

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-50">Configurações Gerais</h2>
        <p className="text-sm text-slate-400">Informações básicas do seu webinar.</p>
      </div>

      <div className="grid gap-5">
        {/* Nome */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-300">
            Nome do Webinar <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50 outline-none ring-primary placeholder:text-slate-500 focus:ring-2"
            placeholder="Ex: Como dobrar suas vendas em 30 dias"
          />
        </div>

        {/* Código e Slug */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">
              Código (gerado automaticamente)
            </label>
            <input
              type="text"
              value={code || "—"}
              readOnly
              className="h-10 w-full rounded-md border border-slate-800 bg-slate-900/40 px-3 text-sm text-slate-500 outline-none cursor-not-allowed"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">
              Slug (URL amigável) <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={slug}
                onChange={(e) => onChangeSlug(toSlug(e.target.value))}
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 pr-8 pl-3 text-sm text-slate-50 outline-none ring-primary placeholder:text-slate-500 focus:ring-2"
                placeholder="meu-webinar"
              />
              <span className="absolute right-2.5 top-2.5">
                {slugStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                {slugStatus === "available" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                {slugStatus === "taken" && <XCircle className="h-4 w-4 text-red-400" />}
              </span>
            </div>
            {slugStatus === "taken" && (
              <p className="text-xs text-red-400">Este slug já está em uso.</p>
            )}
          </div>
        </div>

        {/* URL da página (preview) */}
        {slug && code && (
          <div className="rounded-md border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs text-slate-400">
            URL: <span className="text-slate-300">/live/{code || "código"}/{slug}</span>
          </div>
        )}

        {/* Streaming nativo */}
        <div className="flex items-center justify-between rounded-lg border border-slate-800 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-200">Utilizar streaming nativo</p>
            <p className="text-xs text-slate-500">Transmita diretamente pela plataforma (máx. 4h)</p>
          </div>
          <button
            type="button"
            onClick={() => onChangeNativeStreaming(!useNativeStreaming)}
            className={`relative h-5 w-9 rounded-full transition-colors ${
              useNativeStreaming ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                useNativeStreaming ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* URL do vídeo */}
        {!useNativeStreaming && (
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">
              URL do vídeo (YouTube, Vimeo, Dailymotion, Twitch)
            </label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => onChangeVideoUrl(e.target.value)}
              className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50 outline-none ring-primary placeholder:text-slate-500 focus:ring-2"
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>
        )}

        {/* Data e hora */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">Data de início</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onChangeStartDate(e.target.value)}
              className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50 outline-none ring-primary focus:ring-2"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">Hora de início</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => onChangeStartTime(e.target.value)}
              className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50 outline-none ring-primary focus:ring-2"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
