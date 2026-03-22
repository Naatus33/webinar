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
    return NextResponse.json({ error: access.status === 404 ? "Não encontrado" : "Sem permissão" }, { status: access.status });
  }

  const [webinar, leadsAll, pingsByMinute, visits, chatMessages] = await Promise.all([
    prisma.webinar.findUnique({ where: { id }, select: { id: true, name: true, status: true } }),
    prisma.lead.findMany({ where: { webinarId: id }, select: { id: true, watchedPercent: true, createdAt: true } }),
    prisma.viewerPing.groupBy({
      by: ["minute"],
      where: { webinarId: id },
      _count: { id: true },
      orderBy: { minute: "asc" },
    }),
    prisma.webinarVisit.count({ where: { webinarId: id } }),
    prisma.chatMessage.count({ where: { webinarId: id, deleted: false } }),
  ]);

  if (!webinar) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  type LeadItem = { id: string; watchedPercent: number | null; createdAt: Date };
  const totalLeads = leadsAll.length;
  const watchedLeads = (leadsAll as LeadItem[]).filter((l) => (l.watchedPercent ?? 0) > 0).length;
  const avgWatched = totalLeads > 0
    ? Math.round((leadsAll as LeadItem[]).reduce((acc, l) => acc + (l.watchedPercent ?? 0), 0) / totalLeads)
    : 0;

  const funnel = [
    { stage: "Visitas", value: visits },
    { stage: "Leads", value: totalLeads },
    { stage: "Assistiram", value: watchedLeads },
    { stage: "50%+ assistido", value: (leadsAll as LeadItem[]).filter((l) => (l.watchedPercent ?? 0) >= 50).length },
  ];

  const retention = pingsByMinute.map((p: { minute: number; _count: { id: number } }) => ({ minute: p.minute, viewers: p._count.id }));

  const leadsByDay: Record<string, number> = {};
  for (const lead of leadsAll as LeadItem[]) {
    const day = lead.createdAt.toISOString().slice(0, 10);
    leadsByDay[day] = (leadsByDay[day] ?? 0) + 1;
  }
  const leadsTrend = Object.entries(leadsByDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  return NextResponse.json({ totalLeads, watchedLeads, avgWatched, visits, chatMessages, funnel, retention, leadsTrend });
}
