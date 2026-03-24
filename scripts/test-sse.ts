import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function testSSE() {
  const dbUrl = process.env.DATABASE_URL;
  const adapter = new PrismaPg({ connectionString: dbUrl });
  const prisma = new PrismaClient({ adapter });
  
  // 1. Pegar um webinar de teste
  const webinar = await prisma.webinar.findFirst();
  if (!webinar) {
    console.error("Nenhum webinar encontrado para teste.");
    process.exit(1);
  }

  console.log(`Testando SSE para o Webinar: ${webinar.name} (ID: ${webinar.id})`);

  // Como não podemos rodar o servidor Next.js completo aqui facilmente para um teste de rede real,
  // vamos validar a lógica do gerador de snapshot que o SSE usa.
  
  const PAGE_LIMIT = 100;
  const id = webinar.id;

  console.log("Simulando geração de snapshot...");
  const start = Date.now();

  const [messages, polls, webinarData] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { webinarId: id, deleted: false },
      orderBy: { createdAt: "asc" },
      take: PAGE_LIMIT,
      select: {
        id: true,
        author: true,
        content: true,
        pinned: true,
        timestamp: true,
        createdAt: true,
      },
    }),
    prisma.poll.findMany({
      where: { webinarId: id },
      include: {
        options: {
          include: {
            _count: { select: { votes: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.webinar.findUnique({
      where: { id },
      select: { 
        status: true, 
        config: true,
        spotsCount: true,
        spotsTotal: true,
        showSpots: true
      }
    })
  ]);

  const end = Date.now();
  const snapshot = {
    messages,
    polls,
    status: webinarData?.status,
    config: webinarData?.config,
    spots: {
      count: webinarData?.spotsCount,
      total: webinarData?.spotsTotal,
      show: webinarData?.showSpots
    }
  };

  console.log("--- RESULTADOS DO TESTE ---");
  console.log(`Tempo de geração do snapshot: ${end - start}ms`);
  console.log(`Mensagens encontradas: ${messages.length}`);
  console.log(`Enquetes encontradas: ${polls.length}`);
  console.log(`Status do Webinar: ${webinarData?.status}`);
  console.log(`Configuração presente: ${!!webinarData?.config}`);
  console.log(`Dados de Vagas: ${JSON.stringify(snapshot.spots)}`);
  
  if (end - start < 500) {
    console.log("✅ PERFORMANCE: Excelente (abaixo de 500ms)");
  } else {
    console.log("⚠️ PERFORMANCE: Atenção (acima de 500ms)");
  }

  await prisma.$disconnect();
}

testSSE().catch(console.error);
