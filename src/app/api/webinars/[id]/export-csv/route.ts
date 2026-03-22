import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { assertWebinarManagedByUser } from "@/lib/webinar-access";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
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
    return NextResponse.json({ error: "Sem permissão" }, { status: access.status });
  }

  const leads = await prisma.lead.findMany({
    where: { webinarId: id },
    select: { id: true, name: true, email: true, lgpdConsent: true, watchedPercent: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const header = "ID,Nome,E-mail,LGPD,Assitido%,Data";
  type LeadRow = { id: string; name: string; email: string; lgpdConsent: boolean; watchedPercent: number | null; createdAt: Date };
  const rows = (leads as LeadRow[]).map((l) =>
    [l.id, `"${l.name.replace(/"/g, '""')}"`, l.email, l.lgpdConsent ? "Sim" : "Não", l.watchedPercent ?? 0, l.createdAt.toISOString()].join(",")
  );

  return new NextResponse([header, ...rows].join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${id}.csv"`,
    },
  });
}
