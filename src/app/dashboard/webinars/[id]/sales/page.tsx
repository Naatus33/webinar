import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SalesDashboardClient } from "./ui/SalesDashboardClient";

export default async function SalesPage({ params }: { params: { id: string } }) {
  const webinar = await prisma.webinar.findUnique({
    where: { id: params.id },
    select: { id: true, name: true },
  });

  if (!webinar) notFound();

  return <SalesDashboardClient webinarId={webinar.id} webinarName={webinar.name} />;
}
