import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PAGE_LIMIT = 100;

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
  const { author, content, timestamp } = await request.json();

  if (!author || !content) return NextResponse.json({ error: "Autor e conteúdo são obrigatórios" }, { status: 400 });

  const webinar = await prisma.webinar.findUnique({ where: { id }, select: { id: true, config: true } });
  if (!webinar) return NextResponse.json({ error: "Webinar não encontrado" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((webinar.config as any)?.chat?.readonly)
    return NextResponse.json({ error: "Chat em modo somente leitura" }, { status: 403 });

  const message = await prisma.chatMessage.create({
    data: { webinarId: id, author, content, timestamp: timestamp ?? null },
    select: { id: true, author: true, content: true, pinned: true, timestamp: true, createdAt: true },
  });

  return NextResponse.json(message, { status: 201 });
}
