"use client";

import { SwitchRow } from "@/components/ui/switch-row";
import { useWebinarStore } from "@/store/useWebinarStore";

export function CountdownPanel() {
  const { config, updateConfig } = useWebinarStore();
  const { countdown } = config;

  return (
    <div className="space-y-5 p-5">
      <div>
        <h3 className="text-sm font-semibold text-slate-200">Contagem Regressiva</h3>
        <p className="text-xs text-slate-500">Exibir timer até o início do webinar.</p>
      </div>

      <div className="space-y-4 rounded-lg border border-slate-800 p-4">
        <SwitchRow
          enabled={countdown.enabled}
          onToggle={() => updateConfig("countdown", { enabled: !countdown.enabled })}
          label="Ativar countdown"
        />
        {countdown.enabled && (
          <>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-400">Mensagem acima do timer</label>
              <input
                type="text"
                value={countdown.message}
                onChange={(e) => updateConfig("countdown", { message: e.target.value })}
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50 outline-none ring-primary focus:ring-2"
                placeholder="O webinar começa em:"
              />
            </div>
            <div className="space-y-2">
              <SwitchRow
                enabled={countdown.showOnCapture}
                onToggle={() => updateConfig("countdown", { showOnCapture: !countdown.showOnCapture })}
                label="Mostrar na página de captura"
              />
              <SwitchRow
                enabled={countdown.showOnWatch}
                onToggle={() => updateConfig("countdown", { showOnWatch: !countdown.showOnWatch })}
                label="Mostrar na página do webinar"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
