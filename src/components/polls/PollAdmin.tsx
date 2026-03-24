"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus, X, Trash2, Lock } from "lucide-react";

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

export function PollAdmin({ webinarId }: { webinarId: string }) {
  const { data: polls = [], mutate } = useSWR<Poll[]>(
    `/api/webinars/${webinarId}/polls`,
    fetcher,
    { refreshInterval: 5000 }
  );

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [creating, setCreating] = useState(false);

  function addOption() {
    setOptions((o) => [...o, ""]);
  }

  function removeOption(i: number) {
    setOptions((o) => o.filter((_, idx) => idx !== i));
  }

  async function createPoll() {
    if (!question.trim() || options.filter(Boolean).length < 2) return;
    setCreating(true);
    await fetch(`/api/webinars/${webinarId}/polls`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, options: options.filter(Boolean) }),
    });
    setQuestion("");
    setOptions(["", ""]);
    setCreating(false);
    mutate();
  }

  async function closePoll(pollId: string) {
    await fetch(`/api/webinars/${webinarId}/polls/${pollId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ closed: true }),
    });
    mutate();
  }

  async function deletePoll(pollId: string) {
    await fetch(`/api/webinars/${webinarId}/polls/${pollId}`, { method: "DELETE" });
    mutate();
  }

  return (
    <div className="space-y-4 p-4">
      <h3 className="text-sm font-semibold text-slate-200">Enquetes ao Vivo</h3>

      {/* Create */}
      <div className="space-y-3 rounded-lg border border-slate-800 p-4">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="h-9 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50 outline-none"
          placeholder="Digite a pergunta..."
        />
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={opt}
              onChange={(e) => setOptions((o) => o.map((v, idx) => idx === i ? e.target.value : v))}
              className="h-8 flex-1 rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-50 outline-none"
              placeholder={`Opção ${i + 1}`}
            />
            {options.length > 2 && (
              <button type="button" onClick={() => removeOption(i)} className="text-slate-500 hover:text-red-400">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        <div className="flex gap-2">
          <button type="button" onClick={addOption} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200">
            <Plus className="h-3.5 w-3.5" /> Opção
          </button>
          <button
            type="button"
            onClick={createPoll}
            disabled={creating}
            className="ml-auto flex h-7 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:brightness-110 disabled:opacity-60"
          >
            {creating ? "Criando..." : "Lançar enquete"}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {polls.map((poll) => {
          const total = poll.options.reduce((acc, o) => acc + o._count.votes, 0);
          return (
            <div key={poll.id} className="rounded-lg border border-slate-800 p-3">
              <div className="mb-2 flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-slate-200">{poll.question}</p>
                <div className="flex gap-1">
                  {!poll.closed && (
                    <button type="button" onClick={() => closePoll(poll.id)} title="Encerrar" className="text-slate-500 hover:text-yellow-400">
                      <Lock className="h-4 w-4" />
                    </button>
                  )}
                  <button type="button" onClick={() => deletePoll(poll.id)} title="Excluir" className="text-slate-500 hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {poll.closed && (
                <span className="mb-2 inline-block rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">Encerrada</span>
              )}
              <div className="space-y-1.5">
                {poll.options.map((opt) => {
                  const pct = total > 0 ? Math.round((opt._count.votes / total) * 100) : 0;
                  return (
                    <div key={opt.id} className="flex items-center gap-2 text-xs">
                      <div className="relative flex-1 overflow-hidden rounded bg-slate-800">
                        <div className="h-5 rounded bg-primary/50 transition-all" style={{ width: `${pct}%` }} />
                        <span className="absolute inset-0 flex items-center px-2 text-slate-300">{opt.text}</span>
                      </div>
                      <span className="w-8 text-right text-slate-400">{pct}%</span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-1.5 text-[10px] text-slate-500">{total} voto{total !== 1 ? "s" : ""}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
