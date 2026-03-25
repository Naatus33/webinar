import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

const bodySchema = z.object({
  viewerKey: z.string().min(8).max(128),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; msgId: string }> },
) {
  const { id: webinarId, msgId: messageId } = await params;

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const rl = await checkRateLimit(rateLimitKey("chat-heart", `${ip}:${webinarId}`), {
    windowMs: 60_000,
    max: 120,
  });
  if (!rl.ok) {
    return NextResponse.json({ error: "Muitas ações. Aguarde um momento." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Chave inválida" }, { status: 400 });
  }

  const { viewerKey } = parsed.data;

  const msg = await prisma.chatMessage.findFirst({
    where: { id: messageId, webinarId, deleted: false },
    select: { id: true },
  });
  if (!msg) {
    return NextResponse.json({ error: "Mensagem não encontrada" }, { status: 404 });
  }

  const existing = await prisma.chatMessageHeart.findUnique({
    where: {
      messageId_viewerKey: { messageId, viewerKey },
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.chatMessageHeart.delete({ where: { id: existing.id } });
  } else {
    await prisma.chatMessageHeart.create({
      data: { messageId, viewerKey },
    });
  }

  const likeCount = await prisma.chatMessageHeart.count({
    where: { messageId },
  });

  return NextResponse.json({
    likeCount,
    liked: !existing,
  });
}
