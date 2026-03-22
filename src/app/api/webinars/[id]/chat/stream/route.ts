import { prisma } from "@/lib/prisma";

import type { NextRequest } from "next/server";

const PAGE_LIMIT = 100;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const url = new URL(req.url);
  const intervalMs = Math.max(
    1000,
    Math.min(10_000, Number(url.searchParams.get("intervalMs") ?? 2500)),
  );

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const sendSseEvent = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(
          encoder.encode(
            `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
          ),
        );
      };

      const sendSnapshot = async () => {
        const messages = await prisma.chatMessage.findMany({
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
        });

        sendSseEvent("snapshot", messages);
      };

      // Primeira carga imediata
      await sendSnapshot().catch(() => {});

      // Heartbeat + snapshots periódicas
      const heartbeat = setInterval(() => {
        sendSseEvent("ping", { ok: true, t: Date.now() });
      }, 15_000);

      const ticker = setInterval(() => {
        void sendSnapshot().catch(() => {});
      }, intervalMs);

      // Fechamento do cliente
      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(ticker);
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // ignore
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

