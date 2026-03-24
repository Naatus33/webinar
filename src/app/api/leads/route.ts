import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { sendConfirmationEmail } from "@/lib/emails";
import * as Sentry from "@sentry/nextjs";

import { verifyCaptureAccessToken } from "@/lib/capture-access-token";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";
import { log } from "@/lib/logger";

const leadsBodySchema = z.object({
  webinarId: z.string().min(1),
  name: z.string().min(1).max(200).trim(),
  email: z.string().email().max(320).trim(),
  lgpdConsent: z.boolean().optional(),
  captureAccessToken: z.string().optional(),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";
  const rl = await checkRateLimit(rateLimitKey("leads", ip), { windowMs: 60_000, max: 30 });
  if (!rl.ok) {
    return NextResponse.json({ error: "Muitas tentativas. Tente novamente em instantes." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = leadsBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { webinarId, name, email, lgpdConsent, captureAccessToken } = parsed.data;

  const webinar = await prisma.webinar.findUnique({
    where: { id: webinarId },
    select: {
      id: true,
      name: true,
      code: true,
      slug: true,
      startDate: true,
      startTime: true,
      passwordEnabled: true,
      password: true,
    },
  });

  if (!webinar) {
    return NextResponse.json({ error: "Webinar não encontrado" }, { status: 404 });
  }

  const needsCaptureProof =
    webinar.passwordEnabled && Boolean(webinar.password);
  if (needsCaptureProof && !verifyCaptureAccessToken(captureAccessToken, webinarId)) {
    return NextResponse.json(
      { error: "É necessário validar a senha da página de captura." },
      { status: 403 },
    );
  }

  const lead = await prisma.lead.create({
    data: {
      webinarId,
      name,
      email,
      lgpdConsent: !!lgpdConsent,
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "";
  sendConfirmationEmail({
    to: email,
    name,
    webinarName: webinar.name,
    startDate: webinar.startDate?.toISOString() ?? null,
    startTime: webinar.startTime,
    watchUrl: `${baseUrl}/live/${webinar.code}/${webinar.slug}/watch`,
  }).catch((err) => {
    log.error("leads.confirmation_email_failed", { webinarId });
    Sentry.captureException(err);
  });

  return NextResponse.json(
    {
      id: lead.id,
      webinarId: lead.webinarId,
      name: lead.name,
      email: lead.email,
    },
    { status: 201 },
  );
}
