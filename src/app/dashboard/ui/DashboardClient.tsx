"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  Pencil,
  Trash2,
  Users,
  Calendar,
  Search,
  BarChart3,
  Play,
  TrendingUp,
  Radio,
} from "lucide-react";

interface Webinar {
  id: string;
  name: string;
  status: string;
  code: string;
  slug: string;
  startDate: string | null;
  startTime: string | null;
  createdAt: string;
  leadsCount: number;
}

const STATUS_LABELS: Record<string, { label: string; color: string; dot: string }> = {
  DRAFT: { label: "Rascunho", color: "bg-slate-800/50 text-slate-400 border border-slate-700", dot: "bg-slate-500" },
  SCHEDULED: { label: "Agendado", color: "bg-blue-500/10 text-blue-400 border border-blue-500/20", dot: "bg-blue-500" },
  LIVE: { label: "Ao vivo", color: "bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse-slow", dot: "bg-red-500 animate-ping" },
  REPLAY: { label: "Replay", color: "bg-amber-500/10 text-amber-400 border border-amber-500/20", dot: "bg-amber-500" },
  FINISHED: { label: "Encerrado", color: "bg-slate-800/80 text-slate-500 border border-slate-700/50", dot: "bg-slate-600" },
};

type FilterType = "ALL" | "ACTIVE" | "FINISHED" | "DRAFT";

export function DashboardClient({ initialWebinars }: { initialWebinars: Webinar[] }) {
  const router = useRouter();
  const [webinars, setWebinars] = useState(initialWebinars);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");
  const [deleting, setDeleting] = useState<string | null>(null);

  // Computed Metrics
  const totalLeads = webinars.reduce((acc, w) => acc + w.leadsCount, 0);
  const activeWebinars = webinars.filter(w => ["LIVE", "SCHEDULED"].includes(w.status)).length;
  const avgLeads = webinars.length ? Math.round(totalLeads / webinars.length) : 0;

  const filtered = webinars.filter((w) => {
    const matchesSearch = w.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = 
      activeFilter === "ALL" ? true :
      activeFilter === "ACTIVE" ? ["LIVE", "SCHEDULED"].includes(w.status) :
      activeFilter === "FINISHED" ? ["FINISHED", "REPLAY"].includes(w.status) :
      activeFilter === "DRAFT" ? w.status === "DRAFT" : true;
      
    return matchesSearch && matchesFilter;
  });

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este webinar? Esta ação não pode ser desfeita.")) return;
    setDeleting(id);
    const res = await fetch(`/api/webinars/${id}`, { method: "DELETE" });
    if (res.ok) {
      setWebinars((prev) => prev.filter((w) => w.id !== id));
    }
    setDeleting(null);
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header com Call to Action Principal */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Visão Geral</h1>
          <p className="text-sm text-muted-foreground">Acompanhe a performance dos seus webinars e leads.</p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/webinar/new")}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground shadow-[0_8px_28px_rgba(249,177,122,0.35)] transition motion-safe:hover:scale-[1.02] motion-safe:hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
        >
          <Play className="h-4 w-4 fill-current" />
          Criar Novo Webinar
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-card/50 p-5 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Users className="h-4 w-4 text-primary" />
            Total de Leads
          </div>
          <div className="text-3xl font-bold text-foreground">{totalLeads.toLocaleString("pt-BR")}</div>
        </div>
        <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-card/50 p-5 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Radio className="h-4 w-4 text-emerald-400" />
            Webinars Ativos
          </div>
          <div className="text-3xl font-bold text-foreground">{activeWebinars}</div>
        </div>
        <div className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-card/50 p-5 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-blue-400" />
            Média de Leads / Webinar
          </div>
          <div className="text-3xl font-bold text-foreground">{avgLeads}</div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Controles de Lista: Busca e Filtros */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border/60 bg-card/30 p-2">
          
          <div className="flex items-center gap-1 overflow-x-auto p-1 scrollbar-none">
            {[
              { id: "ALL", label: "Todos" },
              { id: "ACTIVE", label: "Ativos" },
              { id: "FINISHED", label: "Encerrados" },
              { id: "DRAFT", label: "Rascunhos" }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id as FilterType)}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap motion-transition ${
                  activeFilter === f.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:max-w-xs px-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar webinar..."
              className="h-9 w-full rounded-lg border border-border bg-background/60 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground transition focus:border-primary focus:ring-1 focus:ring-primary/40"
            />
          </div>
        </div>

        {/* Lista de Webinars */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center bg-card/20">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
              <Play className="h-6 w-6 text-muted-foreground ml-1" />
            </div>
            <p className="text-base font-medium text-foreground">
              {search || activeFilter !== "ALL" ? "Nenhum webinar encontrado com estes filtros" : "Você ainda não tem webinars"}
            </p>
            <p className="text-sm text-muted-foreground mt-1 mb-6 max-w-sm">
              Crie seu primeiro evento ao vivo ou gravado para começar a capturar leads e gerar vendas.
            </p>
            {!search && activeFilter === "ALL" && (
              <button
                type="button"
                onClick={() => router.push("/webinar/new")}
                className="flex h-10 items-center rounded-xl bg-primary px-6 text-sm font-medium text-primary-foreground shadow-[0_8px_24px_rgba(249,177,122,0.3)] transition hover:brightness-110"
              >
                Criar primeiro webinar
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/80 bg-card/40 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Webinar
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Data
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Métricas
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((w) => {
                  const statusInfo = STATUS_LABELS[w.status] ?? STATUS_LABELS["DRAFT"];
                  return (
                    <tr
                      key={w.id}
                      className="group bg-transparent transition-colors hover:bg-muted/30"
                    >
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground group-hover:text-primary motion-transition">{w.name}</span>
                          <span className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px] sm:max-w-xs">
                            /live/{w.code}/{w.slug}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={[
                            "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
                            statusInfo.color,
                          ].join(" ")}
                        >
                          <span className={["h-1.5 w-1.5 rounded-full", statusInfo.dot].join(" ")} />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-foreground/90">
                        {w.startDate ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="flex items-center gap-1.5 font-medium text-foreground/90">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              {new Date(w.startDate).toLocaleDateString("pt-BR")}
                            </span>
                            {w.startTime && (
                              <span className="text-xs text-muted-foreground ml-5">{w.startTime}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground font-medium">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 items-center justify-center rounded-lg bg-muted/80 px-2.5 text-xs font-medium text-foreground border border-border/50">
                            <Users className="mr-1.5 h-3.5 w-3.5 text-primary" />
                            {w.leadsCount}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-60 transition-opacity group-hover:opacity-100">
                          <a
                            href={`/live/${w.code}/${w.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Ver página pública"
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                          <Link
                            href={`/dashboard/webinars/${w.id}/analytics`}
                            title="Analytics"
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/webinar/${w.id}/builder`}
                            title="Editar"
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary transition-colors hover:bg-primary/25 hover:text-primary"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDelete(w.id)}
                            disabled={deleting === w.id}
                            title="Excluir"
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-400 transition-colors hover:bg-red-500/20 hover:text-red-300 disabled:opacity-40"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
