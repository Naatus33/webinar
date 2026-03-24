import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { webinarWhereForUser } from "@/lib/webinar-access";
import { getTeamSellerMetrics } from "@/lib/team-metrics";
import { DashboardShell } from "@/components/layout/DashboardShell";

import { DashboardExecutive } from "./ui/DashboardExecutive";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true, name: true },
  });

  if (!user) redirect("/login");

  const webinars = await prisma.webinar.findMany({
    where: webinarWhereForUser(user),
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      status: true,
      code: true,
      slug: true,
      startDate: true,
      startTime: true,
      createdAt: true,
      userId: true,
      user: { select: { id: true, name: true, email: true } },
      _count: { select: { leads: true } },
    },
  });

  const totalWebinars = webinars.length;
  const totalLeads = webinars.reduce((sum, w) => sum + w._count.leads, 0);
  const activeWebinars = webinars.filter(
    (w) => w.status === "SCHEDULED" || w.status === "LIVE",
  ).length;
  // Exibe todos os webinars no dashboard (inclui DRAFT, que é o default).
  // Assim o usuário consegue ver os webinars "criados" mesmo antes de agendar/entrar ao vivo.
  const tableWebinars = webinars;

  const teamSellerMetrics = await getTeamSellerMetrics(user);

  return (
    <DashboardShell>
      <main className="flex-1 overflow-auto">
        <DashboardExecutive
          userRole={user.role}
          currentUserId={user.id}
          userName={session.user.name ?? session.user.email}
          stats={{
            totalWebinars,
            totalLeads,
            activeWebinars,
            attendanceRate: null,
          }}
          upcoming={webinars
            .filter((w) => w.status === "SCHEDULED" || w.status === "LIVE")
            .slice(0, 8)
            .map((w) => ({
              id: w.id,
              title: w.name,
              date: w.startDate ?? w.createdAt,
              time: w.startTime,
              leadsCount: w._count.leads,
              isLive: w.status === "LIVE",
            }))}
          webinars={tableWebinars.map((w) => ({
            id: w.id,
            name: w.name,
            startDate: w.startDate,
            leadsCount: w._count.leads,
            attendeesCount: null,
            status: w.status,
            code: w.code,
            slug: w.slug,
            ownerUserId: w.userId,
            ownerName: w.user.name ?? w.user.email,
            startTime: w.startTime,
          }))}
          teamSellerMetrics={teamSellerMetrics ?? undefined}
        />
      </main>
    </DashboardShell>
  );
}
