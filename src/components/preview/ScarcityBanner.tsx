"use client";

import { useEffect, useState } from "react";
import { useWebinarStore } from "@/store/useWebinarStore";
import { AlertTriangle } from "lucide-react";

const THRESHOLD_COLORS: Record<string, string> = {
  green: "#15803d",
  yellow: "#a16207",
  orange: "#9a3412",
  red: "#8b0000",
};

export function ScarcityBanner() {
  const { config } = useWebinarStore();
  const { scarcity } = config;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!scarcity.enabled || !scarcity.timer.enabled) return;
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [scarcity.enabled, scarcity.timer.enabled]);

  if (!scarcity.enabled) return null;

  function getBgColor() {
    if (!scarcity.timer.enabled) return THRESHOLD_COLORS.green;
    const t = scarcity.timer;
    const remaining = Math.max(0, t.totalSeconds - elapsed);
    const { thresholds } = t;
    if (remaining >= thresholds.green.to) return THRESHOLD_COLORS.green;
    if (remaining >= thresholds.yellow.to) return THRESHOLD_COLORS.yellow;
    if (remaining >= thresholds.orange.to) return THRESHOLD_COLORS.orange;
    return THRESHOLD_COLORS.red;
  }

  const bgColor = getBgColor();
  const remaining = Math.max(0, scarcity.timer.totalSeconds - elapsed);

  return (
    <div
      className="flex items-center justify-center gap-3 px-4 py-2 text-white transition-colors"
      style={{ backgroundColor: bgColor }}
    >
      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
      <span className="text-sm font-semibold">{scarcity.message}</span>
      {scarcity.count > 0 && (
        <span className="text-sm font-bold">{scarcity.count} vagas</span>
      )}
      {scarcity.timer.enabled && (
        <span className="text-sm font-mono">
          {formatTime(remaining)}
        </span>
      )}
    </div>
  );
}

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}
