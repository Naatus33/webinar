import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { userCanManageWebinar } from "@/lib/webinar-access";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  });
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 401 });

  const webinar = await prisma.webinar.findUnique({ where: { id } });
  if (!webinar) return NextResponse.json({ error: "Webinar não encontrado" }, { status: 404 });
  if (!(await userCanManageWebinar(user, webinar.userId)))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  const { status } = await request.json();
  if (!status) return NextResponse.json({ error: "Status é obrigatório" }, { status: 400 });

  const updated = await prisma.webinar.update({
    where: { id },
    data: { status },
    select: { id: true, status: true },
  });
  return NextResponse.json(updated);
}
