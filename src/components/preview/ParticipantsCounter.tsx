"use client";

import { useEffect, useState } from "react";
import { useWebinarStore } from "@/store/useWebinarStore";
import { Users } from "lucide-react";

export function ParticipantsCounter() {
  const { config } = useWebinarStore();
  const { participants } = config;

  // Inicializa com null para evitar hydration mismatch (Math.random() no servidor ≠ cliente)
  const [count, setCount] = useState<number | null>(null);

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7890/ingest/61bd3893-904e-42a5-a9f0-b0555de820c3',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f0bdc6'},body:JSON.stringify({sessionId:'f0bdc6',location:'ParticipantsCounter.tsx:useEffect-init',message:'Initial count set on client only',data:{min:participants.min,max:participants.max},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
    
    let isMounted = true;
    setTimeout(() => {
        if (isMounted) {
            const initial = Math.floor(Math.random() * (participants.max - participants.min + 1)) + participants.min;
            setCount(initial);
        }
    }, 0);
    return () => { isMounted = false; };
  }, [participants.min, participants.max]);
  // #endregion

  useEffect(() => {
    if (!participants.autoVariation) return;
    const interval = setInterval(() => {
      const delta = Math.floor(Math.random() * 21) - 10;
      setCount((c) => {
        if (c === null) return null;
        return Math.min(participants.max, Math.max(participants.min, c + delta));
      });
    }, 30_000 + Math.random() * 30_000);
    return () => clearInterval(interval);
  }, [participants]);

  if (!participants.enabled || count === null) return null;

  return (
    <div className="flex items-center gap-1.5 text-sm text-slate-300">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
      </span>
      <Users className="h-4 w-4 text-slate-400" />
      <span className="font-semibold">{count.toLocaleString("pt-BR")}</span>
      <span className="text-slate-500">assistindo</span>
    </div>
  );
}
