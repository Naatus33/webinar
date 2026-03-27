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
  /** Total de curtidas no servidor. */
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

type Listener = {
  setData: (s: WebinarSnapshot | null) => void;
  setConnected: (c: boolean) => void;
};

type PoolEntry = {
  es: EventSource;
  listeners: Set<Listener>;
  refCount: number;
};

const pool = new Map<string, PoolEntry>();
const pendingClose = new Map<string, ReturnType<typeof setTimeout>>();

/** React Strict Mode desmonta e remonta em <~50ms; fechar só após esse atraso evita NS_BINDING_ABORTED. */
const CLOSE_DELAY_MS = 600;

function subscribeStream(url: string, listener: Listener): () => void {
  const pending = pendingClose.get(url);
  if (pending != null) {
    clearTimeout(pending);
    pendingClose.delete(url);
  }

  let entry = pool.get(url);
  if (!entry) {
    const es = new EventSource(url);
    entry = { es, listeners: new Set(), refCount: 0 };

    const onSnapshot = (e: MessageEvent) => {
      try {
        const snapshot = JSON.parse(e.data) as WebinarSnapshot;
        entry!.listeners.forEach((L) => L.setData(snapshot));
      } catch {
        /* ignore */
      }
    };

    const onError = () => {
      entry!.listeners.forEach((L) => L.setConnected(false));
    };

    es.onopen = () => {
      entry!.listeners.forEach((L) => L.setConnected(true));
    };
    es.addEventListener("snapshot", onSnapshot as EventListener);
    es.addEventListener("error", onError);

    pool.set(url, entry);
  }

  entry.refCount += 1;
  entry.listeners.add(listener);
  if (entry.es.readyState === EventSource.OPEN) {
    listener.setConnected(true);
  }

  return () => {
    const e = pool.get(url);
    if (!e) return;
    e.listeners.delete(listener);
    e.refCount -= 1;

    if (e.refCount <= 0) {
      const tid = setTimeout(() => {
        pendingClose.delete(url);
        const e2 = pool.get(url);
        if (e2 && e2.refCount <= 0) {
          try {
            e2.es.close();
          } catch {
            /* noop */
          }
          pool.delete(url);
        }
      }, CLOSE_DELAY_MS);
      pendingClose.set(url, tid);
    }
  };
}

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

    const listener: Listener = { setData: setData, setConnected: setConnected };
    const unsubscribe = subscribeStream(url, listener);

    return () => {
      unsubscribe();
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
