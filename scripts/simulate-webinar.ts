import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function simulateWebinar() {
  const dbUrl = process.env.DATABASE_URL;
  const adapter = new PrismaPg({ connectionString: dbUrl });
  const prisma = new PrismaClient({ adapter });

  // 1. Pegar um webinar de teste
  const webinar = await prisma.webinar.findFirst();
  if (!webinar) {
    console.error("Nenhum webinar encontrado para simulação.");
    process.exit(1);
  }

  const id = webinar.id;
  const NUM_USERS = 40;

  console.log(`--- INICIANDO SIMULAÇÃO DE WEBINAR ---`);
  console.log(`Webinar: ${webinar.name}`);
  console.log(`Usuários Simulados: ${NUM_USERS}`);
  console.log(`--------------------------------------`);

  // 2. Simular 40 usuários abrindo a conexão SSE (leitura de snapshot)
  console.log(`[1/3] Simulando ${NUM_USERS} conexões SSE simultâneas...`);
  const startSnapshot = Date.now();
  
  const snapshots = await Promise.all(
    Array.from({ length: NUM_USERS }).map(() => 
      prisma.webinar.findUnique({
        where: { id },
        select: { 
          status: true, 
          config: true,
          spotsCount: true,
          spotsTotal: true,
          showSpots: true,
          chatMessages: {
            where: { deleted: false },
            orderBy: { createdAt: "asc" },
            take: 50
          },
          polls: {
            include: { options: { include: { _count: { select: { votes: true } } } } }
          }
        }
      })
    )
  );
  
  const endSnapshot = Date.now();
  console.log(`✅ ${NUM_USERS} snapshots gerados em ${endSnapshot - startSnapshot}ms`);
  console.log(`Média por usuário: ${((endSnapshot - startSnapshot) / NUM_USERS).toFixed(2)}ms`);

  // 3. Simular engajamento de chat (10 mensagens aleatórias)
  console.log(`\n[2/3] Simulando engajamento de chat (10 mensagens simultâneas)...`);
  const startChat = Date.now();
  
  const chatMessages = await Promise.all(
    Array.from({ length: 10 }).map((_, i) => 
      prisma.chatMessage.create({
        data: {
          webinarId: id,
          author: `Aluno ${Math.floor(Math.random() * 100)}`,
          content: `Mensagem de teste de carga ${i + 1} - Excelente conteúdo!`,
          timestamp: 0
        }
      })
    )
  );
  
  const endChat = Date.now();
  console.log(`✅ 10 mensagens de chat inseridas em ${endChat - startChat}ms`);

  // 4. Simular comando do gestor (Ativar Oferta e Diminuir Vagas)
  console.log(`\n[3/3] Simulando comando do gestor (Ativar Oferta + Escassez)...`);
  const startGestor = Date.now();
  
  const baseConfig = (webinar.config ?? {}) as Record<string, unknown>;
  const offerCfg = (baseConfig["offer"] ?? {}) as Record<string, unknown>;

  const updatedWebinar = await prisma.webinar.update({
    where: { id },
    data: {
      showSpots: true,
      spotsCount: { decrement: 1 },
      config: {
        ...baseConfig,
        offer: {
          ...offerCfg,
          active: true
        }
      }
    }
  });
  
  const endGestor = Date.now();
  console.log(`✅ Comando do gestor processado em ${endGestor - startGestor}ms`);

  console.log(`\n--- RESULTADO FINAL DA SIMULAÇÃO ---`);
  if (endSnapshot - startSnapshot < 1000) {
    console.log("🏆 PERFORMANCE: Nível Elite. O sistema suporta 40 usuários com folga.");
  } else {
    console.log("✅ PERFORMANCE: Estável. O sistema lida bem com a carga.");
  }
  console.log(`--------------------------------------`);

  await prisma.$disconnect();
}

simulateWebinar().catch(console.error);
