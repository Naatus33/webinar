import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

const PAGE_LIMIT = 100;

// Mapa em memória de conexões SSE ativas por webinarId
const liveConnections = new Map<string, Set<string>>();

function registerConnection(webinarId: string): string {
  const connId = Math.random().toString(36).slice(2);
  if (!liveConnections.has(webinarId)) liveConnections.set(webinarId, new Set());
  liveConnections.get(webinarId)!.add(connId);
  return connId;
}

function unregisterConnection(webinarId: string, connId: string) {
  liveConnections.get(webinarId)?.delete(connId);
  if (liveConnections.get(webinarId)?.size === 0) liveConnections.delete(webinarId);
}

export function getLiveConnectionCount(webinarId: string): number {
  return liveConnections.get(webinarId)?.size ?? 0;
}

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
  /** Identifica o participante para saber se já curtiu cada mensagem (contagem é global). */
  const viewerKey = url.searchParams.get("viewerKey")?.trim() ?? null;

  const encoder = new TextEncoder();
  const connId = registerConnection(id);

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const sendSseEvent = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(
              `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
            ),
          );
        } catch {
          // controller might be closed
        }
      };

      const windowStart90s = () => new Date(Date.now() - 90_000);

      const sendSnapshot = async () => {
        const [rawMessages, polls, webinar, onlineLeads] = await Promise.all([
          prisma.chatMessage.findMany({
            where: { webinarId: id, deleted: false },
            orderBy: { createdAt: "asc" },
            take: PAGE_LIMIT,
            select: {
              id: true,
              author: true,
              content: true,
              type: true,
              replyToContent: true,
              replyToAuthor: true,
              pinned: true,
              timestamp: true,
              createdAt: true,
            },
          }),
          prisma.poll.findMany({
            where: { webinarId: id },
            include: {
              options: {
                include: { _count: { select: { votes: true } } },
              },
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
              showSpots: true,
              liveViewerCount: true,
            },
          }),
          prisma.lead.findMany({
            where: { webinarId: id },
            select: { name: true, email: true, lastSeenAt: true },
            orderBy: { lastSeenAt: { sort: "desc", nulls: "last" } },
            take: 200,
          }),
        ]);

        /** Curtidas: consulta separada para o stream não falhar se a migração ainda não rodou. */
        const countsById = new Map<string, number>();
        let likedSet = new Set<string>();
        try {
          if (rawMessages.length > 0) {
            const ids = rawMessages.map((m) => m.id);
            const grouped = await prisma.chatMessageHeart.groupBy({
              by: ["messageId"],
              where: { messageId: { in: ids } },
              _count: { _all: true },
            });
            for (const g of grouped) {
              countsById.set(g.messageId, g._count._all);
            }
            if (viewerKey) {
              const likedRows = await prisma.chatMessageHeart.findMany({
                where: { viewerKey, messageId: { in: ids } },
                select: { messageId: true },
              });
              likedSet = new Set(likedRows.map((r) => r.messageId));
            }
          }
        } catch {
          /* tabela ChatMessageHeart ausente ou erro — chat ao vivo continua */
        }

        const messages = rawMessages.map((m) => ({
          id: m.id,
          author: m.author,
          content: m.content,
          type: m.type,
          replyToContent: m.replyToContent,
          replyToAuthor: m.replyToAuthor,
          pinned: m.pinned,
          timestamp: m.timestamp,
          createdAt: m.createdAt,
          likeCount: countsById.get(m.id) ?? 0,
          heartLiked: Boolean(viewerKey && likedSet.has(m.id)),
        }));

        sendSseEvent("snapshot", {
          messages,
          polls,
          status: webinar?.status,
          config: webinar?.config,
          spots: {
            count: webinar?.spotsCount,
            total: webinar?.spotsTotal,
            show: webinar?.showSpots,
          },
          viewerCount: webinar?.liveViewerCount ?? 0,
          liveConnections: getLiveConnectionCount(id),
          onlineLeads: onlineLeads.map((l) => ({
            name: l.name,
            email: l.email,
            lastSeenAt: l.lastSeenAt?.toISOString() ?? null,
            online: l.lastSeenAt ? l.lastSeenAt >= windowStart90s() : false,
          })),
        });
      };

      await sendSnapshot().catch(() => {});

      const heartbeat = setInterval(() => {
        sendSseEvent("ping", { ok: true, t: Date.now() });
      }, 15_000);

      const ticker = setInterval(() => {
        void sendSnapshot().catch(() => {});
      }, intervalMs);

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(ticker);
        clearInterval(heartbeat);
        unregisterConnection(id, connId);
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
