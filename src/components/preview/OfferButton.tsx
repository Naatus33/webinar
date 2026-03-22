"use client";

import { useEffect, useState } from "react";
import { useWebinarStore } from "@/store/useWebinarStore";

const PHASES = ["green", "yellow", "orange", "red"] as const;
const PHASE_COLORS: Record<string, string> = {
  green: "#16A34A",
  yellow: "#CA8A04",
  orange: "#EA580C",
  red: "#DC2626",
};

interface OfferButtonProps {
  /** Tempo decorrido em segundos (para simular no preview) */
  simulatePhase?: typeof PHASES[number] | null;
}

export function OfferButton({ simulatePhase }: OfferButtonProps) {
  const { config } = useWebinarStore();
  const { offer } = config;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!offer.active || !offer.colorTimer.enabled || simulatePhase) return;
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [offer.active, offer.colorTimer.enabled, simulatePhase]);

  if (!offer.active) return null;

  function getCurrentPhase(): { color: string; text: string; remaining: number } {
    if (simulatePhase) {
      const p = offer.colorTimer.phases[simulatePhase];
      return { color: PHASE_COLORS[simulatePhase], text: p.text, remaining: p.seconds };
    }

    if (!offer.colorTimer.enabled) {
      return { color: offer.url ? "#7C3AED" : "#7C3AED", text: "Quero participar!", remaining: 0 };
    }

    let cumulative = 0;
    for (const phase of PHASES) {
      const p = offer.colorTimer.phases[phase];
      cumulative += p.seconds;
      if (elapsed < cumulative) {
        const remaining = cumulative - elapsed;
        return { color: PHASE_COLORS[phase], text: p.text, remaining };
      }
    }
    // Após todas as fases, fica vermelho
    const last = offer.colorTimer.phases.red;
    return { color: PHASE_COLORS.red, text: last.text, remaining: 0 };
  }

  const { color, text, remaining } = getCurrentPhase();

  return (
    <div className="flex flex-col items-center gap-1">
      <a
        href={offer.url || "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-12 w-full max-w-md items-center justify-center rounded-xl px-6 text-base font-bold text-white shadow-lg transition-transform hover:scale-[1.02]"
        style={{ backgroundColor: color }}
      >
        {text}
      </a>
      {offer.colorTimer.enabled && offer.colorTimer.showCountdown && remaining > 0 && (
        <p className="text-xs text-slate-400">
          Essa oferta termina em: {formatTime(remaining)}
        </p>
      )}
    </div>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
