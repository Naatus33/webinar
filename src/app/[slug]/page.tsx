import { redirect, notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

export default async function SlugLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const webinar = await prisma.webinar.findUnique({
    where: { slug },
    select: { id: true, code: true, slug: true },
  });

  if (!webinar) notFound();

  // O cliente acessa "/{slug}" e já cai direto na tela de captura/credenciais (login por e-mail).
  redirect(`/live/${webinar.code}/${webinar.slug}`);
}

