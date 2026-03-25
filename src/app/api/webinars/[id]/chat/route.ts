import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

const PAGE_LIMIT = 100;

const chatPostSchema = z.object({
  author: z.string().min(1).max(80).trim(),
  content: z.string().min(1).max(2000).trim(),
  timestamp: z.number().int().optional().nullable(),
  type: z.enum(["normal", "urgent", "warning"]).optional().default("normal"),
  replyToContent: z.string().max(500).optional().nullable(),
  replyToAuthor: z.string().max(80).optional().nullable(),
});

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const timestampBefore = searchParams.get("timestampBefore");

  const messages = await prisma.chatMessage.findMany({
    where: {
      webinarId: id,
      deleted: false,
      ...(timestampBefore ? { timestamp: { lt: parseInt(timestampBefore) } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: PAGE_LIMIT,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    select: { id: true, author: true, content: true, pinned: true, timestamp: true, createdAt: true },
  });

  return NextResponse.json(messages);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";
  const rl = await checkRateLimit(rateLimitKey("chat", `${ip}:${id}`), { windowMs: 60_000, max: 60 });
  if (!rl.ok) {
    return NextResponse.json({ error: "Muitas mensagens. Aguarde um momento." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = chatPostSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Autor e conteúdo são obrigatórios" }, { status: 400 });
  }

  const { author, content, timestamp, type, replyToContent, replyToAuthor } = parsed.data;

  const webinar = await prisma.webinar.findUnique({ where: { id }, select: { id: true, config: true } });
  if (!webinar) return NextResponse.json({ error: "Webinar não encontrado" }, { status: 404 });

  const cfg = webinar.config as any;
  if (cfg?.chat?.readonly)
    return NextResponse.json({ error: "Chat em modo somente leitura" }, { status: 403 });

  // Se adminOnly, apenas autores com nome "Administrador" ou displayName configurado podem postar
  if (cfg?.chat?.adminOnly && author !== (cfg?.adminAvatar?.displayName || "Administrador"))
    return NextResponse.json({ error: "Chat restrito ao administrador" }, { status: 403 });

  const message = await prisma.chatMessage.create({
    data: {
      webinarId: id,
      author,
      content,
      timestamp: timestamp ?? null,
      type: type ?? "normal",
      replyToContent: replyToContent ?? null,
      replyToAuthor: replyToAuthor ?? null,
    },
    select: { id: true, author: true, content: true, type: true, replyToContent: true, replyToAuthor: true, pinned: true, timestamp: true, createdAt: true },
  });

  return NextResponse.json(message, { status: 201 });
}
