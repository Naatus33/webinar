"use client";

import { useState } from "react";
import { BarChart3, CheckCircle2, Lock } from "lucide-react";

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

export function PollDisplay({ 
  poll, 
  webinarId,
  onVote 
}: { 
  poll: Poll; 
  webinarId: string;
  onVote?: (optionId: string) => void;
}) {
  const [votedOptionId, setVotedOptionId] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);

  const totalVotes = poll.options.reduce((acc, o) => acc + o._count.votes, 0);

  async function handleVote(optionId: string) {
    if (votedOptionId || poll.closed || voting) return;
    
    setVoting(true);
    try {
      const res = await fetch(`/api/webinars/${webinarId}/polls/${poll.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId }),
      });
      
      if (res.ok) {
        setVotedOptionId(optionId);
        if (onVote) onVote(optionId);
      }
    } finally {
      setVoting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 shadow-xl animate-in fade-in zoom-in-95 duration-300">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary/20 p-1.5 rounded-lg">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Enquete ao Vivo</h4>
        </div>
        {poll.closed && (
          <div className="flex items-center gap-1.5 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-500">
            <Lock className="h-3 w-3" /> Encerrada
          </div>
        )}
      </div>

      <p className="mb-4 text-sm font-bold text-white leading-tight">{poll.question}</p>

      <div className="space-y-2.5">
        {poll.options.map((opt) => {
          const isVoted = votedOptionId === opt.id;
          const showResults = votedOptionId !== null || poll.closed;
          const percentage = totalVotes > 0 ? Math.round((opt._count.votes / totalVotes) * 100) : 0;

          return (
            <button
              key={opt.id}
              disabled={showResults || voting}
              onClick={() => handleVote(opt.id)}
              className={`
                relative w-full overflow-hidden rounded-xl border transition-all duration-300
                ${isVoted ? 'border-primary bg-primary/10' : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'}
                ${showResults ? 'cursor-default' : 'cursor-pointer active:scale-[0.98]'}
              `}
            >
              {/* Barra de Progresso (Resultado) */}
              {showResults && (
                <div 
                  className={`absolute inset-y-0 left-0 transition-all duration-1000 ease-out ${isVoted ? 'bg-primary/20' : 'bg-slate-800/50'}`}
                  style={{ width: `${percentage}%` }}
                />
              )}

              <div className="relative flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  {isVoted && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                  <span className={`text-xs font-medium ${isVoted ? 'text-primary' : 'text-slate-300'}`}>
                    {opt.text}
                  </span>
                </div>
                {showResults && (
                  <span className="text-[10px] font-black text-slate-500">{percentage}%</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between text-[10px] font-bold text-slate-600 uppercase tracking-tighter">
        <span>{totalVotes} voto{totalVotes !== 1 ? 's' : ''}</span>
        {!votedOptionId && !poll.closed && <span>Selecione uma opção</span>}
      </div>
    </div>
  );
}
