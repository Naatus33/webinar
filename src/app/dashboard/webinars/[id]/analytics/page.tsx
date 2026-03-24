import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { userCanManageWebinar } from "@/lib/webinar-access";
import { AnalyticsClient } from "./ui/AnalyticsClient";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppHeader } from "@/components/layout/AppHeader";

interface AnalyticsPageProps {
  params: Promise<{ id: string }>;
}

export default async function AnalyticsPage({ params }: AnalyticsPageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true, name: true },
  });
  if (!user) redirect("/login");

  const webinar = await prisma.webinar.findUnique({
    where: { id },
    select: { id: true, name: true, userId: true },
  });

  if (!webinar) notFound();
  if (!(await userCanManageWebinar(user, webinar.userId))) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-app-gradient text-foreground">
      <div className="flex min-h-screen">
        <AppSidebar />

        <div className="flex flex-1 flex-col">
          <AppHeader
            title={`${webinar.name} — Analytics`}
            subtitle="Acompanhe o funil de conversão, retenção e engajamento do seu webinar."
            userLabel={session.user.name ?? session.user.email ?? undefined}
          />

          <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-10 pt-6 md:px-6">
            <div className="rounded-2xl border border-border/80 bg-card/50 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.35)] backdrop-blur-sm">
              <AnalyticsClient webinarId={id} webinarName={webinar.name} />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
