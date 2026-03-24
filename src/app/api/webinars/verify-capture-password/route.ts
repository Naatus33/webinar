import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { signCaptureAccessToken } from "@/lib/capture-access-token";
import { hashCapturePassword, verifyCapturePassword } from "@/lib/capture-password";
import { checkRateLimit, rateLimitKey } from "@/lib/rate-limit";

const bodySchema = z.object({
  code: z.string().min(1),
  slug: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown";
  const rl = await checkRateLimit(rateLimitKey("verify-capture", ip), { windowMs: 60_000, max: 20 });
  if (!rl.ok) {
    return NextResponse.json({ error: "Muitas tentativas. Tente novamente em instantes." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { code, slug, password } = parsed.data;

  const webinar = await prisma.webinar.findFirst({
    where: { code, slug },
    select: {
      id: true,
      passwordEnabled: true,
      password: true,
    },
  });

  if (!webinar) {
    return NextResponse.json({ error: "Webinar não encontrado" }, { status: 404 });
  }

  if (!webinar.passwordEnabled) {
    return NextResponse.json(
      { error: "Este webinar não exige senha na captura" },
      { status: 400 },
    );
  }

  const ok = await verifyCapturePassword(password, webinar.password);
  if (!ok) {
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }

  if (webinar.password && !webinar.password.startsWith("$2")) {
    const hashed = await hashCapturePassword(password);
    await prisma.webinar.update({
      where: { id: webinar.id },
      data: { password: hashed },
    });
  }

  const token = signCaptureAccessToken(webinar.id);
  return NextResponse.json({ ok: true, token });
}
