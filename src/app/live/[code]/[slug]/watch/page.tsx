import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parsePublicCopyOverridesFromPageSearchParams } from "@/lib/public-copy-personalization";
import { WatchPageClient } from "./ui/WatchPageClient";
import type { WebinarConfig } from "@/lib/webinar-templates";

interface WatchPageProps {
  params: Promise<{ code: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function WatchPage({ params, searchParams }: WatchPageProps) {
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
      copyOverrides={copyOverrides}
      webinar={{
        ...webinar,
        startDate: webinar.startDate?.toISOString() ?? null,
        config: webinar.config as WebinarConfig,
      }}
    />
  );
}
