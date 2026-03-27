import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { WaitingPageClient } from "./ui/WaitingPageClient";
import type { WebinarConfig } from "@/lib/webinar-templates";

interface WaitingPageProps {
  params: Promise<{ code: string; slug: string }>;
}

export default async function WaitingPage({ params }: WaitingPageProps) {
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
      replayEnabled: true,
      config: true,
    },
  });

  if (!webinar) notFound();

  return (
    <WaitingPageClient
      webinar={{
        ...webinar,
        startDate: webinar.startDate?.toISOString() ?? null,
        config: webinar.config as WebinarConfig,
      }}
    />
  );
}
