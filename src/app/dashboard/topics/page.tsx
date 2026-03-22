import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { TopicsDashboardClient } from "./ui/TopicsDashboardClient";

export default async function TopicsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true, name: true },
  });
  if (!user) redirect("/login");

  if (user.role === "VENDEDOR") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-app-gradient text-slate-50">
      <div className="flex min-h-screen">
        <AppSidebar />

        <div className="flex flex-1 flex-col">
          <AppHeader
            title="Temas — Gerenciar"
            subtitle="Crie, edite e organize os temas utilizados nos webinars."
            userLabel={session.user.name ?? session.user.email ?? undefined}
          />

          <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-10 pt-6 md:px-6">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.95)]">
              <TopicsDashboardClient />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

