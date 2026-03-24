import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SettingsClient } from "./ui/SettingsClient";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  return (
    <div className="min-h-screen bg-app-gradient text-foreground">
      <div className="flex min-h-screen">
        <AppSidebar />

        <div className="flex flex-1 flex-col">
          <AppHeader
            title="Conta e personalização"
            subtitle="Tema do painel, densidade da interface e cores padrão para novos webinars."
            userLabel={session.user.name ?? session.user.email ?? undefined}
          />

          <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-10 pt-6 md:px-6">
            <div className="rounded-2xl border border-border/80 bg-card/50 p-6 shadow-[0_18px_45px_rgba(0,0,0,0.35)] backdrop-blur-sm">
              <SettingsClient />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
