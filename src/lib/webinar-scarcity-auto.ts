import type { WebinarConfig } from "@/lib/webinar-templates";
import { getDefaultConfig, resolveScarcityButton } from "@/lib/webinar-templates";

const COLOR_ORDER = ["green", "yellow", "orange", "red"] as const;

function truthyFlag(v: unknown): boolean {
  return v === true || v === 1 || v === "true" || v === "1";
}

/**
 * Avança o semáforo de escassez com base no relógio do servidor.
 * Usado no SSE da sala e no POST `/scarcity-advance` (fallback no cliente).
 */
export function maybeAdvanceScarcityAuto(config: WebinarConfig): WebinarConfig | null {
  const def = getDefaultConfig().scarcityButton;
  const raw = config.scarcityButton ?? def;
  if (!truthyFlag(raw.enabled) || !truthyFlag(raw.autoTimer)) return null;

  const r = resolveScarcityButton(config);

  const now = Date.now();
  const ps = r.phaseSeconds;

  if (!r.currentPhaseStartedAt) {
    return {
      ...config,
      scarcityButton: {
        ...def,
        ...raw,
        currentPhaseStartedAt: new Date(now).toISOString(),
      },
    };
  }

  let t0 = Date.parse(r.currentPhaseStartedAt);
  if (!Number.isFinite(t0)) {
    return {
      ...config,
      scarcityButton: {
        ...def,
        ...raw,
        currentPhaseStartedAt: new Date(now).toISOString(),
      },
    };
  }

  type Phase = (typeof COLOR_ORDER)[number];
  let color: Phase = COLOR_ORDER.includes(r.color as Phase) ? (r.color as Phase) : "green";
  let changed = false;
  while (true) {
    const durMs = Math.max(1000, ps[color] * 1000);
    if (now - t0 < durMs) break;
    t0 += durMs;
    const idx = COLOR_ORDER.indexOf(color);
    color = COLOR_ORDER[(idx + 1) % 4]!;
    changed = true;
  }

  if (!changed) return null;

  return {
    ...config,
    scarcityButton: {
      ...def,
      ...raw,
      color,
      currentPhaseStartedAt: new Date(t0).toISOString(),
    },
  };
}
