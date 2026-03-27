"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

import { RegistrationPageTab } from "@/components/new-webinar/RegistrationPageTab";
import { useWebinarStore } from "@/store/useWebinarStore";
import { getDefaultConfig } from "@/lib/webinar-templates";
import { formatWebinarStartLabelPtBr } from "@/lib/webinar-timing";

function CopyUrlRow({ label, url }: { label: string; url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">{label}</span>
        <div className="flex items-center gap-2">
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Abrir <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
          <button
            type="button"
            onClick={copy}
            disabled={!url}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-40"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            Copiar
          </button>
        </div>
      </div>
      <p className="break-all font-mono text-xs text-slate-400">{url || "—"}</p>
    </div>
  );
}

export function RegistrationCapturePanel() {
  const { meta, config, updateMeta, updateConfig, webinarId } = useWebinarStore();
  const [origin] = useState(typeof window !== "undefined" ? window.location.origin : "");

  if (!meta) {
    return (
      <div className="p-6 text-sm text-slate-500">Carregando dados do webinar…</div>
    );
  }

  const code = meta.code;
  const slug = meta.slug;
  const loginUrl = origin ? `${origin}/live/${encodeURIComponent(code)}/${encodeURIComponent(slug)}` : "";
  const watchUrl = origin ? `${loginUrl}/watch` : "";

  const dateInputValue = meta.startDate
    ? meta.startDate.length >= 10
      ? meta.startDate.slice(0, 10)
      : ""
    : "";

  const timeInputValue = meta.startTime
    ? meta.startTime.length >= 5
      ? meta.startTime.slice(0, 5)
      : meta.startTime
    : "";

  const eventStartPreview = formatWebinarStartLabelPtBr(meta.startDate, meta.startTime);

  const bgPosition = config.capturePage?.backgroundPosition ?? {
    x: getDefaultConfig().capturePage?.backgroundPosition?.x ?? 0.5,
    y: getDefaultConfig().capturePage?.backgroundPosition?.y ?? 0.5,
  };

  const cap = config.capturePage ?? getDefaultConfig().capturePage!;

  function handleRegChange(field: string, value: unknown) {
    switch (field) {
      case "regBgPosition":
        updateConfig("capturePage", {
          ...cap,
          backgroundPosition: value as { x: number; y: number },
        });
        break;
      case "captureOverlayOpacity":
        updateConfig("capturePage", {
          ...cap,
          overlayOpacity: Math.min(1, Math.max(0.1, Number(value) || 0.5)),
        });
        break;
      case "captureOverlayTint":
        updateConfig("capturePage", {
          ...cap,
          overlayTintColor: typeof value === "string" ? value : cap.overlayTintColor,
        });
        break;
      case "captureFormSubtitle":
        updateConfig("capturePage", {
          ...cap,
          formSubtitle: typeof value === "string" ? value : cap.formSubtitle,
        });
        break;
      case "regBgImage":
        updateMeta({ regBgImage: (value as string) || null });
        break;
      case "regLogoUrl":
        updateMeta({ regLogoUrl: (value as string) || null });
        break;
      case "regDescription":
        updateMeta({ regDescription: (value as string) || null });
        break;
      case "regTitle":
        updateMeta({ regTitle: (value as string) || null });
        break;
      case "regCtaText":
        updateMeta({ regCtaText: (value as string) || null });
        break;
      case "regSponsors":
        updateMeta({ regSponsors: value as { name: string; logoUrl: string }[] });
        break;
      default:
        break;
    }
  }

  return (
    <div className="space-y-8 pb-8">
      <div className="space-y-1 px-6 pt-2">
        <h2 className="text-lg font-semibold text-slate-50">Login e sala</h2>
        <p className="text-sm text-slate-400">
          Links públicos (código <span className="font-mono text-slate-300">{code}</span> · slug{" "}
          <span className="font-mono text-slate-300">{slug}</span>) e personalização da página de entrada.
        </p>
      </div>

      <div className="space-y-3 px-6">
        <CopyUrlRow label="Link do login" url={loginUrl} />
        <CopyUrlRow label="Sala do webinar" url={watchUrl} />
      </div>

      <div className="mx-6 space-y-4 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Horário do evento</h3>
          <p className="text-xs text-slate-500">
            Usado no preview e no countdown.{" "}
            {eventStartPreview ? (
              <span className="text-slate-400">Início: {eventStartPreview}</span>
            ) : (
              <span>Defina data (e hora) para o visitante ver quando o evento começa.</span>
            )}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-400">Data de início</label>
            <input
              type="date"
              value={dateInputValue}
              onChange={(e) => {
                const v = e.target.value;
                updateMeta({ startDate: v ? v : null });
              }}
              className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50 outline-none ring-primary focus:ring-2"
              lang="pt-BR"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-400">Hora de início</label>
            <input
              type="time"
              value={timeInputValue}
              onChange={(e) => {
                const v = e.target.value;
                updateMeta({ startTime: v ? v : null });
              }}
              className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50 outline-none ring-primary focus:ring-2"
              lang="pt-BR"
            />
          </div>
        </div>
      </div>

      <RegistrationPageTab
        bgImage={meta.regBgImage ?? ""}
        bgPosition={bgPosition}
        logoUrl={meta.regLogoUrl ?? ""}
        description={meta.regDescription ?? ""}
        title={meta.regTitle ?? ""}
        ctaText={meta.regCtaText ?? "Ir para o webinar!"}
        sponsors={meta.regSponsors ?? []}
        primaryColor={config.branding.primaryColor}
        overlayOpacity={cap.overlayOpacity ?? 0.5}
        overlayTintColor={cap.overlayTintColor ?? "#000000"}
        formSubtitle={cap.formSubtitle ?? "Preencha os dados para acessar a transmissão."}
        eventStartDate={dateInputValue}
        eventStartTime={timeInputValue}
        countdown={config.countdown}
        webinarId={webinarId}
        onChange={handleRegChange}
      />

      <div className="mx-6 space-y-4 rounded-lg border border-slate-800 bg-slate-900/40 p-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Véu sobre a imagem de fundo</h3>
          <p className="text-xs text-slate-500">
            Opacidade e cor aplicadas em toda a página quando há foto de capa. Salva em{" "}
            <span className="font-mono text-slate-400">config.capturePage</span>.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-400">Opacidade do véu (10–100%)</label>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={cap.overlayOpacity ?? 0.5}
              onChange={(e) => handleRegChange("captureOverlayOpacity", e.target.value)}
              className="w-full accent-primary"
            />
            <p className="text-[11px] text-slate-500">
              Valor atual: {((cap.overlayOpacity ?? 0.5) * 100).toFixed(0)}%
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-400">Cor do degradê (hex)</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test((cap.overlayTintColor ?? "#000000").trim()) ? (cap.overlayTintColor ?? "#000000").trim() : "#000000"}
                onChange={(e) => handleRegChange("captureOverlayTint", e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border border-slate-600 bg-slate-900"
              />
              <input
                type="text"
                value={cap.overlayTintColor ?? "#000000"}
                onChange={(e) => handleRegChange("captureOverlayTint", e.target.value)}
                placeholder="#000000"
                className="h-10 min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 font-mono text-sm text-slate-50 outline-none ring-primary focus:ring-2"
              />
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-400">Texto abaixo do título do formulário</label>
          <textarea
            value={cap.formSubtitle ?? ""}
            onChange={(e) => handleRegChange("captureFormSubtitle", e.target.value)}
            rows={2}
            placeholder="Preencha os dados para acessar a transmissão."
            className="w-full resize-y rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-primary focus:ring-2"
          />
          <p className="text-[11px] text-slate-500">
            Deixe em branco para ocultar a linha. Use{" "}
            <span className="font-mono">{"{{nome}}"}</span> /{" "}
            <span className="font-mono">{"{{email}}"}</span> após preencher o formulário (mesclagem em campanhas).
          </p>
        </div>
      </div>
    </div>
  );
}
