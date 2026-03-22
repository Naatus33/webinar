"use client";

import { useWebinarStore } from "@/store/useWebinarStore";
import { MessageCircle } from "lucide-react";

const SAMPLE_MESSAGES = [
  { author: "Maria S.", content: "Que aula incrível! 🔥", time: "19:03" },
  { author: "João P.", content: "Excelente conteúdo, muito obrigado!", time: "19:04" },
  { author: "Ana R.", content: "Quando vai ter a próxima edição?", time: "19:05" },
  { author: "Carlos M.", content: "Eu precisava muito disso!", time: "19:06" },
];

export function ChatPreview() {
  const { config } = useWebinarStore();
  const { chat, branding } = config;

  if (!chat.enabled) return null;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
      <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
        <MessageCircle className="h-4 w-4" style={{ color: branding.primaryColor }} />
        <span className="text-sm font-medium text-slate-200">
          Chat {chat.mode === "replay" ? "(Replay)" : "ao Vivo"}
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {SAMPLE_MESSAGES.map((msg, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-semibold" style={{ color: branding.primaryColor }}>
                {msg.author}
              </span>
              <span className="text-[10px] text-slate-600">{msg.time}</span>
            </div>
            <p className="text-sm text-slate-300">{msg.content}</p>
          </div>
        ))}
      </div>

      {!chat.readonly && (
        <div className="border-t border-slate-800 p-3">
          <div
            className="flex h-9 w-full items-center rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-500"
          >
            Digite sua mensagem...
          </div>
        </div>
      )}
    </div>
  );
}
