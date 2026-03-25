"use client";

import { SwitchRow } from "@/components/ui/switch-row";
import { useWebinarStore } from "@/store/useWebinarStore";

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
        <SwitchRow
          bordered
          enabled={video.autoplay}
          onToggle={() => updateConfig("video", { autoplay: !video.autoplay })}
          label="Autoplay"
          description="Iniciar o vídeo automaticamente ao carregar a página"
        />
        <SwitchRow
          bordered
          enabled={video.hideControls}
          onToggle={() => updateConfig("video", { hideControls: !video.hideControls })}
          label="Ocultar controles"
          description="Remover barra de controles do player"
        />
      </div>
    </div>
  );
}
