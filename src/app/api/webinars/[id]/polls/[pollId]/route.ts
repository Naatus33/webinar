import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { assertWebinarManagedByUser } from "@/lib/webinar-access";

type Context = { params: Promise<{ id: string; pollId: string }> };

async function gatePoll(webinarId: string, pollId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { res: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  });
  if (!user) return { res: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    select: { webinarId: true },
  });
  if (!poll || poll.webinarId !== webinarId) {
    return { res: NextResponse.json({ error: "Não encontrado" }, { status: 404 }) };
  }
  const access = await assertWebinarManagedByUser(webinarId, user);
  if (!access.ok) return { res: NextResponse.json({ error: "Sem permissão" }, { status: 403 }) };
  return { ok: true as const };
}

export async function PATCH(request: Request, { params }: Context) {
  const { id: webinarId, pollId } = await params;
  const g = await gatePoll(webinarId, pollId);
  if ("res" in g && g.res) return g.res;

  const { closed } = await request.json();
  const poll = await prisma.poll.update({ where: { id: pollId }, data: { closed: !!closed } });
  return NextResponse.json(poll);
}

export async function DELETE(_req: Request, { params }: Context) {
  const { id: webinarId, pollId } = await params;
  const g = await gatePoll(webinarId, pollId);
  if ("res" in g && g.res) return g.res;

  await prisma.poll.delete({ where: { id: pollId } });
  return NextResponse.json({ ok: true });
}
