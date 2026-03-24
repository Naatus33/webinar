"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { 
  Users, ShoppingCart, MousePointer2, MessageCircle, 
  Search, Filter, Download, ExternalLink, 
  TrendingUp, Star, Clock, Phone, Mail,
  ChevronRight, AlertCircle, CheckCircle2
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
    { refreshInterval: 15_000 }
  );

  const filteredLeads = useMemo(() => {
    if (!data?.leads) return [];
    return data.leads.filter(lead => {
      const matchesSearch = lead.name.toLowerCase().includes(search.toLowerCase()) || 
                            lead.email.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === "all" ? true :
                            filter === "hot" ? lead.isHot :
                            filter === "clicked" ? lead.clickedOffer : true;
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
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8 space-y-8 font-sans">
      
      {/* Header Vendedor */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <ShoppingCart className="h-5 w-5 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tight">Painel de Vendas</h1>
          </div>
          <p className="text-sm text-slate-500 font-medium">Gerencie seus leads quentes e maximize as conversões do <span className="text-slate-300">{webinarName}</span>.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 px-4 py-2.5 rounded-xl text-xs font-black border border-slate-800 transition-all">
            <Download className="h-4 w-4" /> EXPORTAR LEADS
          </button>
        </div>
      </header>

      {/* KPIs de Vendas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Total de Leads", value: data?.totalLeads || 0, icon: Users, color: "text-blue-400", bg: "bg-blue-500/5" },
          { label: "Leads Quentes", value: data?.hotLeadsCount || 0, icon: Star, color: "text-amber-400", bg: "bg-amber-500/5" },
          { label: "Cliques na Oferta", value: data?.offerClicks || 0, icon: MousePointer2, color: "text-primary", bg: "bg-primary/5" },
          { label: "Taxa de Cliques", value: `${data?.conversionRate || 0}%`, icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/5" },
        ].map((kpi, i) => (
          <div key={i} className={`p-6 rounded-[32px] border border-slate-800/60 ${kpi.bg} backdrop-blur-sm space-y-3 shadow-xl`}>
            <div className="flex items-center justify-between">
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tempo Real</span>
            </div>
            <div>
              <p className="text-3xl font-black text-white tabular-nums">{kpi.value}</p>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CRM de Leads */}
      <section className="bg-slate-900/40 border border-slate-800/60 rounded-[40px] overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-slate-800/60 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900/60">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-black text-white uppercase tracking-widest">Gestão de Leads</h2>
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button 
                onClick={() => setFilter("all")}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${filter === "all" ? 'bg-slate-800 text-white shadow-inner' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Todos
              </button>
              <button 
                onClick={() => setFilter("hot")}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${filter === "hot" ? 'bg-amber-500/10 text-amber-500 shadow-inner' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Quentes
              </button>
              <button 
                onClick={() => setFilter("clicked")}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${filter === "clicked" ? 'bg-primary/10 text-primary shadow-inner' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Clicaram
              </button>
            </div>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3 pl-12 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-primary outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 border-b border-slate-800/60">
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Lead</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Engajamento</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Ações</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Contato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="group hover:bg-slate-800/20 transition-colors">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-lg ${lead.isHot ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 'bg-slate-800 text-slate-400'}`}>
                        {lead.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-black text-white">{lead.name}</p>
                        <p className="text-xs text-slate-500">{lead.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                        <span>Retenção</span>
                        <span className="text-slate-300">{lead.watchedPercentage}%</span>
                      </div>
                      <div className="h-1.5 w-32 bg-slate-900 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-1000 ${lead.watchedPercentage > 70 ? 'bg-emerald-500' : 'bg-primary'}`}
                          style={{ width: `${lead.watchedPercentage}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex gap-3">
                      <div title="Mensagens no Chat" className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-black text-slate-400">
                        <MessageCircle className="h-3 w-3" /> {lead.messagesCount}
                      </div>
                      {lead.clickedOffer && (
                        <div title="Clicou na Oferta" className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/10 border border-primary/20 text-[10px] font-black text-primary">
                          <ShoppingCart className="h-3 w-3" /> CLICOU
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-6">
                    {lead.isHot ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase border border-amber-500/20">
                        <Star className="h-3 w-3 fill-current" /> Lead Quente
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-slate-500 text-[10px] font-black uppercase">
                        Interessado
                      </span>
                    )}
                  </td>
                  <td className="p-6 text-right">
                    <div className="flex justify-end gap-2">
                      <a 
                        href={`https://wa.me/${lead.phone}`} 
                        target="_blank"
                        className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all border border-emerald-500/20"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                      <a 
                        href={`mailto:${lead.email}`}
                        className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white transition-all border border-blue-500/20"
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
          <div className="p-20 text-center space-y-4">
            <div className="h-20 w-20 rounded-[32px] bg-slate-900 flex items-center justify-center mx-auto border border-slate-800">
              <Search className="h-10 w-10 text-slate-700" />
            </div>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-widest">Nenhum lead encontrado</p>
          </div>
        )}
      </section>
    </div>
  );
}
