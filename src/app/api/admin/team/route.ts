import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  });
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

/** ADMIN: lista usuários para vincular vendedor ↔ gestor */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      managerId: true,
      manager: { select: { id: true, name: true, email: true } },
      _count: { select: { webinars: true } },
    },
  });

  return NextResponse.json({ users });
}

/**
 * ADMIN: define gestor do vendedor
 * body: { userId: string, managerId: string | null }
 */
export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const body = await request.json();
  const userId = typeof body.userId === "string" ? body.userId : "";
  const managerId =
    body.managerId === null || body.managerId === ""
      ? null
      : typeof body.managerId === "string"
        ? body.managerId
        : null;

  if (!userId) {
    return NextResponse.json({ error: "userId obrigatório" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!target) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  if (target.role !== "VENDEDOR") {
    return NextResponse.json(
      { error: "Apenas vendedores podem ter um gestor atribuído" },
      { status: 400 },
    );
  }

  if (managerId) {
    const mgr = await prisma.user.findUnique({
      where: { id: managerId },
      select: { id: true, role: true },
    });
    if (!mgr || (mgr.role !== "GERENTE" && mgr.role !== "ADMIN")) {
      return NextResponse.json({ error: "Gestor inválido" }, { status: 400 });
    }
    if (managerId === userId) {
      return NextResponse.json({ error: "Inválido" }, { status: 400 });
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { managerId },
  });

  return NextResponse.json({ ok: true });
}
