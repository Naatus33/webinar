import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FinishedPageClient } from "./ui/FinishedPageClient";
import type { WebinarConfig } from "@/lib/webinar-templates";

interface FinishedPageProps {
  params: Promise<{ code: string; slug: string }>;
}

export default async function FinishedPage({ params }: FinishedPageProps) {
  const { code, slug } = await params;
  const webinar = await prisma.webinar.findFirst({
    where: { code, slug },
    select: { id: true, name: true, redirectEnabled: true, redirectUrl: true, config: true },
  });

  if (!webinar) notFound();

  if (webinar.redirectEnabled && webinar.redirectUrl) {
    redirect(webinar.redirectUrl);
  }

  return (
    <FinishedPageClient
      webinar={{
        id: webinar.id,
        name: webinar.name,
        redirectEnabled: webinar.redirectEnabled,
        redirectUrl: webinar.redirectUrl,
        config: webinar.config as WebinarConfig,
      }}
    />
  );
}
