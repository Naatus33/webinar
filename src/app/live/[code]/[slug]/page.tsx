import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parsePublicCopyOverridesFromPageSearchParams } from "@/lib/public-copy-personalization";
import { CapturePageClient } from "./ui/CapturePageClient";
import type { WebinarConfig } from "@/lib/webinar-templates";

interface CapturePageProps {
  params: Promise<{ code: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CapturePage({ params, searchParams }: CapturePageProps) {
  const { code, slug } = await params;
  const sp = await searchParams;
  const copyOverrides = parsePublicCopyOverridesFromPageSearchParams(sp);
  const webinar = await prisma.webinar.findFirst({
    where: { code, slug },
    select: {
      id: true,
      name: true,
      code: true,
      slug: true,
      status: true,
      startDate: true,
      startTime: true,
      replayEnabled: true,
      lgpdEnabled: true,
      lgpdText: true,
      passwordEnabled: true,
      password: true,
      regBgImage: true,
      regLogoUrl: true,
      regDescription: true,
      regTitle: true,
      regCtaText: true,
      regSponsors: true,
      config: true,
    },
  });

  if (!webinar) notFound();

  const { password: _omit, ...rest } = webinar;
  const hasCapturePassword = Boolean(_omit);

  // Registrar visita
  await prisma.webinarVisit.create({
    data: { webinarId: webinar.id },
  });

  return (
    <CapturePageClient
      copyOverrides={copyOverrides}
      webinar={{
        ...rest,
        startDate: webinar.startDate?.toISOString() ?? null,
        regSponsors: (webinar.regSponsors as { name: string; logoUrl: string }[]) ?? [],
        config: webinar.config as WebinarConfig,
        hasCapturePassword,
      }}
    />
  );
}
