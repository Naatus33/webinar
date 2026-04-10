/**
 * Seed completo para desenvolvimento (PostgreSQL).
 * Rode: yarn db:seed
 */
import "dotenv/config";
import { hash } from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { getDefaultConfig } from "../src/lib/webinar-templates";

const url = process.env.DATABASE_URL;
if (!url || url.startsWith("file:")) {
  console.error("DATABASE_URL deve apontar para PostgreSQL para este seed.");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: url }),
});

const DEMO_SLUGS = ["webinar-lancamento-demo", "rascunho-gestor"] as const;

async function clearDemoWebinars() {
  const rows = await prisma.webinar.findMany({
    where: { slug: { in: [...DEMO_SLUGS] } },
    select: { id: true },
  });
  const webinarIds = rows.map((r) => r.id);
  if (webinarIds.length === 0) return;

  await prisma.chatMessageHeart.deleteMany({
    where: { message: { webinarId: { in: webinarIds } } },
  });
  await prisma.chatMessage.deleteMany({ where: { webinarId: { in: webinarIds } } });
  await prisma.pollVote.deleteMany({
    where: { option: { poll: { webinarId: { in: webinarIds } } } },
  });
  await prisma.pollOption.deleteMany({
    where: { poll: { webinarId: { in: webinarIds } } },
  });
  await prisma.poll.deleteMany({ where: { webinarId: { in: webinarIds } } });
  await prisma.lead.deleteMany({ where: { webinarId: { in: webinarIds } } });
  await prisma.webinarVisit.deleteMany({ where: { webinarId: { in: webinarIds } } });
  await prisma.viewerPing.deleteMany({ where: { webinarId: { in: webinarIds } } });
  await prisma.webinarTopic.deleteMany({ where: { webinarId: { in: webinarIds } } });
  await prisma.webinar.deleteMany({ where: { id: { in: webinarIds } } });
}

function baseConfig() {
  const c = getDefaultConfig();
  return {
    ...c,
    content: {
      title: "Lançamento — Demo Webinar",
      subtitle: "Sessão de demonstração com dados completos no banco",
      description:
        "Este webinar foi criado automaticamente pelo seed para você testar o painel, a página pública e o funil.",
    },
    branding: {
      ...c.branding,
      primaryColor: "#7c3aed",
      secondaryColor: "#0ea5e9",
    },
  };
}

