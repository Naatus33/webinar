import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { assertWebinarManagedByUser } from "@/lib/webinar-access";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  });
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const gate = await assertWebinarManagedByUser(id, user);
  if (!gate.ok) return NextResponse.json({ error: "Sem permissão" }, { status: gate.status === 404 ? 404 : 403 });

  const { readonly } = await request.json();
  const webinar = await prisma.webinar.findUnique({ where: { id } });
  if (!webinar) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config = JSON.parse(JSON.stringify(webinar.config)) as Record<string, any>;
  if (!config.chat) config.chat = {};
  config.chat.readonly = !!readonly;

  await prisma.webinar.update({ where: { id }, data: { config } });
  return NextResponse.json({ ok: true, readonly: !!readonly });
}
