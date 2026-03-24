import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendReminderEmail } from "@/lib/emails";
import { log } from "@/lib/logger";

// Chamado por cron a cada hora (ou por Vercel Cron)
export async function GET(request: Request) {
  // Verificar segredo de autorização do cron
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

  // Encontrar webinars que começam em ~1 hora
  const webinars = await prisma.webinar.findMany({
    where: {
      status: "SCHEDULED",
      startDate: {
        gte: new Date(oneHourLater.getTime() - 5 * 60 * 1000), // ±5 min
        lte: new Date(oneHourLater.getTime() + 5 * 60 * 1000),
      },
    },
    select: {
      id: true,
      name: true,
      code: true,
      slug: true,
      startDate: true,
      startTime: true,
      leads: {
        where: { reminderEmailSentAt: null },
        select: { id: true, name: true, email: true },
      },
    },
  });

  let sent = 0;
  const baseUrl = process.env.NEXTAUTH_URL ?? "https://seudominio.com";

  for (const webinar of webinars) {
    for (const lead of webinar.leads) {
      try {
        const ok = await sendReminderEmail({
          to: lead.email,
          name: lead.name,
          webinarName: webinar.name,
          watchUrl: `${baseUrl}/live/${webinar.code}/${webinar.slug}/watch`,
        });
        if (ok) {
          await prisma.lead.update({
            where: { id: lead.id },
            data: { reminderEmailSentAt: new Date() },
          });
          sent++;
        } else {
          log.warn("cron.reminder_skipped_no_email_provider", { webinarId: webinar.id, leadId: lead.id });
        }
      } catch (err) {
        log.error("cron.reminder_send_failed", { webinarId: webinar.id, leadId: lead.id });
        Sentry.captureException(err);
      }
    }
  }

  log.info("cron.reminder_done", { webinarsProcessed: webinars.length, emailsSent: sent });
  return NextResponse.json({ ok: true, webinarsProcessed: webinars.length, emailsSent: sent });
}
