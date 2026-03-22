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

export function ChatPanel() {
  const { config, updateConfig } = useWebinarStore();
  const { chat } = config;

  return (
    <div className="space-y-5 p-5">
      <div>
        <h3 className="text-sm font-semibold text-slate-200">Chat</h3>
        <p className="text-xs text-slate-500">Configurações do chat ao vivo ou replay.</p>
      </div>

      <div className="space-y-4 rounded-lg border border-slate-800 p-4">
        <Toggle
          enabled={chat.enabled}
          onToggle={() => updateConfig("chat", { enabled: !chat.enabled })}
          label="Ativar chat"
        />

        {chat.enabled && (
          <>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-400">Modo do chat</label>
              <div className="flex gap-2">
                {(["live", "replay"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => updateConfig("chat", { mode })}
                    className={`flex-1 rounded-md border py-2 text-sm transition-colors ${
                      chat.mode === mode
                        ? "border-violet-500 bg-violet-600/20 text-violet-300"
                        : "border-slate-700 text-slate-400 hover:border-slate-500"
                    }`}
                  >
                    {mode === "live" ? "Ao vivo" : "Replay"}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                {chat.mode === "live"
                  ? "Os participantes podem enviar mensagens em tempo real."
                  : "Mensagens pré-programadas aparecem em timestamps definidos."}
              </p>
            </div>

            <Toggle
              enabled={chat.readonly}
              onToggle={() => updateConfig("chat", { readonly: !chat.readonly })}
              label="Somente leitura"
              description="Desabilita o envio de mensagens pelos participantes"
            />
          </>
        )}
      </div>
    </div>
  );
}
