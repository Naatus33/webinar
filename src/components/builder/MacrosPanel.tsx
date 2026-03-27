"use client";

import { useState } from "react";
import { Plus, Trash2, Zap, MessageCircle, Pin, Tag, AlertTriangle, Save } from "lucide-react";
import { useWebinarStore } from "@/store/useWebinarStore";

type MacroAction = "none" | "offer_on" | "scarcity_on";

interface Macro {
  id: string;
  label: string;
  text: string;
  fakeName?: string;
  action: MacroAction;
  pin: boolean;
  timing?: {
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
  };
}

export function MacrosPanel() {
  const { macros: storeMacros, updateWebinar } = useWebinarStore();
  const macros = (storeMacros as Macro[]) || [];

  const [editing, setEditing] = useState<Macro | null>(null);
  const [csvInput, setCsvInput] = useState("");
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);

  const addMacro = () => {
    const newMacro: Macro = {
      id: Math.random().toString(36).substr(2, 9),
      label: "Nova Macro",
      text: "Olá {{name}}! Bem-vindo ao webinar.",
      action: "none",
      pin: false,
      timing: { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 },
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

  const importMacrosFromCsv = async () => {
    if (!csvInput.trim()) return;
    setImportingCsv(true);
    try {
      const response = await fetch(`/api/webinars/[id]/macros/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent: csvInput }),
      });
      if (response.ok) {
        const data = await response.json();
        updateWebinar({ macros: [...macros, ...data.macros] });
        setCsvInput("");
        setShowCsvImport(false);
      }
    } catch (err) {
      console.error("Erro ao importar CSV:", err);
    } finally {
      setImportingCsv(false);
    }
  };

  return (
    <div className="space-y-6 p-1">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">Macros de Operação</h3>
          <p className="text-[11px] text-muted-foreground">Configure atalhos para o seu Pitch de Vendas.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCsvImport(!showCsvImport)}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-slate-700 px-3 text-xs font-bold text-white hover:bg-slate-600"
          >
            <Save className="h-3.5 w-3.5" /> Importar CSV
          </button>
          <button
            onClick={addMacro}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground hover:brightness-110"
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </button>
        </div>
      </header>

      {showCsvImport && (
        <div className="rounded-xl border border-border bg-card/50 p-4 space-y-3">
          <div>
            <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Cole o CSV (formato: hora,minuto,segundo,nome_fake,mensagem)
            </label>
            <textarea
              value={csvInput}
              onChange={(e) => setCsvInput(e.target.value)}
              rows={4}
              placeholder="0,0,30,Maria Silva,Que conteúdo incrível!
0,2,15,João Santos,Como garanto minha vaga?"
              className="w-full rounded-lg border border-border bg-background p-3 text-xs outline-none focus:border-primary"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={importMacrosFromCsv}
              disabled={importingCsv || !csvInput.trim()}
              className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50"
            >
              {importingCsv ? "Importando..." : "Importar"}
            </button>
            <button
              onClick={() => { setCsvInput(""); setShowCsvImport(false); }}
              className="flex-1 rounded-lg bg-slate-700 px-3 py-2 text-xs font-bold text-white hover:bg-slate-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

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

              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Nome do Cliente Fake
                </label>
                <input
                  type="text"
                  value={macro.fakeName ?? ""}
                  onChange={(e) => updateMacro(macro.id, { fakeName: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background p-3 text-xs outline-none focus:border-primary"
                  placeholder="Deixe vazio para usar seu nome de admin"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Timing Preciso (H:M:S)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={macro.timing?.hours ?? 0}
                    onChange={(e) => {
                      const h = parseInt(e.target.value) || 0;
                      const m = macro.timing?.minutes ?? 0;
                      const s = macro.timing?.seconds ?? 0;
                      updateMacro(macro.id, {
                        timing: { hours: h, minutes: m, seconds: s, totalSeconds: h * 3600 + m * 60 + s },
                      });
                    }}
                    className="rounded-lg border border-border bg-background p-2 text-xs outline-none focus:border-primary"
                    placeholder="H"
                  />
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={macro.timing?.minutes ?? 0}
                    onChange={(e) => {
                      const h = macro.timing?.hours ?? 0;
                      const m = parseInt(e.target.value) || 0;
                      const s = macro.timing?.seconds ?? 0;
                      updateMacro(macro.id, {
                        timing: { hours: h, minutes: m, seconds: s, totalSeconds: h * 3600 + m * 60 + s },
                      });
                    }}
                    className="rounded-lg border border-border bg-background p-2 text-xs outline-none focus:border-primary"
                    placeholder="M"
                  />
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={macro.timing?.seconds ?? 0}
                    onChange={(e) => {
                      const h = macro.timing?.hours ?? 0;
                      const m = macro.timing?.minutes ?? 0;
                      const s = parseInt(e.target.value) || 0;
                      updateMacro(macro.id, {
                        timing: { hours: h, minutes: m, seconds: s, totalSeconds: h * 3600 + m * 60 + s },
                      });
                    }}
                    className="rounded-lg border border-border bg-background p-2 text-xs outline-none focus:border-primary"
                    placeholder="S"
                  />
                </div>
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

            <div className="mt-4 flex items-center gap-2 border-t border-border/50 pt-3 flex-wrap">
              <div className="flex items-center gap-1.5 rounded-full bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">
                <MessageCircle className="h-3 w-3" /> Chat
              </div>
              {macro.timing && macro.timing.totalSeconds > 0 && (
                <div className="flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2 py-1 text-[10px] font-bold text-blue-600">
                  <AlertTriangle className="h-3 w-3" /> {String(macro.timing.hours).padStart(2, "0")}:{String(macro.timing.minutes).padStart(2, "0")}:{String(macro.timing.seconds).padStart(2, "0")}
                </div>
              )}
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
