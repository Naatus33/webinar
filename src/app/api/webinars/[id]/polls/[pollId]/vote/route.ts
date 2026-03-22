import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string; pollId: string }> };

export async function POST(request: Request, { params }: Context) {
  const { pollId } = await params;
  const { optionId, leadId } = await request.json();
  if (!optionId) return NextResponse.json({ error: "optionId é obrigatório" }, { status: 400 });

  const poll = await prisma.poll.findUnique({ where: { id: pollId } });
  if (!poll || poll.closed) return NextResponse.json({ error: "Enquete não encontrada ou encerrada" }, { status: 400 });

  if (leadId) {
    const existing = await prisma.pollVote.findFirst({
      where: { option: { pollId }, leadId },
    });
    if (existing) return NextResponse.json({ error: "Você já votou" }, { status: 409 });
  }

  const vote = await prisma.pollVote.create({ data: { optionId, leadId: leadId ?? null } });
  return NextResponse.json({ ok: true, vote });
}
