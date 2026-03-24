import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import {
  mergeUserPreferences,
  parseUserPreferences,
  parseUserPreferencesPatch,
} from "@/lib/user-preferences-schema";
import { THEME_COOKIE } from "@/lib/theme-cookie";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, email: true, name: true, preferences: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  const preferences = parseUserPreferences(user.preferences);

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    preferences,
  });
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const patch = parseUserPreferencesPatch(body);

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, preferences: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
  }

  const prev = parseUserPreferences(user.preferences);
  const next = mergeUserPreferences(prev, patch);

  await prisma.user.update({
    where: { id: user.id },
    data: { preferences: next as object },
  });

  const res = NextResponse.json({ preferences: next });
  res.cookies.set(THEME_COOKIE, next.theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
  });
  return res;
}
