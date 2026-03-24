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
    select: {
      id: true,
      name: true,
      status: true,
      code: true,
      slug: true,
      videoUrl: true,
      startDate: true,
      startTime: true,
      useNativeStreaming: true,
      redirectEnabled: true,
      redirectUrl: true,
      passwordEnabled: true,
      password: true,
      replayEnabled: true,
      lgpdEnabled: true,
      lgpdText: true,
      regBgImage: true,
      regLogoUrl: true,
      regDescription: true,
      regTitle: true,
      regCtaText: true,
      regSponsors: true,
      config: true,
      macros: true,
      userId: true,
    },
  });

  if (!webinar) notFound();

  const { userCanManageWebinar } = await import("@/lib/webinar-access");
  if (!(await userCanManageWebinar(user, webinar.userId))) {
    redirect("/dashboard");
  }

  const { password: _pw, ...webinarPublic } = webinar;
  const hasCapturePassword = Boolean(_pw);

  return (
    <BuilderClient
      webinar={{
        id: webinarPublic.id,
        name: webinarPublic.name,
        status: webinarPublic.status,
        code: webinarPublic.code,
        slug: webinarPublic.slug,
        videoUrl: webinarPublic.videoUrl,
        startDate: webinarPublic.startDate?.toISOString() ?? null,
        startTime: webinarPublic.startTime,
        useNativeStreaming: webinarPublic.useNativeStreaming,
        redirectEnabled: webinarPublic.redirectEnabled,
        redirectUrl: webinarPublic.redirectUrl,
        passwordEnabled: webinarPublic.passwordEnabled,
        hasCapturePassword,
        replayEnabled: webinarPublic.replayEnabled,
        lgpdEnabled: webinarPublic.lgpdEnabled,
        lgpdText: webinarPublic.lgpdText,
        regBgImage: webinarPublic.regBgImage,
        regLogoUrl: webinarPublic.regLogoUrl,
        regDescription: webinarPublic.regDescription,
        regTitle: webinarPublic.regTitle,
        regCtaText: webinarPublic.regCtaText,
        regSponsors: (webinarPublic.regSponsors as { name: string; logoUrl: string }[]) ?? [],
        config: webinarPublic.config as WebinarConfig,
        macros: (webinarPublic.macros as any[]) ?? [],
      }}
    />
  );
}
