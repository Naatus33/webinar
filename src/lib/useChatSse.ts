"use client";

import { useEffect, useMemo, useState } from "react";

type ChatMessage = {
  id: string;
  author: string;
  content: string;
  pinned: boolean;
  timestamp: number | null;
  createdAt: string;
};

export function useChatSse(
  webinarId: string,
  enabled: boolean,
  intervalMs?: number,
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const resolvedIntervalMs = intervalMs ?? 2500;

  const url = useMemo(
    () =>
      enabled
        ? `/api/webinars/${webinarId}/chat/stream?intervalMs=${resolvedIntervalMs}`
        : null,
    [enabled, webinarId, resolvedIntervalMs],
  );

  useEffect(() => {
    if (!url) return;

    const es = new EventSource(url);

    const onSnapshot = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as ChatMessage[];
        setMessages(data);
      } catch {
        // ignore parse errors
      }
    };

    const onError = () => {
      // 'error' pode acontecer e fechar, mas React não precisa travar a tela.
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

  return { messages, connected };
}

