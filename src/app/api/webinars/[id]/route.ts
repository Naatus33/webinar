import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { userCanManageWebinar } from "@/lib/webinar-access";
import { hashCapturePassword } from "@/lib/capture-password";
import { webinarPatchSchema } from "@/lib/webinar-patch-schema";

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- não enviar hash ao cliente
  const { password: _pw, ...safe } = webinar;
  return NextResponse.json(safe);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const webinar = await prisma.webinar.findUnique({ where: { id } });
  if (!webinar) return NextResponse.json({ error: "Webinar não encontrado" }, { status: 404 });
  if (!(await userCanManageWebinar(user, webinar.userId)))
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { userId, code, ...raw } = (body ?? {}) as Record<string, unknown>;
  const parsed = webinarPatchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Campos inválidos ou não permitidos" }, { status: 400 });
  }

  if (parsed.data.customScripts !== undefined && user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Apenas administradores podem alterar scripts personalizados." },
      { status: 403 },
    );
  }

  const input = parsed.data;
  const { password: plainPassword, startDate, ...rest } = input;
  const data = { ...rest } as Prisma.WebinarUpdateInput;

  if (startDate !== undefined) {
    data.startDate = startDate ? new Date(startDate) : null;
  }

  if (plainPassword !== undefined) {
    if (plainPassword === null || plainPassword === "") {
      data.password = null;
    } else {
      data.password = await hashCapturePassword(plainPassword);
    }
  }

  const updated = await prisma.webinar.update({ where: { id }, data });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- não enviar hash ao cliente
  const { password: _pw2, ...safe } = updated;
  return NextResponse.json(safe);
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
