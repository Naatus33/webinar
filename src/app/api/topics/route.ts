import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

function toSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 401 });
  }

  const topics = await prisma.topic.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(topics);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 401 });
  }

  const body = await request.json();
  const { name, slug } = body as { name?: string; slug?: string };

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Nome do tema é obrigatório" }, { status: 400 });
  }

  const finalSlug = toSlug((slug && slug.trim().length > 0 ? slug : name).trim());

  if (!finalSlug) {
    return NextResponse.json({ error: "Slug inválido" }, { status: 400 });
  }

  const existing = await prisma.topic.findFirst({
    where: { userId: user.id, slug: finalSlug },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json({ error: "Já existe um tema com esse slug" }, { status: 400 });
  }

  const topic = await prisma.topic.create({
    data: {
      userId: user.id,
      name: name.trim(),
      slug: finalSlug,
    },
    select: { id: true, name: true, slug: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json(topic, { status: 201 });
}

