"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";

export function AppProviders({ children }: { children: ReactNode }) {
  // #region agent log
  fetch("http://127.0.0.1:7890/ingest/61bd3893-904e-42a5-a9f0-b0555de820c3", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "47a313",
    },
    body: JSON.stringify({
      sessionId: "47a313",
      runId: "pre-fix-context",
      hypothesisId: "CTX1",
      location: "providers.tsx:8",
      message: "AppProviders render",
      data: {},
      // eslint-disable-next-line react-hooks/purity
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion agent log

  return <SessionProvider>{children}</SessionProvider>;
}

