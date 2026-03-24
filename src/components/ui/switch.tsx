"use client";

import { cn } from "@/lib/utils";

type SwitchProps = {
  enabled: boolean;
  onToggle: () => void;
  id?: string;
  className?: string;
  "aria-label"?: string;
};

export function Switch({
  enabled,
  onToggle,
  id,
  className,
  "aria-label": ariaLabel,
}: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={ariaLabel}
      onClick={onToggle}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        enabled ? "bg-primary" : "bg-muted",
        className,
      )}
      style={{
        transitionDuration: "var(--motion-duration-normal, 220ms)",
      }}
    >
      <span
        className={cn(
          "pointer-events-none absolute top-1 left-0.5 block h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
          enabled ? "translate-x-[1.25rem]" : "translate-x-0",
        )}
        style={{
          transitionDuration: "var(--motion-duration-normal, 220ms)",
          transitionTimingFunction:
            "var(--motion-ease-out, cubic-bezier(0.16, 1, 0.3, 1))",
        }}
      />
    </button>
  );
}
