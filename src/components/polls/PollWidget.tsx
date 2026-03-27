"use client";

import { useState } from "react";
import useSWR from "swr";

interface PollOption {
  id: string;
  text: string;
  _count: { votes: number };
}

interface Poll {
  id: string;
  question: string;
  closed: boolean;
  options: PollOption[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function PollWidget({ webinarId, leadId }: { webinarId: string; leadId?: string }) {
  const { data: polls = [], mutate } = useSWR<Poll[]>(
    `/api/webinars/${webinarId}/polls`,
    fetcher,
    { refreshInterval: 5000 }
  );

  const [voted, setVoted] = useState<Record<string, string>>({}); // pollId -> optionId

  const activePoll = polls.find((p) => !p.closed);
  if (!activePoll) return null;

  const totalVotes = activePoll.options.reduce((acc, o) => acc + o._count.votes, 0);
  const hasVoted = voted[activePoll.id];

  async function vote(optionId: string) {
    await fetch(`/api/webinars/${webinarId}/polls/${activePoll!.id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId, leadId }),
    });
    setVoted((v) => ({ ...v, [activePoll!.id]: optionId }));
    mutate();
  }

  return (
    <div className="rounded-xl border border-border bg-card/90 p-4 backdrop-blur-sm">
      <p className="mb-3 text-sm font-semibold text-foreground">{activePoll.question}</p>
      <div className="space-y-2">
        {activePoll.options.map((opt) => {
          const pct = totalVotes > 0 ? Math.round((opt._count.votes / totalVotes) * 100) : 0;
          const isVoted = hasVoted === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={!!hasVoted || activePoll.closed}
              onClick={() => vote(opt.id)}
              className="relative w-full overflow-hidden rounded-lg border border-border px-3 py-2 text-left text-sm text-foreground disabled:cursor-default"
            >
              {hasVoted && (
                <div
                  className="absolute inset-y-0 left-0 rounded-lg transition-all"
                  style={{ width: `${pct}%`, backgroundColor: isVoted ? "#8b0000" : "#525252" }}
                />
              )}
              <span className="relative z-10 flex items-center justify-between">
                <span>{opt.text}</span>
                {hasVoted && <span className="text-xs text-muted-foreground">{pct}%</span>}
              </span>
            </button>
          );
        })}
      </div>
      {!hasVoted && !activePoll.closed && (
        <p className="mt-2 text-xs text-muted-foreground">Clique para votar</p>
      )}
      {totalVotes > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          {totalVotes} voto{totalVotes !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
