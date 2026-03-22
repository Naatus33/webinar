import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { BuilderClient } from "./ui/BuilderClient";
import type { WebinarConfig } from "@/lib/webinar-templates";

interface BuilderPageProps {
  params: Promise<{ id: string }>;
}

export default async function BuilderPage({ params }: BuilderPageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  });
  if (!user) redirect("/login");

  const webinar = await prisma.webinar.findUnique({
    where: { id },
  });

  if (!webinar) notFound();

  const { userCanManageWebinar } = await import("@/lib/webinar-access");
  if (!(await userCanManageWebinar(user, webinar.userId))) {
    redirect("/dashboard");
  }

  return (
    <BuilderClient
      webinar={{
        id: webinar.id,
        name: webinar.name,
        status: webinar.status,
        code: webinar.code,
        slug: webinar.slug,
        videoUrl: webinar.videoUrl,
        startDate: webinar.startDate?.toISOString() ?? null,
        startTime: webinar.startTime,
        useNativeStreaming: webinar.useNativeStreaming,
        redirectEnabled: webinar.redirectEnabled,
        redirectUrl: webinar.redirectUrl,
        passwordEnabled: webinar.passwordEnabled,
        password: webinar.password,
        replayEnabled: webinar.replayEnabled,
        lgpdEnabled: webinar.lgpdEnabled,
        lgpdText: webinar.lgpdText,
        regBgImage: webinar.regBgImage,
        regLogoUrl: webinar.regLogoUrl,
        regDescription: webinar.regDescription,
        regTitle: webinar.regTitle,
        regCtaText: webinar.regCtaText,
        regSponsors: (webinar.regSponsors as { name: string; logoUrl: string }[]) ?? [],
        config: webinar.config as WebinarConfig,
      }}
    />
  );
}
