import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CapturePageClient } from "./ui/CapturePageClient";
import type { WebinarConfig } from "@/lib/webinar-templates";

interface CapturePageProps {
  params: Promise<{ code: string; slug: string }>;
}

export default async function CapturePage({ params }: CapturePageProps) {
  const { code, slug } = await params;
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

  // Registrar visita
  await prisma.webinarVisit.create({
    data: { webinarId: webinar.id },
  });

  return (
    <CapturePageClient
      webinar={{
        ...webinar,
        startDate: webinar.startDate?.toISOString() ?? null,
        regSponsors: (webinar.regSponsors as { name: string; logoUrl: string }[]) ?? [],
        config: webinar.config as WebinarConfig,
      }}
    />
  );
}
