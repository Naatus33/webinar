import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { webinarWhereForUser } from "@/lib/webinar-access";

// GET /api/webinars - lista webinars do usuário logado
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 401 });
  }

  const webinars = await prisma.webinar.findMany({
    where: webinarWhereForUser(user),
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      status: true,
      code: true,
      slug: true,
      startDate: true,
      startTime: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(webinars);
}

// Utilitário para gerar code numérico longo
function generateCode() {
  const random = Math.floor(Math.random() * 10_000_000_000);
  const base = Date.now();
  return String(base) + String(random).padStart(4, "0");
}

// POST /api/webinars - cria novo webinar
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
  const {
    name,
    slug,
    startDate,
    startTime,
    videoUrl,
    config,
    topicIds,
    ...rest
  } = body;

  if (!name || !slug) {
    return NextResponse.json(
      { error: "Nome e slug são obrigatórios" },
      { status: 400 }
    );
  }

  const existingSlug = await prisma.webinar.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (existingSlug) {
    return NextResponse.json(
      { error: "Slug já está em uso" },
      { status: 400 }
    );
  }

  let code = generateCode();
  // Garante unicidade básica do code
  // Em caso de colisão improvável, tenta algumas vezes
  for (let i = 0; i < 3; i++) {
    const exists = await prisma.webinar.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!exists) break;
    code = generateCode();
  }

  const selectedTopicIds = Array.isArray(topicIds)
    ? Array.from(
        new Set(
          topicIds.filter((id: unknown) => typeof id === "string" && id.trim().length > 0),
        ),
      )
    : [];

  let webinarTopics:
    | {
        create: { topicId: string }[];
      }
    | undefined;

  if (selectedTopicIds.length > 0) {
    const topics = await prisma.topic.findMany({
      where: { userId: user.id, id: { in: selectedTopicIds } },
      select: { id: true },
    });

    const found = new Set(topics.map((t) => t.id));
    const invalidIds = selectedTopicIds.filter((id) => !found.has(id));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: "Um ou mais topics não pertencem ao usuário logado." },
        { status: 400 },
      );
    }

    webinarTopics = {
      create: selectedTopicIds.map((id: string) => ({ topicId: id })),
    };
  }

  const webinar = await prisma.webinar.create({
    data: {
      userId: user.id,
      name,
      slug,
      code,
      videoUrl: videoUrl ?? "",
      startDate: startDate ? new Date(startDate) : null,
      startTime: startTime ?? null,
      config: config ?? {},
      // Campos opcionais extras podem ser passados em `rest`
      ...rest,
      ...(webinarTopics ? { webinarTopics } : {}),
    },
    select: {
      id: true,
      code: true,
      slug: true,
      name: true,
      status: true,
      startDate: true,
      startTime: true,
      config: true,
    },
  });

  return NextResponse.json(webinar, { status: 201 });
}

