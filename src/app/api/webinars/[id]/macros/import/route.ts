import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type MacroAction = "none" | "offer_on" | "scarcity_on";
type MacroTiming = {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
};
type Macro = {
  id: string;
  label: string;
  text: string;
  fakeName?: string;
  action: MacroAction;
  pin: boolean;
  timing?: MacroTiming;
  createdAt?: string;
};

/**
 * POST /api/webinars/[id]/macros/import
 * Importa macros em massa via CSV
 * 
 * Formato CSV esperado:
 * hora,minuto,segundo,nome_fake,mensagem
 * 0,0,30,Maria Silva,"Que conteúdo incrível!"
 * 0,2,15,João Santos,"Como garanto minha vaga?"
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: webinarId } = await params;
  try {
    const body = (await req.json()) as unknown;
    const csvContent =
      typeof body === "object" && body !== null && "csvContent" in body
        ? (body as { csvContent?: unknown }).csvContent
        : undefined;

    if (typeof csvContent !== "string" || csvContent.trim().length === 0) {
      return NextResponse.json(
        { error: "CSV vazio" },
        { status: 400 }
      );
    }

    // Parsear CSV
    const lines = csvContent.trim().split("\n");
    const macros: Macro[] = [];

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
        id: `macro_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        label: (mensagem as string).slice(0, 25) || `Macro ${i}`,
        text: mensagem as string,
        fakeName: nome as string,
        action: "none",
        pin: false,
        timing: {
          hours: h,
          minutes: m,
          seconds: s,
          totalSeconds,
        },
        createdAt: new Date().toISOString(),
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
      select: { id: true, macros: true },
    });

    if (!webinar) {
      return NextResponse.json(
        { error: "Webinar não encontrado" },
        { status: 404 }
      );
    }

    const existingMacros = (Array.isArray(webinar.macros) ? webinar.macros : []) as Macro[];
    const updatedMacros: Macro[] = [...existingMacros, ...macros];

    await prisma.webinar.update({
      where: { id: webinarId },
      data: {
        macros: updatedMacros,
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
  }
}
