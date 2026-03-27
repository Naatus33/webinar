"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Play,
  Users,
  BarChart3,
  PlusCircle,
  TrendingUp,
  Zap,
  ArrowUpRight,
  Radio,
  Settings,
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

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

const CHART_DATA_LAST_7_DAYS = [
  { label: "10/03", value: 320 },
  { label: "11/03", value: 410 },
  { label: "12/03", value: 380 },
  { label: "13/03", value: 520 },
  { label: "14/03", value: 610 },
  { label: "15/03", value: 540 },
  { label: "16/03", value: 690 },
] as const;

const CHART_PRIMARY = "#8b0000";
const CHART_TOOLTIP_BG = "#141414";
const CHART_TOOLTIP_BORDER = "#333333";
const CHART_AXIS = "#737373";

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

  const chartData = CHART_DATA_LAST_7_DAYS;

  return (
    <div className="min-h-screen space-y-10 bg-background p-8 font-sans text-foreground">
      <header className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <h1 className="text-3xl font-black uppercase tracking-tight text-foreground">
              Olá, {userName?.split(" ")[0]}
            </h1>
            <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
              {userRole}
            </span>
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Aqui está o que está acontecendo com seus webinars hoje.
          </p>
        </div>

        {(userRole === "GERENTE" || userRole === "ADMIN") && (
          <button
            type="button"
            onClick={() => setNewWebinarOpen(true)}
            className="flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-black text-primary-foreground shadow-xl shadow-primary/20 transition-all hover:brightness-110 active:scale-95"
          >
            <PlusCircle className="h-5 w-5" /> NOVO WEBINAR
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {[
          {
            label: "Total Webinars",
            value: stats.totalWebinars,
            icon: BarChart3,
            color: "text-foreground",
            bg: "bg-muted/40",
          },
          {
            label: "Inscrições",
            value: stats.totalLeads.toLocaleString("pt-BR"),
            icon: Users,
            color: "text-primary",
            bg: "bg-primary/5",
          },
          {
            label: "Próximos Eventos",
            value: upcoming.length,
            icon: Calendar,
            color: "text-muted-foreground",
            bg: "bg-muted/50",
          },
          {
            label: "Taxa de Presença",
            value: `${stats.attendanceRate || 0}%`,
            icon: TrendingUp,
            color: "text-primary/90",
            bg: "bg-primary/[0.07]",
          },
        ].map((kpi, i) => (
          <div
            key={i}
            className={`space-y-3 rounded-[32px] border border-border/60 p-6 shadow-xl backdrop-blur-sm ${kpi.bg}`}
          >
            <div className="flex items-center justify-between">
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-3xl font-black tabular-nums text-foreground">{kpi.value}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 rounded-[40px] border border-border/60 bg-card/40 p-8 shadow-2xl lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-foreground">
              <TrendingUp className="h-4 w-4 text-primary" /> Crescimento de Leads
            </h2>
            <select className="rounded-xl border border-border bg-background px-3 py-1.5 text-[10px] font-black uppercase text-muted-foreground outline-none">
              <option>Últimos 7 dias</option>
              <option>Últimos 30 dias</option>
            </select>
          </div>
          <div className="h-[300px] w-full min-h-[300px] min-w-0">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_PRIMARY} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={CHART_PRIMARY} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: CHART_AXIS, fontSize: 10 }}
                  dy={10}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: CHART_TOOLTIP_BG,
                    border: `1px solid ${CHART_TOOLTIP_BORDER}`,
                    borderRadius: "16px",
                    fontSize: "12px",
                  }}
                  itemStyle={{ color: CHART_PRIMARY }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={CHART_PRIMARY}
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6 rounded-[40px] border border-border/60 bg-card/40 p-8 shadow-2xl">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-foreground">
            <Radio className="h-4 w-4 animate-pulse text-primary" /> Próximos Eventos
          </h2>
          <div className="space-y-4">
            {upcoming.length > 0 ? (
              upcoming.map((event) => (
                <div
                  key={event.id}
                  className="group rounded-2xl border border-border bg-muted/20 p-4 transition-all hover:border-primary/30"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                      {event.isLive ? "AO VIVO AGORA" : "AGENDADO"}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {new Date(event.date).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <h3 className="truncate text-xs font-black uppercase text-foreground transition-all group-hover:text-primary">
                    {event.title}
                  </h3>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                      <Users className="h-3 w-3" /> {event.leadsCount}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                      <Clock className="h-3 w-3" /> {event.time || "--:--"}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="space-y-3 py-10 text-center">
                <Calendar className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Nenhum evento próximo
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-[40px] border border-border/60 bg-card/40 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 p-8">
          <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Todos os Webinars</h2>
          <Link
            href="/dashboard"
            className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
          >
            Ver Todos
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border/60 bg-muted/30">
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Webinar</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Inscrições
                </th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Data/Hora
                </th>
                <th className="p-6 text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {webinars.slice(0, 5).map((w) => {
                const status = STATUS_LABELS[w.status] || STATUS_LABELS.DRAFT;
                return (
                  <tr key={w.id} className="group transition-colors hover:bg-muted/25">
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background transition-all group-hover:border-primary/30">
                          <Play className="h-4 w-4 fill-primary/20 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-black uppercase tracking-tight text-foreground">{w.name}</p>
                          <p className="text-[10px] font-medium text-muted-foreground">Responsável: {w.ownerName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${status.color}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-2 text-sm font-black text-foreground">
                        <Users className="h-4 w-4 text-muted-foreground" /> {w.leadsCount}
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="text-[10px] font-bold uppercase text-muted-foreground">
                        <p>{w.startDate ? new Date(w.startDate).toLocaleDateString("pt-BR") : "--/--/----"}</p>
                        <p className="text-muted-foreground/80">{w.startTime || "--:--"}</p>
                      </div>
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/dashboard/webinars/${w.id}/live`}
                          className="rounded-xl border border-border bg-muted/40 p-2.5 text-muted-foreground transition-all hover:border-primary/30 hover:text-primary"
                        >
                          <Zap className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/webinar/${w.id}/builder`}
                          className="rounded-xl border border-border bg-muted/40 p-2.5 text-muted-foreground transition-all hover:text-foreground"
                        >
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

      <Modal isOpen={newWebinarOpen} onClose={() => setNewWebinarOpen(false)} title="Criar Novo Webinar">
        <NewWebinarForm onCancel={() => setNewWebinarOpen(false)} />
      </Modal>
    </div>
  );
}
