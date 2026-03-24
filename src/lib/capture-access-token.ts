import { createHmac, timingSafeEqual } from "node:crypto";

function secret(): string {
  return process.env.NEXTAUTH_SECRET ?? process.env.CAPTURE_ACCESS_SECRET ?? "";
}

export function signCaptureAccessToken(webinarId: string, ttlMs = 2 * 60 * 60 * 1000): string {
  const exp = Date.now() + ttlMs;
  const payload = Buffer.from(JSON.stringify({ wid: webinarId, exp }), "utf8").toString(
    "base64url",
  );
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyCaptureAccessToken(
  token: string | undefined,
  webinarId: string,
): boolean {
  if (!token || !secret()) return false;
  const lastDot = token.lastIndexOf(".");
  if (lastDot <= 0) return false;
  const payload = token.slice(0, lastDot);
  const sig = token.slice(lastDot + 1);
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  if (sig.length !== expected.length) return false;
  try {
    if (!timingSafeEqual(Buffer.from(sig, "utf8"), Buffer.from(expected, "utf8"))) {
      return false;
    }
  } catch {
    return false;
  }
  try {
    const raw = Buffer.from(payload, "base64url").toString("utf8");
    const data = JSON.parse(raw) as { wid?: string; exp?: number };
    if (data.wid !== webinarId || typeof data.exp !== "number") return false;
    if (Date.now() > data.exp) return false;
    return true;
  } catch {
    return false;
  }
}
