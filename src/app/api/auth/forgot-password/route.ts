import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { addHours } from "date-fns";

import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const { email } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "E-mail obrigatório" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Evita vazar se o e-mail existe ou não
    return NextResponse.json({ ok: true });
  }

  const token = randomBytes(32).toString("hex");

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token,
      expires: addHours(new Date(), 2),
    },
  });

  // TODO: integrar com Resend para envio real
  // Por enquanto apenas loga o link no server.
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/reset-password/${token}`;
  console.log("Password reset URL:", resetUrl);

  return NextResponse.json({ ok: true });
}

