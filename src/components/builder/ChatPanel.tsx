"use client";

import { useWebinarStore } from "@/store/useWebinarStore";
import { SectionCard } from "@/components/ui/section-card";
import { Switch } from "@/components/ui/switch";

function RowToggle({
  enabled,
  onToggle,
  label,
  description,
}: {
  enabled: boolean;
  onToggle: () => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <Switch
        enabled={enabled}
        onToggle={onToggle}
        aria-label={label}
        className="motion-transition shrink-0"
      />
    </div>
  );
}

export function ChatPanel() {
  const { config, updateConfig } = useWebinarStore();
  const { chat } = config;

  return (
    <div className="space-y-4 p-1">
      <SectionCard
        title="Chat ao vivo"
        description="Controle visibilidade, modo e permissões de envio."
      >
        <RowToggle
          enabled={chat.enabled}
          onToggle={() => updateConfig("chat", { enabled: !chat.enabled })}
          label="Ativar chat"
        />

        {chat.enabled && (
          <div className="mt-5 space-y-5 border-t border-border/60 pt-5">
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">
                Modo do chat
              </span>
              <div
                className="grid grid-cols-2 gap-2 p-0.5"
                role="radiogroup"
                aria-label="Modo do chat"
              >
                {(["live", "replay"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={chat.mode === mode}
                    onClick={() => updateConfig("chat", { mode })}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-medium motion-transition motion-safe:active:scale-[0.98] ${
                      chat.mode === mode
                        ? "border-primary bg-primary/15 text-primary shadow-sm ring-1 ring-primary/30"
                        : "border-border/80 bg-muted/30 text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    {mode === "live" ? "Ao vivo" : "Replay"}
                  </button>
                ))}
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {chat.mode === "live"
                  ? "Os participantes podem enviar mensagens em tempo real."
                  : "Mensagens pré-programadas aparecem em timestamps definidos."}
              </p>
            </div>

            <RowToggle
              enabled={chat.readonly}
              onToggle={() => updateConfig("chat", { readonly: !chat.readonly })}
              label="Somente leitura"
              description="Desabilita o envio de mensagens pelos participantes"
            />
          </div>
        )}
      </SectionCard>
    </div>
  );
}
