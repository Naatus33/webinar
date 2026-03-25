"use client";

import { SwitchRow } from "@/components/ui/switch-row";
import { useWebinarStore } from "@/store/useWebinarStore";

export function ScarcityPanel() {
  const { config, updateConfig, setConfigField } = useWebinarStore();
  const { scarcity } = config;

  return (
    <div className="space-y-5 p-5">
      <div>
        <h3 className="text-sm font-semibold text-slate-200">Escassez</h3>
        <p className="text-xs text-slate-500">Banner de vagas limitadas com timer colorido.</p>
      </div>

      <div className="space-y-4 rounded-lg border border-slate-800 p-4">
        <SwitchRow
          enabled={scarcity.enabled}
          onToggle={() => updateConfig("scarcity", { enabled: !scarcity.enabled })}
          label="Ativar banner de escassez"
        />

        {scarcity.enabled && (
          <>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-400">Mensagem de escassez</label>
              <input
                type="text"
                value={scarcity.message}
                onChange={(e) => updateConfig("scarcity", { message: e.target.value })}
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50 outline-none ring-primary focus:ring-2"
                placeholder="Vagas limitadas!"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-400">Quantidade de vagas</label>
              <input
                type="number"
                min={1}
                value={scarcity.count}
                onChange={(e) => updateConfig("scarcity", { count: parseInt(e.target.value) || 0 })}
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50 outline-none ring-primary focus:ring-2"
              />
            </div>

            <div className="space-y-3 border-t border-slate-800 pt-3">
              <SwitchRow
                enabled={scarcity.timer.enabled}
                onToggle={() => setConfigField(["scarcity", "timer", "enabled"], !scarcity.timer.enabled)}
                label="Timer colorido"
                description="Muda a cor do banner conforme o tempo passa"
              />
              {scarcity.timer.enabled && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-400">Duração total (segundos)</label>
                  <input
                    type="number"
                    min={1}
                    value={scarcity.timer.totalSeconds}
                    onChange={(e) => setConfigField(["scarcity", "timer", "totalSeconds"], parseInt(e.target.value) || 600)}
                    className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50 outline-none ring-primary focus:ring-2"
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
