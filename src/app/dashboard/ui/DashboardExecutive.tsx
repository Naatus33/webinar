"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar, Clock, Play, Users, BarChart3, Eye, PlusCircle,
  Settings, Copy, Check, TrendingUp, Zap, ArrowUpRight,
  MoreVertical, Radio, ShieldCheck, ShoppingCart, Star
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

import { Modal } from "@/components/ui/Modal";
import { NewWebinarForm } from "@/components/new-webinar/NewWebinarForm";
import type { TeamSellerMetric } from "@/lib/team-metrics";

type DashboardExecutiveProps = {
  userRole: "ADMIN" | "GERENTE" | "VENDEDOR";
  currentUserId: string;
  userName?: string | null;
  stats: {
    totalWebinars: number;
    totalLeads: number;
    activeWebinars: number;
    attendanceRate?: number | null;
  };
  upcoming: {
    id: string;
    title: string;
    date: Date;
    time?: string | null;
    leadsCount: number;
    isLive?: boolean;
  }[];
  webinars: {
    id: string;
    name: string;
    startDate: Date | null;
    leadsCount: number;
    attendeesCount?: number | null;
    status: string;
    code: string;
    slug: string;
    ownerUserId: string;
    ownerName: string;
    startTime?: string | null;
  }[];
  teamSellerMetrics?: TeamSellerMetric[] | null;
};

