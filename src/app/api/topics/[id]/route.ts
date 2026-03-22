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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const { id } = await params;

  const topic = await prisma.topic.findFirst({
    where: { id, userId: user.id },
    select: { id: true, name: true, slug: true },
  });

  if (!topic) {
    return NextResponse.json({ error: "Tema não encontrado" }, { status: 404 });
  }

  const body = (await request.json()) as { name?: string; slug?: string };
  const nextName = typeof body.name === "string" ? body.name.trim() : undefined;
  const nextSlugRaw = typeof body.slug === "string" ? body.slug.trim() : undefined;

  if (!nextName && !nextSlugRaw) {
    return NextResponse.json(
      { error: "Informe ao menos `name` ou `slug` para atualizar" },
      { status: 400 },
    );
  }

  const finalName = nextName && nextName.length > 0 ? nextName : topic.name;
  if (!finalName || finalName.trim().length === 0) {
    return NextResponse.json({ error: "Nome do tema é obrigatório" }, { status: 400 });
  }

  const finalSlug = (() => {
    if (nextSlugRaw && nextSlugRaw.length > 0) return toSlug(nextSlugRaw);
    if (nextName && nextName.length > 0) return toSlug(nextName);
    return topic.slug;
  })();

  if (!finalSlug) {
    return NextResponse.json({ error: "Slug inválido" }, { status: 400 });
  }

  const existingSlug = await prisma.topic.findFirst({
    where: {
      userId: user.id,
      slug: finalSlug,
      NOT: { id: topic.id },
    },
    select: { id: true },
  });

  if (existingSlug) {
    return NextResponse.json({ error: "Já existe um tema com esse slug" }, { status: 400 });
  }

  const updated = await prisma.topic.update({
    where: { id: topic.id },
    data: {
      name: finalName,
      slug: finalSlug,
    },
    select: { id: true, name: true, slug: true, createdAt: true, updatedAt: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const { id } = await params;

  const topic = await prisma.topic.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });

  if (!topic) {
    return NextResponse.json({ error: "Tema não encontrado" }, { status: 404 });
  }

  await prisma.topic.delete({ where: { id: topic.id } });

  return NextResponse.json({ deleted: true });
}

