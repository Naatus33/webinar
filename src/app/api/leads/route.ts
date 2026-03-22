import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendConfirmationEmail } from "@/lib/emails";

export async function POST(request: Request) {
  const body = await request.json();
  const { webinarId, name, email, lgpdConsent } = body ?? {};

  if (!webinarId || !name || !email) {
    return NextResponse.json(
      { error: "webinarId, nome e e-mail são obrigatórios" },
      { status: 400 }
    );
  }

  const webinar = await prisma.webinar.findUnique({
    where: { id: webinarId },
    select: { id: true, name: true, code: true, slug: true, startDate: true, startTime: true },
  });

  if (!webinar) {
    return NextResponse.json({ error: "Webinar não encontrado" }, { status: 404 });
  }

  const lead = await prisma.lead.create({
    data: {
      webinarId,
      name,
      email,
      lgpdConsent: !!lgpdConsent,
    },
  });

  // Disparar e-mail de confirmação (assíncrono, não bloqueia a resposta)
  const baseUrl = process.env.NEXTAUTH_URL ?? "";
  sendConfirmationEmail({
    to: email,
    name,
    webinarName: webinar.name,
    startDate: webinar.startDate?.toISOString() ?? null,
    startTime: webinar.startTime,
    watchUrl: `${baseUrl}/live/${webinar.code}/${webinar.slug}/watch`,
  }).catch((err) => console.error("[leads] E-mail não enviado:", err));

  return NextResponse.json(
    {
      id: lead.id,
      webinarId: lead.webinarId,
      name: lead.name,
      email: lead.email,
    },
    { status: 201 }
  );
}
