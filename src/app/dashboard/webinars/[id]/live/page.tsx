import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import type { WebinarConfig } from "@/lib/webinar-templates";
import { LiveOpsClient } from "./ui/LiveOpsClient";

interface LiveOpsPageProps {
  params: Promise<{ id: string }>;
}

export default async function LiveOpsPage({ params }: LiveOpsPageProps) {
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
    select: {
      id: true,
      name: true,
      status: true,
      code: true,
      slug: true,
      userId: true,
      videoUrl: true,
      startDate: true,
      startTime: true,
      replayEnabled: true,
      config: true,
      macros: true,
    },
  });

  if (!webinar) notFound();

  const { userCanManageWebinar } = await import("@/lib/webinar-access");
  if (!(await userCanManageWebinar(user, webinar.userId))) {
    redirect("/dashboard");
  }

  const initialMacros = (Array.isArray(webinar.macros) ? webinar.macros : []) as unknown[];

  return (
    <LiveOpsClient
      webinarId={webinar.id}
      webinarName={webinar.name}
      webinarCode={webinar.code}
      webinarSlug={webinar.slug}
      initialStatus={webinar.status}
      videoUrl={webinar.videoUrl ?? ""}
      startDate={webinar.startDate?.toISOString() ?? null}
      startTime={webinar.startTime ?? null}
      replayEnabled={webinar.replayEnabled}
      config={webinar.config as WebinarConfig}
      initialMacros={initialMacros}
    />
  );
}
