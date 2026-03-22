import { Resend } from "resend";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export async function sendConfirmationEmail({
  to,
  name,
  webinarName,
  startDate,
  startTime,
  watchUrl,
}: {
  to: string;
  name: string;
  webinarName: string;
  startDate: string | null;
  startTime: string | null;
  watchUrl: string;
}) {
  const resend = getResend();
  if (!resend) {
    console.warn("[emails] RESEND_API_KEY não configurada. E-mail não enviado.");
    return;
  }

  const dateStr = startDate
    ? new Date(startDate).toLocaleDateString("pt-BR")
    : null;

  const body = `
    <div style="font-family: sans-serif; max-width: 520px; margin: auto; color: #1e293b;">
      <h2 style="color: #7c3aed;">Você está inscrito! ✓</h2>
      <p>Olá <strong>${name}</strong>, obrigado por se inscrever no webinar <strong>${webinarName}</strong>.</p>
      ${dateStr ? `<p>O webinar começa em <strong>${dateStr}${startTime ? ` às ${startTime}` : ""}</strong>.</p>` : ""}
      <a href="${watchUrl}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;">
        Acessar o webinar
      </a>
      <p style="margin-top:24px;font-size:12px;color:#94a3b8;">Se você não se inscreveu, ignore este e-mail.</p>
    </div>
  `;

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "webinar@webinarpro.com.br",
    to,
    subject: `Você está inscrito — ${webinarName}`,
    html: body,
  });
}

export async function sendReminderEmail({
  to,
  name,
  webinarName,
  watchUrl,
}: {
  to: string;
  name: string;
  webinarName: string;
  watchUrl: string;
}) {
  const resend = getResend();
  if (!resend) return;

  const body = `
    <div style="font-family: sans-serif; max-width: 520px; margin: auto; color: #1e293b;">
      <h2 style="color: #7c3aed;">⏰ O webinar começa em 1 hora!</h2>
      <p>Olá <strong>${name}</strong>, não esqueça! O webinar <strong>${webinarName}</strong> começa em menos de 1 hora.</p>
      <a href="${watchUrl}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#7c3aed;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;">
        Entrar no webinar
      </a>
    </div>
  `;

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "webinar@webinarpro.com.br",
    to,
    subject: `Lembrete: ${webinarName} começa em 1 hora!`,
    html: body,
  });
}
