import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { assertWebinarManagedByUser } from "@/lib/webinar-access";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const polls = await prisma.poll.findMany({
    where: { webinarId: id },
    orderBy: { createdAt: "desc" },
    include: { options: { include: { _count: { select: { votes: true } } } } },
  });
  return NextResponse.json(polls);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  });
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const access = await assertWebinarManagedByUser(id, user);
  if (!access.ok) {
    return NextResponse.json({ error: "Sem permissão" }, { status: access.status === 404 ? 404 : 403 });
  }

  const { question, options } = await request.json();
  if (!question || !Array.isArray(options) || options.length < 2)
    return NextResponse.json({ error: "Pergunta e ao menos 2 opções são obrigatórias" }, { status: 400 });

  const poll = await prisma.poll.create({
    data: {
      webinarId: id,
      question,
      options: { create: options.map((o: string) => ({ text: o })) },
    },
    include: { options: { include: { _count: { select: { votes: true } } } } },
  });
  return NextResponse.json(poll, { status: 201 });
}