async function main() {
  const pwd = await hash("demo1234", 10);

  const users = [
    { email: "admin@demo.local", name: "Admin", role: "ADMIN" as const },
    { email: "gestor@demo.local", name: "Gestor", role: "GERENTE" as const },
    { email: "vendedor@demo.local", name: "Vendedor", role: "VENDEDOR" as const },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      create: {
        email: u.email,
        name: u.name,
        password: pwd,
        role: u.role,
      },
      update: {
        name: u.name,
        password: pwd,
        role: u.role,
      },
    });
    console.log(`OK: ${u.email} (${u.role}) — senha: demo1234`);
  }

  const adminGlobalPwd = await hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@admin.com" },
    create: {
      email: "admin@admin.com",
      name: "Administrador global",
      password: adminGlobalPwd,
      role: "ADMIN",
    },
    update: {
      name: "Administrador global",
      password: adminGlobalPwd,
      role: "ADMIN",
    },
  });
  console.log("OK: admin@admin.com (ADMIN) — senha: admin123");

  const gestor = await prisma.user.findUniqueOrThrow({
    where: { email: "gestor@demo.local" },
    select: { id: true },
  });
  const vendedor = await prisma.user.findUniqueOrThrow({
    where: { email: "vendedor@demo.local" },
    select: { id: true },
  });

  await prisma.user.update({
    where: { id: vendedor.id },
    data: { managerId: gestor.id },
  });
  console.log("OK: vendedor vinculado ao gestor (equipe).");

  await clearDemoWebinars();

  const topicVendas = await prisma.topic.upsert({
    where: {
      userId_slug: { userId: vendedor.id, slug: "vendas" },
    },
    create: {
      userId: vendedor.id,
      name: "Vendas",
      slug: "vendas",
    },
    update: { name: "Vendas" },
  });

  const topicMarketing = await prisma.topic.upsert({
    where: {
      userId_slug: { userId: vendedor.id, slug: "marketing" },
    },
    create: {
      userId: vendedor.id,
      name: "Marketing",
      slug: "marketing",
    },
    update: { name: "Marketing" },
  });

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(19, 0, 0, 0);

  const cfg1 = baseConfig();
  const cfg2 = {
    ...getDefaultConfig(),
    content: {
      title: "Rascunho do gestor",
      subtitle: "Ainda não publicado",
      description: "Use este card para testar fluxo de rascunho.",
    },
  };

  const macros = [
    {
      id: "m1",
      label: "Boas-vindas",
      text: "Olá! Obrigado por estar aqui.",
      action: "chat",
      pin: false,
    },
    {
      id: "m2",
      label: "Oferta",
      text: "Link da oferta no chat em 5 minutos.",
      action: "chat",
      pin: true,
    },
  ];

  const w1 = await prisma.webinar.create({
    data: {
      userId: vendedor.id,
      code: "920000000001",
      slug: DEMO_SLUGS[0],
      name: "Lançamento Demo",
      status: "SCHEDULED",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      startDate: tomorrow,
      startTime: "19:00",
      regTitle: "Inscreva-se no webinar",
      regDescription: "Preencha para receber o link da sala.",
      regCtaText: "Quero participar",
      config: cfg1 as object,
      macros,
      spotsCount: 12,
      spotsTotal: 50,
      showSpots: true,
      liveViewerCount: 0,
    },
  });

  const w2 = await prisma.webinar.create({
    data: {
      userId: gestor.id,
      code: "920000000002",
      slug: DEMO_SLUGS[1],
      name: "Rascunho interno",
      status: "DRAFT",
      videoUrl: "",
      config: cfg2 as object,
      macros: null,
    },
  });

  await prisma.webinarTopic.createMany({
    data: [
      { webinarId: w1.id, topicId: topicVendas.id },
      { webinarId: w1.id, topicId: topicMarketing.id },
    ],
    skipDuplicates: true,
  });

  const lead1 = await prisma.lead.create({
    data: {
      webinarId: w1.id,
      name: "Maria Silva",
      email: "maria.exemplo@email.com",
      watchedPercent: 45,
      clickedOffer: false,
      lgpdConsent: true,
    },
  });
  await prisma.lead.createMany({
    data: [
      {
        webinarId: w1.id,
        name: "João Santos",
        email: "joao.exemplo@email.com",
        watchedPercent: 10,
        clickedOffer: true,
        lgpdConsent: true,
      },
      {
        webinarId: w1.id,
        name: "Ana Costa",
        email: "ana.exemplo@email.com",
        watchedPercent: 0,
        clickedOffer: false,
        lgpdConsent: false,
      },
    ],
  });

  const msg1 = await prisma.chatMessage.create({
    data: {
      webinarId: w1.id,
      author: "Host",
      content: "Bem-vindos à demonstração do sistema!",
      type: "normal",
    },
  });
  await prisma.chatMessage.create({
    data: {
      webinarId: w1.id,
      author: "Participante",
      content: "Consigo ver o vídeo normalmente.",
      type: "normal",
      replyToAuthor: "Host",
      replyToContent: "Bem-vindos à demonstração do sistema!",
    },
  });

  await prisma.chatMessageHeart.create({
    data: {
      messageId: msg1.id,
      viewerKey: "demo-viewer-1",
    },
  });

  const poll = await prisma.poll.create({
    data: {
      webinarId: w1.id,
      question: "Você já vendeu online antes?",
      closed: false,
      options: {
        create: [{ text: "Sim" }, { text: "Ainda não" }],
      },
    },
    include: { options: true },
  });

  const optSim = poll.options.find((o) => o.text === "Sim");
  if (optSim) {
    await prisma.pollVote.create({
      data: {
        optionId: optSim.id,
        leadId: lead1.id,
      },
    });
  }

  await prisma.webinarVisit.create({
    data: {
      webinarId: w1.id,
      ip: "192.168.1.100",
    },
  });

  await prisma.viewerPing.create({
    data: {
      webinarId: w1.id,
      leadId: lead1.id,
      minute: 12,
    },
  });

  console.log("");
  console.log("Seed de conteúdo demo:");
  console.log(`  Webinar agendado: /live/${w1.code}/${w1.slug} (dono: vendedor)`);
  console.log(`  Rascunho gestor:  ${w2.name} (slug: ${w2.slug})`);
  console.log(`  Tópicos: ${topicVendas.name}, ${topicMarketing.name}`);
  console.log(`  Leads: 3 | Chat: 2 | Enquete: 1 | Visitas/analytics: ok`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    void prisma.$disconnect();
    process.exit(1);
  });
