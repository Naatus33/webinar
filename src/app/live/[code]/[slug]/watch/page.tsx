import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { WatchPageClient } from "./ui/WatchPageClient";
import type { WebinarConfig } from "@/lib/webinar-templates";

interface WatchPageProps {
  params: Promise<{ code: string; slug: string }>;
}

export default async function WatchPage({ params }: WatchPageProps) {
  const { code, slug } = await params;
  const webinar = await prisma.webinar.findFirst({
    where: { code, slug },
    select: {
      id: true,
      name: true,
      code: true,
      slug: true,
      status: true,
      videoUrl: true,
      startDate: true,
      startTime: true,
      replayEnabled: true,
      redirectEnabled: true,
      redirectUrl: true,
      config: true,
    },
  });

  if (!webinar) notFound();

  return (
    <WatchPageClient
      webinar={{
        ...webinar,
        startDate: webinar.startDate?.toISOString() ?? null,
        config: webinar.config as WebinarConfig,
      }}
    />
  );
}
