import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/webinars/[id]/chat/suggest
 * Gera sugestões de resposta com IA para o chat master
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: webinarId } = await params;
  try {
    const { context, recentMessages } = await req.json();

    if (!context || context.trim().length === 0) {
      return NextResponse.json({ suggestions: [] });
    }

    // Prompt para gerar sugestões de resposta
    const systemPrompt = `Você é um assistente de chat para webinars. Sua tarefa é gerar 3 sugestões de resposta breves e profissionais para o administrador do webinar.

Regras:
- Cada sugestão deve ter no máximo 100 caracteres
- Sugestões devem ser relevantes e engajadoras
- Use tom profissional mas amigável
- Não inclua emojis
- Respostas devem ser diretas e úteis

Contexto recente do chat:
${recentMessages}

Contexto da pergunta/assunto:
${context}

Gere exatamente 3 sugestões de resposta em formato JSON:
{ "suggestions": ["sugestão 1", "sugestão 2", "sugestão 3"] }`;

    // Chamar API de LLM (usando OpenAI compatível)
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { suggestions: [] },
        { status: 200 }
      );
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      console.error("Erro ao chamar API de LLM:", response.statusText);
      return NextResponse.json({ suggestions: [] });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Parsear resposta JSON
    try {
      const parsed = JSON.parse(content);
      return NextResponse.json({
        suggestions: Array.isArray(parsed.suggestions)
          ? parsed.suggestions.slice(0, 3)
          : [],
      });
    } catch {
      // Se não conseguir parsear, retornar vazio
      return NextResponse.json({ suggestions: [] });
    }
  } catch (error) {
    console.error("Erro em /api/webinars/[id]/chat/suggest:", error);
    return NextResponse.json({ suggestions: [] }, { status: 200 });
  }
}
