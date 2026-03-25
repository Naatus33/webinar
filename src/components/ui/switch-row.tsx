"use client";

import { cn } from "@/lib/utils";
import { Switch } from "./switch";

export type SwitchRowProps = {
  enabled: boolean;
  onToggle: () => void;
  label: string;
  description?: string;
  className?: string;
  /** Borda e padding ao redor da linha (ex.: opções isoladas no builder) */
  bordered?: boolean;
};

export function SwitchRow({
  enabled,
  onToggle,
  label,
  description,
  className,
  bordered = false,
}: SwitchRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4",
        bordered && "rounded-lg border border-border px-4 py-3",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <Switch
        enabled={enabled}
        onToggle={onToggle}
        aria-label={label}
        className="shrink-0 motion-transition"
      />
    </div>
  );
}
