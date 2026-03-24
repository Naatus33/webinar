"use client";

import { useEffect, useMemo, useState } from "react";
import type { WebinarConfig } from "./webinar-templates";

type ChatMessage = {
  id: string;
  author: string;
  content: string;
  pinned: boolean;
  timestamp: number | null;
  createdAt: string;
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

type WebinarSnapshot = {
  messages: ChatMessage[];
  polls: Poll[];
  status: string;
  config: WebinarConfig;
  spots: Spots;
};

export function useWebinarSse(
  webinarId: string,
  enabled: boolean,
  intervalMs?: number,
) {
  const [data, setData] = useState<WebinarSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const resolvedIntervalMs = intervalMs ?? 2500;

  const url = useMemo(
    () =>
      enabled
        ? `/api/webinars/${webinarId}/stream?intervalMs=${resolvedIntervalMs}`
        : null,
    [enabled, webinarId, resolvedIntervalMs],
  );

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
    connected 
  };
}
