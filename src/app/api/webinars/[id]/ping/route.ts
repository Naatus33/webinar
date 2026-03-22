import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { leadId, minute } = await request.json();

  await prisma.viewerPing.create({
    data: { webinarId: id, leadId: leadId ?? null, minute: minute ?? 0 },
  });

  if (leadId && typeof minute === "number") {
    await prisma.lead.updateMany({
      where: { id: leadId },
      data: { watchedPercent: Math.min(100, Math.round(minute)) },
    });
  }

  return NextResponse.json({ ok: true });
}
