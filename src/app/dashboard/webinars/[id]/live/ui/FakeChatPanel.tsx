"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, Trash2, Copy, CheckCircle2, Clock, Upload,
  Pin, Zap, Play, X, Pencil,
} from "lucide-react";

type MacroAction = "none" | "offer_on" | "scarcity_on";
type MacroTiming = { hours: number; minutes: number; seconds: number; totalSeconds: number };
type Macro = {
  id: string;
  label: string;
  text: string;
  fakeName?: string;
  action: MacroAction;
  pin: boolean;
  timing?: MacroTiming;
};

type WebinarStatus = "DRAFT" | "SCHEDULED" | "LIVE" | "REPLAY" | "FINISHED";

interface FakeChatPanelProps {
  webinarId: string;
  webinarName: string;
  adminName: string;
  currentStatus: WebinarStatus;
  secondsSinceStart: number;
  chatMode: string;
  macros: Macro[];
  onMacrosChange: (macros: Macro[]) => void;
  onSendMacro: (macro: Macro) => void;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function genId() {
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function timingToSeconds(t?: MacroTiming) {
  return t?.totalSeconds ?? 0;
}

const FAKECHAT_MACROS_PANEL_ID = "fakechat-macros-panel";

function parseCsvLine(line: string): string[] {
  const parts: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === "," && !inQuotes) { parts.push(current.trim()); current = ""; continue; }
    current += ch;
  }
  parts.push(current.trim());
  return parts;
}

