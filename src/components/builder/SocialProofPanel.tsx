"use client";

import { useWebinarStore } from "@/store/useWebinarStore";

function Toggle({ enabled, onToggle, label, description }: { enabled: boolean; onToggle: () => void; label: string; description?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-200">{label}</p>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
      <button type="button" onClick={onToggle} className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${enabled ? "bg-violet-600" : "bg-slate-700"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-4" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

export function SocialProofPanel() {
  const { config, updateConfig } = useWebinarStore();
  const { socialProof, captureCounter } = config;

  return (
    <div className="space-y-5 p-5">
      <div>
        <h3 className="text-sm font-semibold text-slate-200">Prova Social</h3>
        <p className="text-xs text-slate-500">Pop-up de inscrições recentes e contador de captura.</p>
      </div>

      {/* Pop-up prova social */}
      <div className="space-y-4 rounded-lg border border-slate-800 p-4">
        <Toggle enabled={socialProof.enabled} onToggle={() => updateConfig("socialProof", { enabled: !socialProof.enabled })} label="Pop-up de inscrições recentes" description="Mostra 'X acabou de se inscrever' para os participantes" />
        {socialProof.enabled && (
          <>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-400">Modo</label>
              <div className="flex gap-2">
                {(["real", "fake"] as const).map((m) => (
                  <button key={m} type="button" onClick={() => updateConfig("socialProof", { mode: m })}
                    className={`flex-1 rounded-md border py-2 text-sm ${socialProof.mode === m ? "border-violet-500 bg-violet-600/20 text-violet-300" : "border-slate-700 text-slate-400 hover:border-slate-500"}`}>
                    {m === "real" ? "Real (banco de dados)" : "Simulado"}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[10px] text-slate-500">Frequência (segundos)</label>
                <input type="number" min={5} value={socialProof.frequency} onChange={(e) => updateConfig("socialProof", { frequency: parseInt(e.target.value) || 30 })}
                  className="h-8 w-full rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-50 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] text-slate-500">Duração visível (segundos)</label>
                <input type="number" min={1} value={socialProof.duration} onChange={(e) => updateConfig("socialProof", { duration: parseInt(e.target.value) || 5 })}
                  className="h-8 w-full rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-50 outline-none" />
              </div>
            </div>
            {socialProof.mode === "fake" && (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-400">Nomes simulados (um por linha)</label>
                <textarea rows={3} value={socialProof.fakeNames.join("\n")}
                  onChange={(e) => updateConfig("socialProof", { fakeNames: e.target.value.split("\n").filter(Boolean) })}
                  className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-violet-500 focus:ring-2 resize-none" />
              </div>
            )}
          </>
        )}
      </div>

      {/* Contador captura */}
      <div className="space-y-4 rounded-lg border border-slate-800 p-4">
        <Toggle enabled={captureCounter.enabled} onToggle={() => updateConfig("captureCounter", { enabled: !captureCounter.enabled })} label="Contador de inscritos na captura" description="Ex: Mais de 1.200 pessoas já se inscreveram" />
        {captureCounter.enabled && (
          <>
            <div className="flex gap-2">
              {(["real", "fake"] as const).map((m) => (
                <button key={m} type="button" onClick={() => updateConfig("captureCounter", { mode: m })}
                  className={`flex-1 rounded-md border py-2 text-sm ${captureCounter.mode === m ? "border-violet-500 bg-violet-600/20 text-violet-300" : "border-slate-700 text-slate-400 hover:border-slate-500"}`}>
                  {m === "real" ? "Real" : "Simulado"}
                </button>
              ))}
            </div>
            {captureCounter.mode === "fake" && (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-400">Base simulada</label>
                <input type="number" min={0} value={captureCounter.fakeBase} onChange={(e) => updateConfig("captureCounter", { fakeBase: parseInt(e.target.value) || 0 })}
                  className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50 outline-none ring-violet-500 focus:ring-2" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
