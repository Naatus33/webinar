import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const heartbeatSchema = z.object({
  name: z.string().min(1).max(80).trim().optional(),
  email: z.string().email().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = heartbeatSchema.safeParse(body);
  const { name, email } = parsed.success ? parsed.data : {};

  const now = new Date();
  const windowStart = new Date(now.getTime() - 90_000); // últimos 90s

  // Atualiza lastSeenAt do lead se email conhecido
  if (email) {
    await prisma.lead.updateMany({
      where: { webinarId: id, email },
      data: { lastSeenAt: now },
    });
  }

  // Conta pings únicos (leads com lastSeenAt nos últimos 90s)
  const activeCount = await prisma.lead.count({
    where: { webinarId: id, lastSeenAt: { gte: windowStart } },
  });

  await prisma.webinar.update({
    where: { id },
    data: { liveViewerCount: activeCount },
  });

  return NextResponse.json({ ok: true, activeCount });
}
