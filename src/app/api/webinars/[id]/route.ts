import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { userCanManageWebinar } from "@/lib/webinar-access";

type RouteContext = { params: Promise<{ id: string }> };

async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) return null;
  return prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  });
}

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const webinar = await prisma.webinar.findUnique({ where: { id } });
  if (!webinar) return NextResponse.json({ error: "Webinar não encontrado" }, { status: 404 });
  if (!(await userCanManageWebinar(user, webinar.userId)))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  return NextResponse.json(webinar);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const webinar = await prisma.webinar.findUnique({ where: { id } });
  if (!webinar) return NextResponse.json({ error: "Webinar não encontrado" }, { status: 404 });
  if (!(await userCanManageWebinar(user, webinar.userId)))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const body = await request.json();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { userId, code, ...data } = body ?? {};

  const updated = await prisma.webinar.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const webinar = await prisma.webinar.findUnique({ where: { id } });
  if (!webinar) return NextResponse.json({ error: "Webinar não encontrado" }, { status: 404 });
  if (!(await userCanManageWebinar(user, webinar.userId)))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  await prisma.webinar.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