const STATUS_LABELS: Record<string, { label: string; color: string; dot: string }> = {
  DRAFT: { label: "Rascunho", color: "bg-slate-800/50 text-slate-400 border-slate-700", dot: "bg-slate-500" },
  SCHEDULED: { label: "Agendado", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", dot: "bg-blue-500" },
  LIVE: { label: "Ao vivo", color: "bg-red-500/10 text-red-400 border-red-500/20", dot: "bg-red-500 animate-pulse" },
  REPLAY: { label: "Replay", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", dot: "bg-amber-500" },
  FINISHED: { label: "Encerrado", color: "bg-slate-800/80 text-slate-500 border-slate-700/50", dot: "bg-slate-600" },
};

export function DashboardExecutive({
  userRole,
  currentUserId,
  userName,
  stats,
  upcoming,
  webinars,
  teamSellerMetrics,
}: DashboardExecutiveProps) {
  const [newWebinarOpen, setNewWebinarOpen] = useState(false);

  const chartData = Array.from({ length: 7 }, (_, i) => ({
    label: `${i + 10}/03`,
    value: Math.floor(Math.random() * 500) + 200,
  }));

  return (
    <div className="p-8 space-y-10 bg-slate-950 min-h-screen text-slate-200 font-sans">
      
      {/* Header de Boas-vindas */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-black text-white uppercase tracking-tight">Olá, {userName?.split(' ')[0]}</h1>
            <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black text-primary uppercase tracking-widest">
              {userRole}
            </span>
          </div>
          <p className="text-sm text-slate-500 font-medium">Aqui está o que está acontecendo com seus webinars hoje.</p>
        </div>
        
        {(userRole === "GERENTE" || userRole === "ADMIN") && (
          <button
            onClick={() => setNewWebinarOpen(true)}
            className="flex items-center gap-2 bg-primary hover:brightness-110 text-white px-6 py-3 rounded-2xl text-sm font-black transition-all shadow-xl shadow-primary/20 active:scale-95"
          >
            <PlusCircle className="h-5 w-5" /> NOVO WEBINAR
          </button>
        )}
      </header>

      {/* KPIs de Performance */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Total Webinars", value: stats.totalWebinars, icon: BarChart3, color: "text-blue-400", bg: "bg-blue-500/5" },
          { label: "Inscrições", value: stats.totalLeads.toLocaleString("pt-BR"), icon: Users, color: "text-primary", bg: "bg-primary/5" },
          { label: "Próximos Eventos", value: upcoming.length, icon: Calendar, color: "text-amber-400", bg: "bg-amber-500/5" },
          { label: "Taxa de Presença", value: `${stats.attendanceRate || 0}%`, icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-500/5" },
        ].map((kpi, i) => (
          <div key={i} className={`p-6 rounded-[32px] border border-slate-800/60 ${kpi.bg} backdrop-blur-sm space-y-3 shadow-xl`}>
            <div className="flex items-center justify-between">
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              <ArrowUpRight className="h-4 w-4 text-slate-700" />
            </div>
            <div>
              <p className="text-3xl font-black text-white tabular-nums">{kpi.value}</p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Gráfico de Crescimento */}
        <div className="lg:col-span-2 bg-slate-900/40 border border-slate-800/60 rounded-[40px] p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" /> Crescimento de Leads
            </h2>
            <select className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase outline-none">
              <option>Últimos 7 dias</option>
              <option>Últimos 30 dias</option>
            </select>
          </div>
          <div className="h-[300px] w-full min-h-[300px] min-w-0">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f9b17a" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f9b17a" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 10}} dy={10} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', fontSize: '12px'}}
                  itemStyle={{color: '#f9b17a'}}
                />
                <Area type="monotone" dataKey="value" stroke="#f9b17a" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Próximos Eventos (Live) */}
        <div className="bg-slate-900/40 border border-slate-800/60 rounded-[40px] p-8 shadow-2xl space-y-6">
          <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
            <Radio className="h-4 w-4 text-red-500 animate-pulse" /> Próximos Eventos
          </h2>
          <div className="space-y-4">
            {upcoming.length > 0 ? upcoming.map((event) => (
              <div key={event.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-primary/30 transition-all group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">{event.isLive ? 'AO VIVO AGORA' : 'AGENDADO'}</span>
                  <span className="text-[10px] text-slate-500 font-bold">{new Date(event.date).toLocaleDateString('pt-BR')}</span>
                </div>
                <h3 className="text-xs font-black text-white uppercase truncate group-hover:text-primary transition-all">{event.title}</h3>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
                    <Users className="h-3 w-3" /> {event.leadsCount}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold">
                    <Clock className="h-3 w-3" /> {event.time || '--:--'}
                  </div>
                </div>
              </div>
            )) : (
              <div className="py-10 text-center space-y-3">
                <Calendar className="h-10 w-10 text-slate-800 mx-auto" />
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Nenhum evento próximo</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabela de Webinars Recentes */}
      <section className="bg-slate-900/40 border border-slate-800/60 rounded-[40px] overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-slate-800/60 flex items-center justify-between bg-slate-900/60">
          <h2 className="text-sm font-black text-white uppercase tracking-widest">Todos os Webinars</h2>
          <Link href="/dashboard" className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">Ver Todos</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/50 border-b border-slate-800/60">
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Webinar</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Inscrições</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Data/Hora</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {webinars.slice(0, 5).map((w) => {
                const status = STATUS_LABELS[w.status] || STATUS_LABELS.DRAFT;
                return (
                  <tr key={w.id} className="group hover:bg-slate-800/20 transition-colors">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center group-hover:border-primary/30 transition-all">
                          <Play className="h-4 w-4 text-primary fill-primary/20" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-white uppercase tracking-tight">{w.name}</p>
                          <p className="text-[10px] text-slate-500 font-medium">Responsável: {w.ownerName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${status.color}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-2 text-sm font-black text-white">
                        <Users className="h-4 w-4 text-slate-600" /> {w.leadsCount}
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">
                        <p>{w.startDate ? new Date(w.startDate).toLocaleDateString('pt-BR') : '--/--/----'}</p>
                        <p className="text-slate-600">{w.startTime || '--:--'}</p>
                      </div>
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/dashboard/webinars/${w.id}/live`} className="p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-primary hover:border-primary/30 transition-all border border-slate-700">
                          <Zap className="h-4 w-4" />
                        </Link>
                        <Link href={`/webinar/${w.id}/builder`} className="p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-all border border-slate-700">
                          <Settings className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal de Novo Webinar */}
      <Modal isOpen={newWebinarOpen} onClose={() => setNewWebinarOpen(false)} title="Criar Novo Webinar">
        <NewWebinarForm onCancel={() => setNewWebinarOpen(false)} />
      </Modal>
    </div>
  );
}
