"use client";

import { useWebinarStore } from "@/store/useWebinarStore";

function Toggle({ enabled, onToggle, label, description }: { enabled: boolean; onToggle: () => void; label: string; description?: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-800 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-slate-200">{label}</p>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
      <button
        type="button"
        onClick={onToggle}
        className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${enabled ? "bg-violet-600" : "bg-slate-700"}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-4" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

export function VideoPanel() {
  const { config, updateConfig } = useWebinarStore();
  const { video } = config;

  return (
    <div className="space-y-5 p-5">
      <div>
        <h3 className="text-sm font-semibold text-slate-200">Vídeo</h3>
        <p className="text-xs text-slate-500">Configurações do player de vídeo.</p>
      </div>
      <div className="space-y-3">
        <Toggle
          enabled={video.autoplay}
          onToggle={() => updateConfig("video", { autoplay: !video.autoplay })}
          label="Autoplay"
          description="Iniciar o vídeo automaticamente ao carregar a página"
        />
        <Toggle
          enabled={video.hideControls}
          onToggle={() => updateConfig("video", { hideControls: !video.hideControls })}
          label="Ocultar controles"
          description="Remover barra de controles do player"
        />
      </div>
    </div>
  );
}
