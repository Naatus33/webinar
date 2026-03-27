"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import {
  Users,
  ShoppingCart,
  MousePointer2,
  MessageCircle,
  Search,
  Download,
  TrendingUp,
  Star,
  Phone,
  Mail,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  lastActive?: string;
  clickedOffer: boolean;
  messagesCount: number;
  watchedPercentage: number;
  isHot: boolean;
}

interface SalesData {
  totalLeads: number;
  hotLeadsCount: number;
  offerClicks: number;
  conversionRate: number;
  leads: Lead[];
}

export function SalesDashboardClient({ webinarId, webinarName }: { webinarId: string; webinarName: string }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "hot" | "clicked">("all");

  const { data, isLoading } = useSWR<SalesData>(
    `/api/webinars/${webinarId}/sales-data`,
    fetcher,
    { refreshInterval: 15_000 },
  );

  const filteredLeads = useMemo(() => {
    if (!data?.leads) return [];
    return data.leads.filter((lead) => {
      const matchesSearch =
        lead.name.toLowerCase().includes(search.toLowerCase()) ||
        lead.email.toLowerCase().includes(search.toLowerCase());
      const matchesFilter =
        filter === "all" ? true : filter === "hot" ? lead.isHot : filter === "clicked" ? lead.clickedOffer : true;
      return matchesSearch && matchesFilter;
    });
  }, [data, search, filter]);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-8 bg-background p-8 font-sans text-foreground">
      <header className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10">
              <ShoppingCart className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-foreground">Painel de Vendas</h1>
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Gerencie seus leads quentes e maximize as conversões do{" "}
            <span className="text-foreground/90">{webinarName}</span>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-xs font-black transition-all hover:bg-muted"
          >
            <Download className="h-4 w-4" /> EXPORTAR LEADS
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {[
          {
            label: "Total de Leads",
            value: data?.totalLeads || 0,
            icon: Users,
            color: "text-muted-foreground",
            bg: "bg-muted/30",
          },
          {
            label: "Leads Quentes",
            value: data?.hotLeadsCount || 0,
            icon: Star,
            color: "text-primary",
            bg: "bg-primary/5",
          },
          {
            label: "Cliques na Oferta",
            value: data?.offerClicks || 0,
            icon: MousePointer2,
            color: "text-primary",
            bg: "bg-primary/5",
          },
          {
            label: "Taxa de Cliques",
            value: `${data?.conversionRate || 0}%`,
            icon: TrendingUp,
            color: "text-foreground",
            bg: "bg-muted/40",
          },
        ].map((kpi, i) => (
          <div
            key={i}
            className={`space-y-3 rounded-[32px] border border-border/60 p-6 shadow-xl backdrop-blur-sm ${kpi.bg}`}
          >
            <div className="flex items-center justify-between">
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Tempo Real
              </span>
            </div>
            <div>
              <p className="text-3xl font-black tabular-nums text-foreground">{kpi.value}</p>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-[40px] border border-border/60 bg-card/40 shadow-2xl">
        <div className="flex flex-col justify-between gap-6 border-b border-border/60 bg-muted/20 p-8 md:flex-row md:items-center">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <h2 className="text-lg font-black uppercase tracking-widest text-foreground">Gestão de Leads</h2>
            <div className="flex rounded-xl border border-border bg-background p-1">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`rounded-lg px-4 py-1.5 text-[10px] font-black uppercase transition-all ${filter === "all" ? "bg-muted text-foreground shadow-inner" : "text-muted-foreground hover:text-foreground"}`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setFilter("hot")}
                className={`rounded-lg px-4 py-1.5 text-[10px] font-black uppercase transition-all ${filter === "hot" ? "bg-primary/15 text-primary shadow-inner" : "text-muted-foreground hover:text-foreground"}`}
              >
                Quentes
              </button>
              <button
                type="button"
                onClick={() => setFilter("clicked")}
                className={`rounded-lg px-4 py-1.5 text-[10px] font-black uppercase transition-all ${filter === "clicked" ? "bg-primary/10 text-primary shadow-inner" : "text-muted-foreground hover:text-foreground"}`}
              >
                Clicaram
              </button>
            </div>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-input bg-background py-3 pl-12 pr-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Lead</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Engajamento
                </th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ações</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                <th className="p-6 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Contato
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="group transition-colors hover:bg-muted/25">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-black ${lead.isHot ? "border border-primary/25 bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                      >
                        {lead.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-black text-foreground">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">{lead.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold uppercase text-muted-foreground">
                        <span>Retenção</span>
                        <span className="text-foreground">{lead.watchedPercentage}%</span>
                      </div>
                      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full transition-all duration-1000 ${lead.watchedPercentage > 70 ? "bg-primary" : "bg-primary/60"}`}
                          style={{ width: `${lead.watchedPercentage}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex gap-3">
                      <div
                        title="Mensagens no Chat"
                        className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2 py-1 text-[10px] font-black text-muted-foreground"
                      >
                        <MessageCircle className="h-3 w-3" /> {lead.messagesCount}
                      </div>
                      {lead.clickedOffer && (
                        <div
                          title="Clicou na Oferta"
                          className="flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/10 px-2 py-1 text-[10px] font-black text-primary"
                        >
                          <ShoppingCart className="h-3 w-3" /> CLICOU
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-6">
                    {lead.isHot ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase text-primary">
                        <Star className="h-3 w-3 fill-current" /> Lead Quente
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-[10px] font-black uppercase text-muted-foreground">
                        Interessado
                      </span>
                    )}
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex justify-end gap-2">
                      <a
                        href={`https://wa.me/${lead.phone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-primary/25 bg-primary/10 p-2.5 text-primary transition-all hover:bg-primary hover:text-primary-foreground"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                      <a
                        href={`mailto:${lead.email}`}
                        className="rounded-xl border border-border bg-muted/40 p-2.5 text-muted-foreground transition-all hover:border-primary/30 hover:text-primary"
                      >
                        <Mail className="h-4 w-4" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLeads.length === 0 && (
          <div className="space-y-4 p-20 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[32px] border border-border bg-muted/40">
              <Search className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Nenhum lead encontrado</p>
          </div>
        )}
      </section>
    </div>
  );
}
