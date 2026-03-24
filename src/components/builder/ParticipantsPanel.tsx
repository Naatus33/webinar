"use client";

import { useWebinarStore } from "@/store/useWebinarStore";

function Toggle({ enabled, onToggle, label, description }: { enabled: boolean; onToggle: () => void; label: string; description?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-200">{label}</p>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
      <button type="button" onClick={onToggle} className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${enabled ? "bg-primary" : "bg-slate-700"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-4" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

export function ParticipantsPanel() {
  const { config, updateConfig } = useWebinarStore();
  const { participants } = config;

  return (
    <div className="space-y-5 p-5">
      <div>
        <h3 className="text-sm font-semibold text-slate-200">Participantes</h3>
        <p className="text-xs text-slate-500">Contador de participantes simultâneos.</p>
      </div>

      <div className="space-y-4 rounded-lg border border-slate-800 p-4">
        <Toggle
          enabled={participants.enabled}
          onToggle={() => updateConfig("participants", { enabled: !participants.enabled })}
          label="Exibir contador"
        />

        {participants.enabled && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-400">Mínimo</label>
                <input
                  type="number"
                  min={0}
                  value={participants.min}
                  onChange={(e) => updateConfig("participants", { min: parseInt(e.target.value) || 0 })}
                  className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50 outline-none ring-primary focus:ring-2"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-400">Máximo</label>
                <input
                  type="number"
                  min={0}
                  value={participants.max}
                  onChange={(e) => updateConfig("participants", { max: parseInt(e.target.value) || 0 })}
                  className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50 outline-none ring-primary focus:ring-2"
                />
              </div>
            </div>

            <Toggle
              enabled={participants.autoVariation}
              onToggle={() => updateConfig("participants", { autoVariation: !participants.autoVariation })}
              label="Variação automática"
              description="Oscila o número aleatoriamente a cada 30–60s"
            />
          </>
        )}
      </div>
    </div>
  );
}
