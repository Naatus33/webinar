"use client";

import { useEffect, useMemo, useState } from "react";
import type { WebinarConfig } from "./webinar-templates";

export type ChatMessage = {
  id: string;
  author: string;
  content: string;
  type: string;
  replyToContent: string | null;
  replyToAuthor: string | null;
  pinned: boolean;
  timestamp: number | null;
  createdAt: string;
  /** Total de curtidas (servidor). */
  likeCount?: number;
  /** Se este viewer já curtiu (precisa `viewerKey` na URL do stream). */
  heartLiked?: boolean;
};

type PollOption = {
  id: string;
  text: string;
  _count: { votes: number };
};

type Poll = {
  id: string;
  question: string;
  closed: boolean;
  options: PollOption[];
};

type Spots = {
  count: number;
  total: number;
  show: boolean;
};

export type OnlineLead = {
  name: string;
  email: string;
  lastSeenAt: string | null;
  online: boolean;
};

type WebinarSnapshot = {
  messages: ChatMessage[];
  polls: Poll[];
  status: string;
  config: WebinarConfig;
  spots: Spots;
  viewerCount: number;
  liveConnections: number;
  onlineLeads: OnlineLead[];
};

export function useWebinarSse(
  webinarId: string,
  enabled: boolean,
  intervalMs?: number,
  /** Chave estável por aba para curtidas sincronizarem e o servidor saber se você já curtiu. */
  viewerKey?: string | null,
) {
  const [data, setData] = useState<WebinarSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const resolvedIntervalMs = intervalMs ?? 2500;

  const url = useMemo(() => {
    if (!enabled) return null;
    const q = new URLSearchParams();
    q.set("intervalMs", String(resolvedIntervalMs));
    if (viewerKey?.trim()) q.set("viewerKey", viewerKey.trim());
    return `/api/webinars/${webinarId}/stream?${q.toString()}`;
  }, [enabled, webinarId, resolvedIntervalMs, viewerKey]);

  useEffect(() => {
    if (!url) return;

    const es = new EventSource(url);

    const onSnapshot = (e: MessageEvent) => {
      try {
        const snapshot = JSON.parse(e.data) as WebinarSnapshot;
        setData(snapshot);
      } catch {
        // ignore parse errors
      }
    };

    const onError = () => {
      setConnected(false);
    };

    es.onopen = () => setConnected(true);
    es.addEventListener("snapshot", onSnapshot as EventListener);
    es.addEventListener("error", onError);

    return () => {
      try {
        es.close();
      } catch {
        // ignore
      }
      setConnected(false);
    };
  }, [url]);

  return {
    messages: data?.messages ?? [],
    polls: data?.polls ?? [],
    status: data?.status,
    config: data?.config,
    spots: data?.spots ?? { count: 0, total: 0, show: false },
    viewerCount: data?.viewerCount ?? 0,
    liveConnections: data?.liveConnections ?? 0,
    onlineLeads: data?.onlineLeads ?? [],
    connected,
  };
}
