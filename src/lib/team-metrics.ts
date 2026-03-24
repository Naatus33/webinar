import type { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type TeamSellerMetric = {
  id: string;
  name: string | null;
  email: string;
  webinarsCount: number;
  totalLeads: number;
  /** Percentual de leads que clicaram na oferta (conversão de oferta). */
  offerConversionPercent: number | null;
};

/**
 * Métricas agregadas por vendedor para o painel do gestor ou admin.
 * Conversão = leads com `clickedOffer` / total de leads do vendedor.
 */
export async function getTeamSellerMetrics(user: {
  id: string;
  role: Role;
}): Promise<TeamSellerMetric[] | null> {
  if (user.role !== "GERENTE" && user.role !== "ADMIN") {
    return null;
  }

  const where =
    user.role === "ADMIN"
      ? { role: "VENDEDOR" as const }
      : { managerId: user.id, role: "VENDEDOR" as const };

  const sellers = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      _count: { select: { webinars: true } },
    },
    orderBy: { name: "asc" },
  });

  if (sellers.length === 0) {
    return [];
  }

  const sellerIds = sellers.map((s) => s.id);

  const leads = await prisma.lead.findMany({
    where: {
      webinar: { userId: { in: sellerIds } },
    },
    select: {
      clickedOffer: true,
      webinar: { select: { userId: true } },
    },
  });

  const byUser = new Map<string, { total: number; clicked: number }>();
  for (const id of sellerIds) {
    byUser.set(id, { total: 0, clicked: 0 });
  }
  for (const row of leads) {
    const uid = row.webinar.userId;
    const cur = byUser.get(uid);
    if (!cur) continue;
    cur.total += 1;
    if (row.clickedOffer) cur.clicked += 1;
  }

  return sellers.map((s) => {
    const agg = byUser.get(s.id)!;
    const pct =
      agg.total === 0 ? null : Math.round((agg.clicked / agg.total) * 100);
    return {
      id: s.id,
      name: s.name,
      email: s.email,
      webinarsCount: s._count.webinars,
      totalLeads: agg.total,
      offerConversionPercent: pct,
    };
  });
}
