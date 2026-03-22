import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

/** GERENTE: vendedores da sua equipe */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  });
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (user.role !== "GERENTE" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Apenas gestores" }, { status: 403 });
  }

  const where =
    user.role === "ADMIN"
      ? { role: "VENDEDOR" as const }
      : { managerId: user.id, role: "VENDEDOR" as const };

  const members = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      _count: { select: { webinars: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ members });
}