export function FakeChatPanel({
  webinarId,
  webinarName,
  adminName,
  currentStatus,
  secondsSinceStart,
  chatMode,
  macros,
  onMacrosChange,
  onSendMacro,
}: FakeChatPanelProps) {
  const [firedIds, setFiredIds] = useState<Set<string>>(new Set());
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [csvPreview, setCsvPreview] = useState<Macro[]>([]);
  const [subTab, setSubTab] = useState<"programado" | "rapidas">("programado");

  /** "closed" | "create" | id da macro em edição */
  const [scheduleModal, setScheduleModal] = useState<"closed" | "create" | string>("closed");
  const [formH, setFormH] = useState(0);
  const [formM, setFormM] = useState(0);
  const [formS, setFormS] = useState(0);
  const [formName, setFormName] = useState("");
  const [formText, setFormText] = useState("");
  const [formPin, setFormPin] = useState(false);
  const [formAction, setFormAction] = useState<MacroAction>("none");

  useEffect(() => {
    if (scheduleModal === "closed") return;
    if (scheduleModal === "create") {
      setFormH(0);
      setFormM(0);
      setFormS(0);
      setFormName("");
      setFormText("");
      setFormPin(false);
      setFormAction("none");
      return;
    }
    const m = macros.find((x) => x.id === scheduleModal);
    if (!m?.timing) return;
    setFormH(m.timing.hours);
    setFormM(m.timing.minutes);
    setFormS(m.timing.seconds);
    setFormName(m.fakeName ?? "");
    setFormText(m.text);
    setFormPin(m.pin);
    setFormAction(m.action);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- formulário só sincroniza ao abrir o modal (create ou id)
  }, [scheduleModal]);

  useEffect(() => {
    if (scheduleModal === "closed" && !showCsvModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setScheduleModal("closed");
        setShowCsvModal(false);
        setCsvText("");
        setCsvPreview([]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scheduleModal, showCsvModal]);

  const persistRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /** Com timing = mensagem programada (mesmo com H:M:S em zero até o gestor preencher). Sem timing = resposta rápida. */
  const scheduledMacros = useMemo(
    () => macros
      .filter((m) => m.timing != null)
      .sort((a, b) => timingToSeconds(a.timing) - timingToSeconds(b.timing)),
    [macros],
  );

  const quickMacros = useMemo(
    () => macros.filter((m) => m.timing == null),
    [macros],
  );

  // -- Persistencia com debounce --
  const persistMacros = useCallback((updated: Macro[]) => {
    onMacrosChange(updated);
    clearTimeout(persistRef.current);
    persistRef.current = setTimeout(async () => {
      await fetch(`/api/webinars/${webinarId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ macros: updated }),
      });
    }, 800);
  }, [webinarId, onMacrosChange]);

  // -- Auto-disparo sincronizado com o video --
  useEffect(() => {
    if (currentStatus !== "LIVE" && currentStatus !== "REPLAY") return;
    const floor = Math.floor(secondsSinceStart);
    for (const macro of scheduledMacros) {
      if (!macro.timing || macro.timing.totalSeconds === 0) continue;
      if (floor >= macro.timing.totalSeconds && !firedIds.has(macro.id)) {
        setFiredIds((prev) => new Set(prev).add(macro.id));
        onSendMacro(macro);
      }
    }
  }, [secondsSinceStart, currentStatus, scheduledMacros, firedIds, onSendMacro]);

  // -- Atalhos Ctrl+1..9 para respostas rapidas --
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey) return;
      const num = parseInt(e.key);
      if (isNaN(num) || num < 1 || num > 9) return;
      const macro = quickMacros[num - 1];
      if (macro) { e.preventDefault(); onSendMacro(macro); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [quickMacros, onSendMacro]);

  // -- CRUD --
  function addQuickReply() {
    const newMacro: Macro = {
      id: genId(),
      label: "Nova resposta",
      text: "",
      action: "none",
      pin: false,
    };
    persistMacros([...macros, newMacro]);
  }

  function removeMacro(id: string) {
    persistMacros(macros.filter((m) => m.id !== id));
  }

  function duplicateMacro(macro: Macro) {
    const clone: Macro = { ...macro, id: genId(), timing: macro.timing ? { ...macro.timing } : undefined };
    const idx = macros.findIndex((m) => m.id === macro.id);
    const updated = [...macros];
    updated.splice(idx + 1, 0, clone);
    persistMacros(updated);
  }

  function updateMacro(id: string, patch: Partial<Macro>) {
    persistMacros(macros.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  // -- CSV Import --
  function parseCsv(text: string): Macro[] {
    const lines = text.trim().split("\n");
    const result: Macro[] = [];
    const startIdx = lines[0]?.toLowerCase().includes("hora") ? 1 : 0;
    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = parseCsvLine(line);
      if (parts.length < 5) continue;
      const h = parseInt(parts[0]) || 0;
      const m = parseInt(parts[1]) || 0;
      const s = parseInt(parts[2]) || 0;
      const name = parts[3] || "";
      const msg = parts.slice(4).join(",");
      if (!msg.trim()) continue;
      result.push({
        id: genId(),
        label: msg.slice(0, 25),
        text: msg,
        fakeName: name,
        action: "none",
        pin: false,
        timing: { hours: h, minutes: m, seconds: s, totalSeconds: h * 3600 + m * 60 + s },
      });
    }
    return result;
  }

  function handleCsvPreview() {
    setCsvPreview(parseCsv(csvText));
  }

  function confirmCsvImport() {
    if (csvPreview.length === 0) return;
    persistMacros([...macros, ...csvPreview]);
    setCsvText("");
    setCsvPreview([]);
    setShowCsvModal(false);
  }

  function saveScheduleModal() {
    const text = formText.trim();
    if (!text) return;
    const total = formH * 3600 + formM * 60 + formS;
    const timing: MacroTiming = { hours: formH, minutes: formM, seconds: formS, totalSeconds: total };
    const name = formName.trim();
    const label = text.slice(0, 25);
    if (scheduleModal === "create") {
      persistMacros([
        ...macros,
        {
          id: genId(),
          label,
          text,
          fakeName: name || undefined,
          pin: formPin,
          action: formAction,
          timing,
        },
      ]);
    } else if (scheduleModal !== "closed") {
      persistMacros(
        macros.map((m) =>
          m.id === scheduleModal
            ? { ...m, label, text, fakeName: name || undefined, pin: formPin, action: formAction, timing }
            : m,
        ),
      );
    }
    setScheduleModal("closed");
  }

  // -- Status de cada macro --
  function macroStatus(macro: Macro): "fired" | "next" | "waiting" {
    if (firedIds.has(macro.id)) return "fired";
    const ts = timingToSeconds(macro.timing);
    const floor = Math.floor(secondsSinceStart);
    if (ts > 0 && ts <= floor + 10 && ts > floor) return "next";
    return "waiting";
  }

  // -- Timeline --
  const maxSeconds = useMemo(() => {
    const vals = scheduledMacros.map((m) => timingToSeconds(m.timing));
    return Math.max(...vals, 300);
  }, [scheduledMacros]);

  const statusBadge = (s: "fired" | "next" | "waiting") => {
    if (s === "fired") return <span className="flex items-center gap-1 text-[8px] font-black text-emerald-400"><CheckCircle2 className="h-3 w-3" />DISPARADO</span>;
    if (s === "next") return <span className="flex items-center gap-1 text-[8px] font-black text-blue-400 animate-pulse"><Play className="h-3 w-3" />PRÓXIMO</span>;
    return <span className="flex items-center gap-1 text-[8px] font-black text-amber-500"><Clock className="h-3 w-3" />AGUARDANDO</span>;
  };

  return (
    <div className="space-y-3">
      {/* Sub-tabs */}
      <div className="flex gap-1 bg-slate-900/60 rounded-xl p-1" role="tablist" aria-label="Macros e respostas">
        <button
          type="button"
          role="tab"
          id="fakechat-tab-programado"
          aria-selected={subTab === "programado"}
          aria-controls={FAKECHAT_MACROS_PANEL_ID}
          tabIndex={subTab === "programado" ? 0 : -1}
          onClick={() => setSubTab("programado")}
          className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset ${
            subTab === "programado" ? "bg-primary/10 text-primary" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          Chat Programado ({scheduledMacros.length})
        </button>
        <button
          type="button"
          role="tab"
          id="fakechat-tab-rapidas"
          aria-selected={subTab === "rapidas"}
          aria-controls={FAKECHAT_MACROS_PANEL_ID}
          tabIndex={subTab === "rapidas" ? 0 : -1}
          onClick={() => setSubTab("rapidas")}
          className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset ${
            subTab === "rapidas" ? "bg-primary/10 text-primary" : "text-slate-500 hover:text-slate-300"
          }`}
        >
          Respostas Rápidas ({quickMacros.length})
        </button>
      </div>

      <div
        id={FAKECHAT_MACROS_PANEL_ID}
        role="tabpanel"
        aria-labelledby={subTab === "programado" ? "fakechat-tab-programado" : "fakechat-tab-rapidas"}
        className="space-y-3"
      >
      {/* ====== CHAT PROGRAMADO ====== */}
      {subTab === "programado" && (
        <div className="space-y-3">
          {/* Timeline visual */}
          {scheduledMacros.length > 0 && (
            <div className="relative h-8 bg-slate-900/60 rounded-xl overflow-hidden border border-slate-800/60">
              {/* Barra de progresso */}
              <div
                className="absolute inset-y-0 left-0 bg-primary/10 transition-all duration-1000"
                style={{ width: `${Math.min((secondsSinceStart / (maxSeconds * 1.2)) * 100, 100)}%` }}
              />
              {/* Indicador de posicao atual */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-primary z-10 transition-all duration-1000"
                style={{ left: `${Math.min((secondsSinceStart / (maxSeconds * 1.2)) * 100, 100)}%` }}
              />
              {/* Marcadores */}
              {scheduledMacros.map((m) => {
                const pos = (timingToSeconds(m.timing) / (maxSeconds * 1.2)) * 100;
                const s = macroStatus(m);
                return (
                  <div
                    key={m.id}
                    className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border-2 z-20 transition-all ${
                      s === "fired"
                        ? "bg-emerald-500 border-emerald-400"
                        : s === "next"
                          ? "bg-blue-500 border-blue-400 animate-pulse scale-125"
                          : "bg-slate-600 border-slate-500"
                    }`}
                    style={{ left: `${pos}%` }}
                    title={`${m.fakeName || "Admin"}: ${m.text.slice(0, 40)}... (${pad2(m.timing?.hours ?? 0)}:${pad2(m.timing?.minutes ?? 0)}:${pad2(m.timing?.seconds ?? 0)})`}
                  />
                );
              })}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-500 z-30">
                {pad2(Math.floor(secondsSinceStart / 60))}:{pad2(Math.floor(secondsSinceStart % 60))}
              </div>
            </div>
          )}

          {/* Acoes */}
          <div className="flex gap-2">
            <button type="button" onClick={() => setScheduleModal("create")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[9px] font-black uppercase hover:bg-primary/20 transition-all">
              <Plus className="h-3 w-3" /> Adicionar Fake
            </button>
            <button type="button" onClick={() => setShowCsvModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-[9px] font-black uppercase hover:bg-slate-700 transition-all">
              <Upload className="h-3 w-3" /> Importar CSV
            </button>
          </div>

          {/* Tabela (leitura + modal para editar) */}
          {scheduledMacros.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
              <Zap className="h-8 w-8 text-slate-700" />
              <p className="text-[10px] text-slate-500">Nenhuma mensagem programada.</p>
              <p className="text-[9px] text-slate-700">Adicione fakes ou importe um CSV.</p>
              <button
                type="button"
                onClick={() => setScheduleModal("create")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/10 border border-primary/30 text-primary text-[10px] font-black uppercase hover:bg-primary/20 transition-all"
              >
                <Plus className="h-3.5 w-3.5" /> Abrir modal e criar
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800/60 overflow-hidden">
              {/* Header da tabela */}
              <div className="grid grid-cols-[40px_40px_40px_1fr_1.5fr_auto_auto] gap-0 bg-slate-900/80 border-b border-slate-800/60 px-2 py-1.5">
                <span className="text-[7px] font-black text-slate-600 uppercase">H</span>
                <span className="text-[7px] font-black text-slate-600 uppercase">M</span>
                <span className="text-[7px] font-black text-slate-600 uppercase">S</span>
                <span className="text-[7px] font-black text-slate-600 uppercase pl-1">Nome</span>
                <span className="text-[7px] font-black text-slate-600 uppercase pl-1">Mensagem</span>
                <span className="text-[7px] font-black text-slate-600 uppercase text-center">Status</span>
                <span className="text-[7px] font-black text-slate-600 uppercase text-center">Ações</span>
              </div>

              {/* Linhas */}
              <div className="max-h-[320px] overflow-y-auto scrollbar-hide">
                {scheduledMacros.map((macro) => {
                  const s = macroStatus(macro);
                  return (
                    <div
                      key={macro.id}
                      className={`grid grid-cols-[40px_40px_40px_1fr_1.5fr_auto_auto] gap-0 items-center px-2 py-1 border-b border-slate-800/30 transition-all ${
                        s === "fired"
                          ? "opacity-50 bg-emerald-500/5"
                          : s === "next"
                            ? "bg-blue-500/5 border-blue-500/20"
                            : "hover:bg-slate-800/30"
                      }`}
                    >
                      <span className="text-[10px] text-white text-center font-mono tabular-nums">{macro.timing?.hours ?? 0}</span>
                      <span className="text-[10px] text-white text-center font-mono tabular-nums">{macro.timing?.minutes ?? 0}</span>
                      <span className="text-[10px] text-white text-center font-mono tabular-nums">{macro.timing?.seconds ?? 0}</span>
                      <span className="text-[10px] text-primary font-bold truncate px-1 min-w-0" title={macro.fakeName || "—"}>
                        {macro.fakeName?.trim() || "—"}
                      </span>
                      <span className="text-[10px] text-slate-300 truncate px-1 min-w-0" title={macro.text}>
                        {macro.text || "—"}
                      </span>
                      {/* Status */}
                      <div className="px-1 flex justify-center">
                        {statusBadge(s)}
                      </div>
                      {/* Acoes */}
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => setScheduleModal(macro.id)}
                          className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-primary transition-all"
                          title="Editar no modal"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onSendMacro(macro)}
                          className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-white transition-all"
                          title="Disparar agora"
                        >
                          <Play className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicateMacro(macro)}
                          className="p-1 rounded hover:bg-slate-700 text-slate-500 hover:text-white transition-all"
                          title="Duplicar"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => updateMacro(macro.id, { pin: !macro.pin })}
                          className={`p-1 rounded hover:bg-slate-700 transition-all ${macro.pin ? "text-amber-500" : "text-slate-600 hover:text-slate-400"}`}
                          title="Fixar no chat"
                        >
                          <Pin className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeMacro(macro.id)}
                          className="p-1 rounded hover:bg-red-500/20 text-slate-600 hover:text-red-400 transition-all"
                          title="Remover"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setScheduleModal("create")}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-[9px] font-black text-slate-500 hover:text-primary hover:bg-slate-800/30 transition-all border-t border-slate-800/30"
              >
                <Plus className="h-3 w-3" /> Novo fake (modal)
              </button>
            </div>
          )}
        </div>
      )}

      {/* ====== RESPOSTAS RAPIDAS ====== */}
      {subTab === "rapidas" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
              Ctrl+1..{Math.min(quickMacros.length, 9)} para disparar
            </p>
            <button onClick={addQuickReply} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-[9px] font-black uppercase hover:bg-primary/20 transition-all">
              <Plus className="h-3 w-3" /> Adicionar
            </button>
          </div>

          {quickMacros.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
              <Zap className="h-8 w-8 text-slate-700" />
              <p className="text-[10px] text-slate-500">Nenhuma resposta rápida.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {quickMacros.map((macro, i) => (
                <div key={macro.id} className="group rounded-xl bg-slate-900/40 border border-slate-800 hover:border-primary/30 transition-all overflow-hidden">
                  <div className="flex items-start gap-2 p-2.5">
                    <span className="shrink-0 mt-0.5 text-[8px] font-black bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-full">
                      {i < 9 ? `Ctrl+${i + 1}` : "—"}
                    </span>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <input
                        type="text"
                        value={macro.label}
                        onChange={(e) => updateMacro(macro.id, { label: e.target.value })}
                        placeholder="Nome do atalho..."
                        className="w-full bg-transparent text-[10px] font-black text-white outline-none placeholder:text-slate-700"
                      />
                      <textarea
                        value={macro.text}
                        onChange={(e) => updateMacro(macro.id, { text: e.target.value })}
                        rows={2}
                        placeholder="Mensagem de resposta..."
                        className="w-full bg-transparent text-[9px] text-slate-400 outline-none resize-none placeholder:text-slate-700"
                      />
                      <div className="flex items-center gap-2">
                        <select
                          value={macro.action}
                          onChange={(e) => updateMacro(macro.id, { action: e.target.value as MacroAction })}
                          className="bg-slate-800 border-0 rounded text-[8px] text-slate-400 py-0.5 px-1.5 outline-none"
                        >
                          <option value="none">Só Mensagem</option>
                          <option value="offer_on">+ Ativar Oferta</option>
                          <option value="scarcity_on">+ Urgência + vagas</option>
                        </select>
                        <button
                          onClick={() => updateMacro(macro.id, { pin: !macro.pin })}
                          className={`flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full transition-all ${
                            macro.pin ? "bg-amber-500/10 text-amber-500" : "bg-slate-800 text-slate-600 hover:text-slate-400"
                          }`}
                        >
                          <Pin className="h-2.5 w-2.5" /> Pin
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={() => onSendMacro(macro)} className="p-1 rounded hover:bg-primary/20 text-slate-500 hover:text-primary transition-all" title="Enviar">
                        <Play className="h-3 w-3" />
                      </button>
                      <button onClick={() => duplicateMacro(macro)} className="p-1 rounded hover:bg-slate-700 text-slate-600 hover:text-white transition-all" title="Duplicar">
                        <Copy className="h-3 w-3" />
                      </button>
                      <button onClick={() => removeMacro(macro.id)} className="p-1 rounded hover:bg-red-500/20 text-slate-600 hover:text-red-400 transition-all" title="Remover">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </div>

      {/* Modal: criar / editar fake programado */}
      {scheduleModal !== "closed" && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 backdrop-blur-md p-3"
          role="dialog"
          aria-modal="true"
          aria-labelledby="fake-modal-title"
          onClick={() => setScheduleModal("closed")}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto scrollbar-hide"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 id="fake-modal-title" className="text-sm font-black text-white uppercase tracking-wide">
                  {scheduleModal === "create" ? "Novo fake programado" : "Editar fake"}
                </h3>
                <p className="text-[10px] text-slate-500 mt-1 truncate max-w-[240px]" title={webinarName}>
                  {webinarName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setScheduleModal("closed")}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-white transition-all"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-[9px] text-slate-500 leading-relaxed">
              Disparo automático quando o tempo da sala (sincronizado com o vídeo) atingir H:M:S abaixo.
              {chatMode === "replay" ? " No modo replay, a mensagem recebe o timestamp do momento atual." : ""}
            </p>

            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">Tempo no vídeo (H : M : S)</p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[8px] font-bold text-slate-500 mb-1">Hora</label>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={formH}
                    onChange={(e) => setFormH(Math.min(23, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-2 py-2 text-sm text-white text-center outline-none focus:border-primary/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-bold text-slate-500 mb-1">Min</label>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={formM}
                    onChange={(e) => setFormM(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-2 py-2 text-sm text-white text-center outline-none focus:border-primary/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-bold text-slate-500 mb-1">Seg</label>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={formS}
                    onChange={(e) => setFormS(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-2 py-2 text-sm text-white text-center outline-none focus:border-primary/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-600 mb-1.5">Nome fake (autor no chat)</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex.: Maria Silva"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white outline-none focus:border-primary/50 placeholder:text-slate-600"
              />
              <p className="text-[8px] text-slate-600 mt-1">Vazio = mensagem como {adminName}</p>
            </div>

            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-600 mb-1.5">Mensagem</label>
              <textarea
                value={formText}
                onChange={(e) => setFormText(e.target.value)}
                rows={4}
                placeholder="Texto que aparece no chat..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs text-white outline-none focus:border-primary/50 resize-none placeholder:text-slate-600"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer select-none text-[10px] text-slate-300">
                <input
                  type="checkbox"
                  checked={formPin}
                  onChange={(e) => setFormPin(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-950 text-primary"
                />
                Fixar no chat ao disparar
              </label>
              <select
                value={formAction}
                onChange={(e) => setFormAction(e.target.value as MacroAction)}
                className="rounded-lg border border-slate-800 bg-slate-950 px-2 py-1.5 text-[10px] text-slate-300 outline-none focus:border-primary/50"
              >
                <option value="none">Só mensagem</option>
                <option value="offer_on">+ Ativar oferta</option>
                <option value="scarcity_on">+ Urgência + vagas</option>
              </select>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setScheduleModal("closed")}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-800/50 py-2.5 text-[10px] font-black uppercase text-slate-300 hover:bg-slate-800 transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveScheduleModal}
                disabled={!formText.trim()}
                className="flex-1 rounded-xl bg-primary py-2.5 text-[10px] font-black uppercase text-white hover:brightness-110 transition-all disabled:opacity-40 disabled:pointer-events-none"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: importar CSV */}
      {showCsvModal && (
        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 backdrop-blur-md p-3"
          role="dialog"
          aria-modal="true"
          aria-labelledby="csv-modal-title"
          onClick={() => { setShowCsvModal(false); setCsvText(""); setCsvPreview([]); }}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-5 space-y-3 max-h-[90vh] overflow-y-auto scrollbar-hide"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 id="csv-modal-title" className="text-sm font-black text-white uppercase tracking-wide">Importar CSV</h3>
                <p className="text-[10px] text-slate-500 mt-1">hora,minuto,segundo,nome_fake,mensagem</p>
              </div>
              <button
                type="button"
                onClick={() => { setShowCsvModal(false); setCsvText(""); setCsvPreview([]); }}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-white transition-all"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={6}
              placeholder={"0,0,30,Maria Silva,Que conteúdo incrível!\n0,1,15,João Santos,Estou amando essa aula"}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] text-white font-mono outline-none focus:border-primary/50 resize-none placeholder:text-slate-700"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCsvPreview}
                disabled={!csvText.trim()}
                className="flex-1 py-2 rounded-xl bg-slate-800 text-[10px] font-black text-white hover:bg-slate-700 disabled:opacity-40 transition-all"
              >
                Pré-visualizar
              </button>
            </div>
            {csvPreview.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-black text-emerald-400">{csvPreview.length} mensagens encontradas</p>
                <div className="max-h-40 overflow-y-auto space-y-1 scrollbar-hide rounded-xl border border-slate-800/60 p-2">
                  {csvPreview.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 text-[9px] py-1 px-2 rounded bg-slate-800/50">
                      <span className="text-blue-400 font-mono shrink-0">
                        {pad2(m.timing?.hours ?? 0)}:{pad2(m.timing?.minutes ?? 0)}:{pad2(m.timing?.seconds ?? 0)}
                      </span>
                      <span className="text-primary font-bold shrink-0 max-w-[72px] truncate">{m.fakeName || "—"}</span>
                      <span className="text-slate-400 truncate">{m.text}</span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={confirmCsvImport}
                  className="w-full py-2.5 rounded-xl bg-primary text-[10px] font-black text-white uppercase hover:brightness-110 transition-all"
                >
                  Confirmar importação ({csvPreview.length})
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
