"use client";

import { useState } from "react";
import { Plus, Trash2, Zap, MessageCircle, Pin, Tag, AlertTriangle, Save } from "lucide-react";
import { useWebinarStore } from "@/store/useWebinarStore";

type MacroAction = "none" | "offer_on" | "scarcity_on";

interface Macro {
  id: string;
  label: string;
  text: string;
  action: MacroAction;
  pin: boolean;
}

export function MacrosPanel() {
  const { macros: storeMacros, updateWebinar } = useWebinarStore();
  const macros = (storeMacros as Macro[]) || [];

  const [editing, setEditing] = useState<Macro | null>(null);

  const addMacro = () => {
    const newMacro: Macro = {
      id: Math.random().toString(36).substr(2, 9),
      label: "Nova Macro",
      text: "Olá {{name}}! Bem-vindo ao webinar.",
      action: "none",
      pin: false,
    };
    updateWebinar({ macros: [...macros, newMacro] });
  };

  const removeMacro = (id: string) => {
    updateWebinar({ macros: macros.filter((m) => m.id !== id) });
  };

  const updateMacro = (id: string, patch: Partial<Macro>) => {
    updateWebinar({
      macros: macros.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    });
  };

  return (
    <div className="space-y-6 p-1">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">Macros de Operação</h3>
          <p className="text-[11px] text-muted-foreground">Configure atalhos para o seu Pitch de Vendas.</p>
        </div>
        <button
          onClick={addMacro}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground hover:brightness-110"
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar
        </button>
      </header>

      <div className="space-y-3">
        {macros.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Zap className="mx-auto h-8 w-8 text-muted-foreground/30" />
            <p className="mt-2 text-xs text-muted-foreground">Nenhuma macro configurada.</p>
          </div>
        )}

        {macros.map((macro) => (
          <div
            key={macro.id}
            className="group relative rounded-xl border border-border bg-card/50 p-4 transition hover:border-primary/50"
          >
            <div className="mb-4 flex items-center justify-between">
              <input
                type="text"
                value={macro.label}
                onChange={(e) => updateMacro(macro.id, { label: e.target.value })}
                className="bg-transparent text-sm font-bold text-foreground outline-none focus:text-primary"
                placeholder="Nome da Macro (ex: Pitch de Vendas)"
              />
              <button
                onClick={() => removeMacro(macro.id)}
                className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Mensagem no Chat
                </label>
                <textarea
                  value={macro.text}
                  onChange={(e) => updateMacro(macro.id, { text: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background p-3 text-xs outline-none focus:border-primary"
                  placeholder="Use {{name}} para o nome do participante..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Ação Combinada
                  </label>
                  <select
                    value={macro.action}
                    onChange={(e) => updateMacro(macro.id, { action: e.target.value as MacroAction })}
                    className="w-full rounded-lg border border-border bg-background p-2 text-xs outline-none focus:border-primary"
                  >
                    <option value="none">Apenas Mensagem</option>
                    <option value="offer_on">Ativar Oferta</option>
                    <option value="scarcity_on">Ativar Escassez</option>
                  </select>
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={macro.pin}
                      onChange={(e) => updateMacro(macro.id, { pin: e.target.checked })}
                      className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary"
                    />
                    <span className="text-xs font-medium text-foreground">Fixar no Chat</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 border-t border-border/50 pt-3">
              <div className="flex items-center gap-1.5 rounded-full bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">
                <MessageCircle className="h-3 w-3" /> Chat
              </div>
              {macro.pin && (
                <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-600">
                  <Pin className="h-3 w-3" /> Fixar
                </div>
              )}
              {macro.action === "offer_on" && (
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-600">
                  <Tag className="h-3 w-3" /> Oferta
                </div>
              )}
              {macro.action === "scarcity_on" && (
                <div className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-600">
                  <AlertTriangle className="h-3 w-3" /> Escassez
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
