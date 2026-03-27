"use client";

import { SwitchRow } from "@/components/ui/switch-row";
import { useWebinarStore } from "@/store/useWebinarStore";

export function SocialProofPanel() {
  const { config, updateConfig } = useWebinarStore();
  const { socialProof, captureCounter } = config;

  return (
    <div className="space-y-5 p-5">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Prova Social</h3>
        <p className="text-xs text-muted-foreground">Pop-up de inscrições recentes e contador de captura.</p>
      </div>

      {/* Pop-up prova social */}
      <div className="space-y-4 rounded-lg border border-border p-4">
        <SwitchRow
          enabled={socialProof.enabled}
          onToggle={() => updateConfig("socialProof", { enabled: !socialProof.enabled })}
          label="Pop-up de inscrições recentes"
          description="Mostra 'X acabou de se inscrever' para os participantes"
        />
        {socialProof.enabled && (
          <>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-muted-foreground">Modo</label>
              <div className="flex gap-2">
                {(["real", "fake"] as const).map((m) => (
                  <button key={m} type="button" onClick={() => updateConfig("socialProof", { mode: m })}
                    className={`flex-1 rounded-md border py-2 text-sm ${socialProof.mode === m ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-muted-foreground/50"}`}>
                    {m === "real" ? "Real (banco de dados)" : "Simulado"}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[10px] text-muted-foreground">Frequência (segundos)</label>
                <input type="number" min={5} value={socialProof.frequency} onChange={(e) => updateConfig("socialProof", { frequency: parseInt(e.target.value) || 30 })}
                  className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none" />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] text-muted-foreground">Duração visível (segundos)</label>
                <input type="number" min={1} value={socialProof.duration} onChange={(e) => updateConfig("socialProof", { duration: parseInt(e.target.value) || 5 })}
                  className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground outline-none" />
              </div>
            </div>
            {socialProof.mode === "fake" && (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground">Nomes simulados (um por linha)</label>
                <textarea rows={3} value={socialProof.fakeNames.join("\n")}
                  onChange={(e) => updateConfig("socialProof", { fakeNames: e.target.value.split("\n").filter(Boolean) })}
                  className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-primary focus:ring-2" />
              </div>
            )}
          </>
        )}
      </div>

      {/* Contador captura */}
      <div className="space-y-4 rounded-lg border border-border p-4">
        <SwitchRow
          enabled={captureCounter.enabled}
          onToggle={() => updateConfig("captureCounter", { enabled: !captureCounter.enabled })}
          label="Contador de inscritos na captura"
          description="Ex: Mais de 1.200 pessoas já se inscreveram"
        />
        {captureCounter.enabled && (
          <>
            <div className="flex gap-2">
              {(["real", "fake"] as const).map((m) => (
                <button key={m} type="button" onClick={() => updateConfig("captureCounter", { mode: m })}
                  className={`flex-1 rounded-md border py-2 text-sm ${captureCounter.mode === m ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-muted-foreground/50"}`}>
                  {m === "real" ? "Real" : "Simulado"}
                </button>
              ))}
            </div>
            {captureCounter.mode === "fake" && (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground">Base simulada</label>
                <input type="number" min={0} value={captureCounter.fakeBase} onChange={(e) => updateConfig("captureCounter", { fakeBase: parseInt(e.target.value) || 0 })}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none ring-primary focus:ring-2" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
