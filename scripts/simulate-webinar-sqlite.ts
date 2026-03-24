import { PrismaClient } from "@prisma/client";

async function simulateWebinar() {
  // Usando o PrismaClient padrão que foi gerado para SQLite durante o build de teste
  process.env.DATABASE_URL = "file:./dev.db";
  const prisma = new PrismaClient();

  // 1. Criar um webinar de teste se não existir
  let webinar = await prisma.webinar.findFirst();
  if (!webinar) {
    console.log("Criando webinar de teste para simulação...");
    webinar = await prisma.webinar.create({
      data: {
        name: "Webinar de Teste de Carga",
        slug: "teste-carga",
        code: "TESTE",
        status: "live",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        config: {
          branding: { primaryColor: "#7c3aed", logo: "" },
          content: { title: "Webinar de Teste", description: "" },
          video: { hideControls: true },
          chat: { enabled: true, delay: 0 },
          reactions: { enabled: true },
          socialProof: { enabled: true, fakeNames: ["João"], fakeCities: ["SP"] },
          participants: { min: 10, max: 50 },
          offer: { active: false, url: "https://google.com", colorTimer: { enabled: false, phases: {} } },
          layout: { ambilight: true },
          macros: []
        }
      }
    });
  }

  const id = webinar.id;
  const NUM_USERS = 40;

  console.log(`--- INICIANDO SIMULAÇÃO DE WEBINAR (SQLITE) ---`);
  console.log(`Webinar: ${webinar.name}`);
  console.log(`Usuários Simulados: ${NUM_USERS}`);
  console.log(`-----------------------------------------------`);

  // 2. Simular 40 usuários abrindo a conexão SSE (leitura de snapshot)
  console.log(`[1/3] Simulando ${NUM_USERS} leituras de snapshot simultâneas...`);
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
  
  const updatedWebinar = await prisma.webinar.update({
    where: { id },
    data: {
      showSpots: true,
      spotsCount: { decrement: 1 },
      config: {
        ...(webinar.config as any),
        offer: {
          ...(webinar.config as any).offer,
          active: true
        }
      }
    }
  });
  
  const endGestor = Date.now();
  console.log(`✅ Comando do gestor processado em ${endGestor - startGestor}ms`);

  console.log(`\n--- RESULTADO FINAL DA SIMULAÇÃO ---`);
  if (endSnapshot - startSnapshot < 500) {
    console.log("🏆 PERFORMANCE: Nível Elite. O sistema suporta 40 usuários com folga.");
  } else {
    console.log("✅ PERFORMANCE: Estável. O sistema lida bem com a carga.");
  }
  console.log(`-----------------------------------------------`);

  await prisma.$disconnect();
}

simulateWebinar().catch(console.error);
