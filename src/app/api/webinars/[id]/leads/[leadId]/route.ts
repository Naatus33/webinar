import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { assertWebinarManagedByUser } from "@/lib/webinar-access";
import { log } from "@/lib/logger";

type Ctx = { params: Promise<{ id: string; leadId: string }> };

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id: webinarId, leadId } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const access = await assertWebinarManagedByUser(webinarId, user);
  if (!access.ok) {
    return NextResponse.json({ error: "Sem permissão" }, { status: access.status });
  }

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, webinarId },
    select: { id: true },
  });
  if (!lead) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
  }

  await prisma.lead.delete({ where: { id: leadId } });
  log.info("lead.deleted_lgpd", { webinarId, leadId });
  return NextResponse.json({ ok: true });
}
