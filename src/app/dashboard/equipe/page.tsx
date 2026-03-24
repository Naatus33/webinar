import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { EquipeClient, EquipeHeaderActions } from "./ui/EquipeClient";
// EquipeHeaderActions used in main
import { Users } from "lucide-react";

export default async function EquipePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  });
  if (!user) redirect("/login");
  if (user.role === "VENDEDOR") redirect("/dashboard");

  const title =
    user.role === "ADMIN"
      ? "Equipe — Vincular vendedores a gestores"
      : "Minha equipe";

  return (
    <div className="min-h-screen bg-app-gradient text-foreground">
      <div className="flex min-h-screen">
        <AppSidebar />

        <div className="flex flex-1 flex-col">
          <AppHeader
            title={title}
            subtitle={
              user.role === "ADMIN"
                ? "Quem você associar aqui, o gestor poderá gerir no painel."
                : "Vendedores sob sua gestão."
            }
            userLabel={session.user.name ?? session.user.email ?? undefined}
          />

          <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 pb-10 pt-6 md:px-6">
            <div className="mb-4">
              <EquipeHeaderActions />
            </div>
            <div className="mb-6 flex items-center gap-3 rounded-2xl border border-border/80 bg-card/50 p-4 backdrop-blur-sm">
              <Users className="h-10 w-10 text-primary" />
              <div>
                <p className="font-semibold text-foreground">
                  {user.role === "ADMIN" ? "Administração de equipe" : "Painel do gestor"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user.role === "ADMIN"
                    ? "Gestores veem webinars dos vendedores vinculados."
                    : "Seus vendedores e os respectivos webinars aparecem no dashboard principal."}
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-border/80 bg-card/50 p-5 shadow-[0_18px_45px_rgba(0,0,0,0.35)] backdrop-blur-sm">
              <EquipeClient role={user.role === "ADMIN" ? "ADMIN" : "GERENTE"} />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
