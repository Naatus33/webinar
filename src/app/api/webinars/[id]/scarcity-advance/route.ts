import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import type { WebinarConfig } from "@/lib/webinar-templates";
import { maybeAdvanceScarcityAuto } from "@/lib/webinar-scarcity-auto";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Avança o semáforo de escassez no servidor (mesma lógica do stream SSE).
 * Público: qualquer viewer pode chamar quando o countdown local chega a 0 — cobre HMR/dev e SSE instável.
 */
export async function POST(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  const webinar = await prisma.webinar.findUnique({
    where: { id },
    select: { id: true, status: true, config: true },
  });
  if (!webinar) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (webinar.status !== "LIVE" && webinar.status !== "REPLAY") {
    return NextResponse.json({ ok: false, reason: "not_broadcasting" });
  }
  if (webinar.config == null || typeof webinar.config !== "object" || Array.isArray(webinar.config)) {
    return NextResponse.json({ ok: false, reason: "no_config" });
  }
  try {
    const cfg = webinar.config as unknown as WebinarConfig;
    const advanced = maybeAdvanceScarcityAuto(cfg);
    if (!advanced) {
      return NextResponse.json({ ok: true, advanced: false });
    }
    const safe = JSON.parse(JSON.stringify(advanced)) as object;
    await prisma.webinar.update({ where: { id }, data: { config: safe } });
    return NextResponse.json({ ok: true, advanced: true });
  } catch (e) {
    console.error("[scarcity-advance]", e);
    return NextResponse.json({ ok: false, reason: "server_error" }, { status: 500 });
  }
}
