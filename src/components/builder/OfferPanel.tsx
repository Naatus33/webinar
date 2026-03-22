"use client";

import { useWebinarStore } from "@/store/useWebinarStore";

function Toggle({ enabled, onToggle, label, description }: { enabled: boolean; onToggle: () => void; label: string; description?: string }) {
  return (
    <div className="flex items-center justify-between">
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

const PHASES = ["green", "yellow", "orange", "red"] as const;
const PHASE_LABELS: Record<string, string> = {
  green: "Verde",
  yellow: "Amarelo",
  orange: "Laranja",
  red: "Vermelho",
};
const PHASE_COLORS: Record<string, string> = {
  green: "#16A34A",
  yellow: "#CA8A04",
  orange: "#EA580C",
  red: "#DC2626",
};

export function OfferPanel() {
  const { config, updateConfig, setConfigField } = useWebinarStore();
  const { offer } = config;

  function updatePhase(phase: string, field: "seconds" | "text", value: string | number) {
    setConfigField(["offer", "colorTimer", "phases", phase, field], value);
  }

  return (
    <div className="space-y-5 p-5">
      <div>
        <h3 className="text-sm font-semibold text-slate-200">Oferta</h3>
        <p className="text-xs text-slate-500">Configure o botão de oferta e paleta automática.</p>
      </div>

      <div className="space-y-4 rounded-lg border border-slate-800 p-4">
        <Toggle
          enabled={offer.active}
          onToggle={() => updateConfig("offer", { active: !offer.active })}
          label="Ativar botão de oferta"
        />

        {offer.active && (
          <>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-400">URL de destino (checkout, WhatsApp, etc.)</label>
              <input
                type="url"
                value={offer.url}
                onChange={(e) => updateConfig("offer", { url: e.target.value })}
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50 outline-none ring-violet-500 placeholder:text-slate-500 focus:ring-2"
                placeholder="https://... ou https://wa.me/55..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-400">Posição</label>
              <select
                value={offer.position}
                onChange={(e) => updateConfig("offer", { position: e.target.value })}
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50 outline-none"
              >
                <option value="bottom">Rodapé fixo</option>
                <option value="top">Topo fixo</option>
              </select>
            </div>
          </>
        )}
      </div>

      {/* Paleta automática */}
      {offer.active && (
        <div className="space-y-4 rounded-lg border border-slate-800 p-4">
          <Toggle
            enabled={offer.colorTimer.enabled}
            onToggle={() => setConfigField(["offer", "colorTimer", "enabled"], !offer.colorTimer.enabled)}
            label="Paleta automática de cor e texto"
            description="Verde → Amarelo → Laranja → Vermelho ao longo do tempo"
          />

          {offer.colorTimer.enabled && (
            <>
              <Toggle
                enabled={offer.colorTimer.showCountdown}
                onToggle={() => setConfigField(["offer", "colorTimer", "showCountdown"], !offer.colorTimer.showCountdown)}
                label="Mostrar contador regressivo"
                description="Exibe o tempo restante da fase para o participante"
              />

              <div className="space-y-3">
                {PHASES.map((phase) => {
                  const p = offer.colorTimer.phases[phase];
                  return (
                    <div key={phase} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 flex-shrink-0 rounded-full"
                          style={{ backgroundColor: PHASE_COLORS[phase] }}
                        />
                        <span className="text-xs font-semibold text-slate-300">Fase {PHASE_LABELS[phase]}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="block text-[10px] text-slate-500">Duração (segundos)</label>
                          <input
                            type="number"
                            min={1}
                            value={p.seconds}
                            onChange={(e) => updatePhase(phase, "seconds", parseInt(e.target.value) || 0)}
                            className="h-8 w-full rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-50 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] text-slate-500">Texto do botão</label>
                          <input
                            type="text"
                            value={p.text}
                            onChange={(e) => updatePhase(phase, "text", e.target.value)}
                            className="h-8 w-full rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-50 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
