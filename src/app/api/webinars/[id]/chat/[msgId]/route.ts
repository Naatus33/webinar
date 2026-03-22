import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { assertWebinarManagedByUser } from "@/lib/webinar-access";

type Context = { params: Promise<{ id: string; msgId: string }> };

async function gateModeration(webinarId: string, msgId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  });
  if (!user) return { error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) };
  const msg = await prisma.chatMessage.findUnique({
    where: { id: msgId },
    select: { webinarId: true },
  });
  if (!msg || msg.webinarId !== webinarId) {
    return { error: NextResponse.json({ error: "Mensagem não encontrada" }, { status: 404 }) };
  }
  const gate = await assertWebinarManagedByUser(webinarId, user);
  if (!gate.ok) {
    return { error: NextResponse.json({ error: "Sem permissão" }, { status: 403 }) };
  }
  return { user };
}

export async function PATCH(_req: Request, { params }: Context) {
  const { id: webinarId, msgId } = await params;
  const g = await gateModeration(webinarId, msgId);
  if ("error" in g && g.error) return g.error;

  const message = await prisma.chatMessage.update({
    where: { id: msgId },
    data: { pinned: true },
    select: { id: true, pinned: true },
  });
  return NextResponse.json(message);
}

export async function DELETE(_req: Request, { params }: Context) {
  const { id: webinarId, msgId } = await params;
  const g = await gateModeration(webinarId, msgId);
  if ("error" in g && g.error) return g.error;

  await prisma.chatMessage.update({ where: { id: msgId }, data: { deleted: true } });
  return NextResponse.json({ ok: true });
}
