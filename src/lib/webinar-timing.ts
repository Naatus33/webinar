/**
 * Data/hora de início do webinar no fuso local do navegador/servidor.
 * Evita erro comum: startDate em UTC (meia-noite) + setHours local desloca o dia.
 */
export function webinarStartDateTime(
  startDate: string | Date | null | undefined,
  startTime: string | null | undefined,
): Date | null {
  if (!startDate || !startTime?.trim()) return null;
  const iso =
    typeof startDate === "string"
      ? startDate
      : startDate.toISOString?.() ?? String(startDate);
  const datePart = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;
  const [yy, mm, dd] = datePart.split("-").map((x) => parseInt(x, 10));
  const tm = startTime.trim();
  const [hStr, mStr] = tm.split(":");
  const hh = parseInt(hStr?.replace(/\D/g, "") ?? "0", 10) || 0;
  const mi = parseInt(mStr?.replace(/\D/g, "") ?? "0", 10) || 0;
  if (Number.isNaN(yy) || Number.isNaN(mm) || Number.isNaN(dd)) return null;
  return new Date(yy, mm - 1, dd, hh, mi, 0, 0);
}

/**
 * Instante usado para contagem regressiva quando só existe data: meia-noite (00:00) do dia do evento no fuso local.
 * Com horário definido, equivale a `webinarStartDateTime`.
 */
export function webinarCountdownTarget(
  startDate: string | Date | null | undefined,
  startTime: string | null | undefined,
): Date | null {
  if (!startDate) return null;
  const fallback = startTime?.trim() ? startTime.trim() : "00:00";
  return webinarStartDateTime(startDate, fallback);
}

/** Texto único para UI (captura, confirmação, preview do wizard) — evita `new Date(iso UTC)` trocar o dia. */
export function formatWebinarStartLabelPtBr(
  startDate: string | Date | null | undefined,
  startTime: string | null | undefined,
): string | null {
  if (!startDate) return null;
  const iso =
    typeof startDate === "string"
      ? startDate
      : startDate.toISOString?.() ?? String(startDate);
  const datePart = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;
  const [yy, mm, dd] = datePart.split("-").map((x) => parseInt(x, 10));
  if (Number.isNaN(yy) || Number.isNaN(mm) || Number.isNaN(dd)) return null;
  const d = new Date(yy, mm - 1, dd);
  let text = d.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const tm = startTime?.trim();
  if (tm) text += ` às ${tm}`;
  return text;
}

export type WatchPhase = "waiting" | "live" | "replay";

export function computePublicWatchPhase(args: {
  startDate: string | null | undefined;
  startTime: string | null | undefined;
  replayEnabled: boolean;
  status: string;
}): { phase: WatchPhase; secondsUntilStart: number | null; secondsSinceStart: number } {
  const { replayEnabled, status } = args;
  const start = webinarCountdownTarget(args.startDate, args.startTime);
  const now = Date.now();

  if (status === "LIVE") {
    return {
      phase: "live",
      secondsUntilStart: null,
      secondsSinceStart: start ? Math.max(0, Math.floor((now - start.getTime()) / 1000)) : 0,
    };
  }

  if (status === "FINISHED") {
    if (replayEnabled) {
      return { phase: "replay", secondsUntilStart: null, secondsSinceStart: 0 };
    }
    return { phase: "live", secondsUntilStart: null, secondsSinceStart: 0 };
  }

  if (!start) {
    return {
      phase: replayEnabled ? "replay" : "live",
      secondsUntilStart: null,
      secondsSinceStart: 0,
    };
  }

  const diff = start.getTime() - now;
  if (diff > 0) {
    return {
      phase: "waiting",
      secondsUntilStart: Math.ceil(diff / 1000),
      secondsSinceStart: 0,
    };
  }

  return {
    phase: replayEnabled ? "replay" : "live",
    secondsUntilStart: null,
    secondsSinceStart: Math.max(0, Math.floor((now - start.getTime()) / 1000)),
  };
}
