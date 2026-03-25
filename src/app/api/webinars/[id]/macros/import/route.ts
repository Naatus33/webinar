import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/webinars/[id]/macros/import
 * Importa macros em massa via CSV
 * 
 * Formato CSV esperado:
 * hora,minuto,segundo,nome,mensagem
 * 0,0,30,Saudação,"Olá pessoal! Bem-vindos ao webinar"
 * 0,2,15,Pitch,"Confira nossa oferta especial"
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: webinarId } = await params;
  try {
    const { csvContent } = await req.json();

    if (!csvContent || csvContent.trim().length === 0) {
      return NextResponse.json(
        { error: "CSV vazio" },
        { status: 400 }
      );
    }

    // Parsear CSV
    const lines = csvContent.trim().split("\n");
    const macros: any[] = [];

    // Pular header
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Parsear linha CSV (simples, sem suporte a aspas)
      const parts = line.split(",").map((p: string) => p.trim());
      if (parts.length < 5) continue;

      const [hora, minuto, segundo, nome, ...messageParts] = parts as string[];
      const mensagem = messageParts.join(","); // Suportar vírgulas na mensagem

      // Validar campos
      const h = parseInt(hora as string);
      const m = parseInt(minuto as string);
      const s = parseInt(segundo as string);

      if (isNaN(h) || isNaN(m) || isNaN(s) || h < 0 || m < 0 || s < 0) {
        continue;
      }

      // Converter para segundos totais
      const totalSeconds = h * 3600 + m * 60 + s;

      macros.push({
        id: `macro_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        label: nome as string,
        text: mensagem as string,
        action: "none",
        pin: false,
        timing: {
          hours: h,
          minutes: m,
          seconds: s,
          totalSeconds,
        },
        createdAt: new Date(),
      });
    }

    if (macros.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma macro válida encontrada no CSV" },
        { status: 400 }
      );
    }

    // Atualizar webinar com novas macros
    const webinar = await prisma.webinar.findUnique({
      where: { id: webinarId },
    });

    if (!webinar) {
      return NextResponse.json(
        { error: "Webinar não encontrado" },
        { status: 404 }
      );
    }

    const existingMacros = ((webinar as any).macros as any[]) || [];
    const updatedMacros: any[] = [...existingMacros, ...macros];

    await prisma.webinar.update({
      where: { id: webinarId },
      data: {
        config: {
          ...(webinar as any).config,
          macros: updatedMacros,
        },
      },
    });

    return NextResponse.json({
      success: true,
      imported: macros.length,
      macros,
    });
  } catch (error) {
    console.error("Erro em /api/webinars/[id]/macros/import:", error);
    return NextResponse.json(
      { error: "Erro ao importar macros" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
