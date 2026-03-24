import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

const pingBodySchema = z.object({
  leadId: z.string().min(1).optional().nullable(),
  minute: z.number().min(0).max(10_000).optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";
  const rl = await checkRateLimit(rateLimitKey("ping", `${ip}:${id}`), { windowMs: 60_000, max: 120 });
  if (!rl.ok) {
    return NextResponse.json({ error: "Limite de atualizações excedido." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = pingBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const leadId = parsed.data.leadId ?? null;
  const minute = parsed.data.minute ?? 0;

  await prisma.viewerPing.create({
    data: { webinarId: id, leadId, minute },
  });

  if (leadId && typeof minute === "number") {
    await prisma.lead.updateMany({
      where: { id: leadId },
      data: { watchedPercent: Math.min(100, Math.round(minute)) },
    });
  }

  return NextResponse.json({ ok: true });
}
