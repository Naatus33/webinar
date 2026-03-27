import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const heartbeatSchema = z.object({
  name: z.string().min(1).max(80).trim().optional(),
  email: z.string().email().optional(),
  viewerKey: z.string().min(8).max(100).optional(),
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
  const { name, email, viewerKey } = parsed.success ? parsed.data : {};

  const now = new Date();
  const windowStart = new Date(now.getTime() - 90_000); // últimos 90s

  // Presença: cria lead se ainda não existir (ex.: entrou direto na sala com nome/e-mail na URL)
  // e sempre atualiza lastSeenAt quando o par webinar+e-mail bate.
  const trimmedName = name?.trim() ?? "";
  const fallbackEmail = viewerKey ? `viewer-${viewerKey.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 48)}@anon.local` : undefined;
  const identityEmail = email ?? fallbackEmail;

  if (identityEmail && trimmedName) {
    const existing = await prisma.lead.findFirst({
      where: { webinarId: id, email: identityEmail },
      select: { id: true, name: true },
    });
    if (existing) {
      await prisma.lead.update({
        where: { id: existing.id },
        data: {
          lastSeenAt: now,
          ...(trimmedName !== existing.name
            ? { name: trimmedName.slice(0, 200) }
            : {}),
        },
      });
    } else {
      await prisma.lead.create({
        data: {
          webinarId: id,
          email: identityEmail,
          name: trimmedName.slice(0, 200),
          lastSeenAt: now,
        },
      });
    }
  } else if (identityEmail) {
    await prisma.lead.updateMany({
      where: { webinarId: id, email: identityEmail },
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
