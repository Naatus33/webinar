"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ExternalLink, Pencil, Trash2, Users, Calendar, Search,
  BarChart3, Play, TrendingUp, Radio, Plus, MoreVertical,
  ArrowUpRight, Clock, Target, Zap, ShoppingCart
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
  DRAFT: { label: "Rascunho", color: "bg-slate-800/50 text-slate-400 border-slate-700", dot: "bg-slate-500" },
  SCHEDULED: { label: "Agendado", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", dot: "bg-blue-500" },
  LIVE: { label: "Ao vivo", color: "bg-red-500/10 text-red-400 border-red-500/20", dot: "bg-red-500 animate-pulse" },
  REPLAY: { label: "Replay", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", dot: "bg-amber-500" },
  FINISHED: { label: "Encerrado", color: "bg-slate-800/80 text-slate-500 border-slate-700/50", dot: "bg-slate-600" },
};

export function DashboardClient({ initialWebinars }: { initialWebinars: Webinar[] }) {
  const router = useRouter();
  const [webinars, setWebinars] = useState(initialWebinars);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("ALL");

  const totalLeads = webinars.reduce((acc, w) => acc + w.leadsCount, 0);
  const activeWebinars = webinars.filter(w => ["LIVE", "SCHEDULED"].includes(w.status)).length;

  const filtered = webinars.filter((w) => {
    const matchesSearch = w.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = 
      activeFilter === "ALL" ? true :
      activeFilter === "ACTIVE" ? ["LIVE", "SCHEDULED"].includes(w.status) :
      activeFilter === "FINISHED" ? ["FINISHED", "REPLAY"].includes(w.status) : true;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8 space-y-10 font-sans">
      
      {/* Header Premium */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">Seus Webinars</h1>
          <p className="text-sm text-slate-500 font-medium">Gerencie seus eventos e acompanhe o crescimento da sua audiência.</p>
        </div>
        <button
          onClick={() => router.push("/webinar/new")}
          className="flex items-center gap-2 bg-primary hover:brightness-110 text-white px-6 py-3 rounded-2xl text-sm font-black transition-all shadow-xl shadow-primary/20 active:scale-95"
        >
          <Plus className="h-5 w-5" /> NOVO WEBINAR
        </button>
      </header>

      {/* KPI Cards Estilizados */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Total de Leads", value: totalLeads.toLocaleString("pt-BR"), icon: Users, color: "text-primary", bg: "bg-primary/5" },
          { label: "Webinars Ativos", value: activeWebinars, icon: Radio, color: "text-emerald-400", bg: "bg-emerald-500/5" },
          { label: "Taxa de Conversão", value: "24.8%", icon: TrendingUp, color: "text-blue-400", bg: "bg-blue-500/5" },
        ].map((kpi, i) => (
          <div key={i} className={`p-8 rounded-[32px] border border-slate-800/60 ${kpi.bg} backdrop-blur-sm space-y-4 shadow-2xl`}>
            <div className="flex items-center justify-between">
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${kpi.bg} border border-white/5`}>
                <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
              </div>
              <ArrowUpRight className="h-5 w-5 text-slate-700" />
            </div>
            <div>
              <p className="text-4xl font-black text-white tabular-nums">{kpi.value}</p>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Lista de Webinars */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 p-2 rounded-2xl border border-slate-800/60">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            {["ALL", "ACTIVE", "FINISHED"].map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${activeFilter === f ? 'bg-slate-800 text-white shadow-inner' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {f === "ALL" ? "Todos" : f === "ACTIVE" ? "Ativos" : "Encerrados"}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-80 px-2">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
            <input 
              type="text" 
              placeholder="Buscar webinar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-12 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-primary outline-none transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filtered.map((w) => {
            const status = STATUS_LABELS[w.status] || STATUS_LABELS.DRAFT;
            return (
              <div key={w.id} className="group bg-slate-900/20 border border-slate-800/60 rounded-[32px] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-slate-900/40 hover:border-primary/30 transition-all shadow-xl">
                <div className="flex items-center gap-6">
                  <div className="h-16 w-16 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center group-hover:border-primary/20 transition-all">
                    <Play className="h-6 w-6 text-primary fill-primary/20" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight group-hover:text-primary transition-all">{w.name}</h3>
                    <div className="flex items-center gap-4 mt-1">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${status.color}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                      <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                        <Users className="h-3 w-3" /> {w.leadsCount} leads
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Link 
                    href={`/dashboard/webinars/${w.id}/live`}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase border border-slate-700 transition-all"
                  >
                    <Zap className="h-3.5 w-3.5 text-primary" /> OPERAR
                  </Link>
                  <Link 
                    href={`/webinar/${w.id}/builder`}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase border border-slate-700 transition-all"
                  >
                    <Pencil className="h-3.5 w-3.5" /> EDITAR
                  </Link>
                  <Link 
                    href={`/dashboard/webinars/${w.id}/sales`}
                    className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase border border-emerald-500/20 transition-all"
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
