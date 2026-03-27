"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Pencil,
  Users,
  Search,
  Play,
  TrendingUp,
  Radio,
  Plus,
  ArrowUpRight,
  Zap,
  ShoppingCart,
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
  DRAFT: {
    label: "Rascunho",
    color: "border-border bg-muted/60 text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  SCHEDULED: {
    label: "Agendado",
    color: "border-primary/30 bg-primary/10 text-primary",
    dot: "bg-primary",
  },
  LIVE: {
    label: "Ao vivo",
    color: "border-primary/40 bg-primary/15 text-primary",
    dot: "animate-pulse bg-primary",
  },
  REPLAY: {
    label: "Replay",
    color: "border-border bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  FINISHED: {
    label: "Encerrado",
    color: "border-border bg-muted/80 text-muted-foreground",
    dot: "bg-muted-foreground/80",
  },
};

export function DashboardClient({ initialWebinars }: { initialWebinars: Webinar[] }) {
  const router = useRouter();
  const [webinars, setWebinars] = useState(initialWebinars);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");

  const totalLeads = webinars.reduce((acc, w) => acc + w.leadsCount, 0);
  const activeWebinars = webinars.filter((w) => ["LIVE", "SCHEDULED"].includes(w.status)).length;

  const filtered = webinars.filter((w) => {
    const matchesSearch = w.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      activeFilter === "ALL"
        ? true
        : activeFilter === "ACTIVE"
          ? ["LIVE", "SCHEDULED"].includes(w.status)
          : activeFilter === "FINISHED"
            ? ["FINISHED", "REPLAY"].includes(w.status)
            : true;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen space-y-10 bg-background p-8 font-sans text-foreground">
      <header className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-foreground">Seus Webinars</h1>
          <p className="text-sm font-medium text-muted-foreground">
            Gerencie seus eventos e acompanhe o crescimento da sua audiência.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/webinar/new")}
          className="flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-black text-primary-foreground shadow-xl shadow-primary/20 transition-all hover:brightness-110 active:scale-95"
        >
          <Plus className="h-5 w-5" /> NOVO WEBINAR
        </button>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[
          {
            label: "Total de Leads",
            value: totalLeads.toLocaleString("pt-BR"),
            icon: Users,
            color: "text-primary",
            bg: "bg-primary/5",
          },
          {
            label: "Webinars Ativos",
            value: activeWebinars,
            icon: Radio,
            color: "text-primary/90",
            bg: "bg-primary/[0.07]",
          },
          {
            label: "Taxa de Conversão",
            value: "24.8%",
            icon: TrendingUp,
            color: "text-muted-foreground",
            bg: "bg-muted/40",
          },
        ].map((kpi, i) => (
          <div
            key={i}
            className={`space-y-4 rounded-[32px] border border-border/60 p-8 shadow-2xl backdrop-blur-sm ${kpi.bg}`}
          >
            <div className="flex items-center justify-between">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 ${kpi.bg}`}
              >
                <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
              </div>
              <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-4xl font-black tabular-nums text-foreground">{kpi.value}</p>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      <section className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/40 p-2 md:flex-row md:items-center md:justify-between">
          <div className="flex rounded-xl border border-border bg-background p-1">
            {["ALL", "ACTIVE", "FINISHED"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setActiveFilter(f)}
                className={`rounded-lg px-6 py-2 text-[10px] font-black uppercase transition-all ${activeFilter === f ? "bg-muted text-foreground shadow-inner" : "text-muted-foreground hover:text-foreground"}`}
              >
                {f === "ALL" ? "Todos" : f === "ACTIVE" ? "Ativos" : "Encerrados"}
              </button>
            ))}
          </div>
          <div className="relative w-full px-2 md:w-80">
            <Search className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar webinar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-input bg-background py-2.5 pl-12 pr-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filtered.map((w) => {
            const status = STATUS_LABELS[w.status] || STATUS_LABELS.DRAFT;
            return (
              <div
                key={w.id}
                className="group flex flex-col justify-between gap-6 rounded-[32px] border border-border/60 bg-card/30 p-6 shadow-xl transition-all hover:border-primary/30 hover:bg-card/50 md:flex-row md:items-center"
              >
                <div className="flex items-center gap-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-background transition-all group-hover:border-primary/20">
                    <Play className="h-6 w-6 fill-primary/20 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-tight text-foreground transition-all group-hover:text-primary">
                      {w.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase ${status.color}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                      <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        <Users className="h-3 w-3" /> {w.leadsCount} leads
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href={`/dashboard/webinars/${w.id}/live`}
                    className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-4 py-2.5 text-[10px] font-black uppercase text-foreground transition-all hover:border-primary/30 hover:bg-muted"
                  >
                    <Zap className="h-3.5 w-3.5 text-primary" /> OPERAR
                  </Link>
                  <Link
                    href={`/webinar/${w.id}/builder`}
                    className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 px-4 py-2.5 text-[10px] font-black uppercase text-foreground transition-all hover:bg-muted"
                  >
                    <Pencil className="h-3.5 w-3.5" /> EDITAR
                  </Link>
                  <Link
                    href={`/dashboard/webinars/${w.id}/sales`}
                    className="flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-4 py-2.5 text-[10px] font-black uppercase text-primary transition-all hover:bg-primary hover:text-primary-foreground"
                  >
                    <ShoppingCart className="h-3.5 w-3.5" /> VENDAS
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
