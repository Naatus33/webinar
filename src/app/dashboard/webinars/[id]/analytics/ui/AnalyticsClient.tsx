"use client";

import useSWR from "swr";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Download, Users, Eye, MessageCircle, Activity } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface AnalyticsData {
  totalLeads: number;
  watchedLeads: number;
  avgWatched: number;
  visits: number;
  chatMessages: number;
  funnel: { stage: string; value: number }[];
  retention: { minute: number; viewers: number }[];
  leadsTrend: { date: string; count: number }[];
}

export function AnalyticsClient({ webinarId, webinarName }: { webinarId: string; webinarName: string }) {
  const { data, isLoading } = useSWR<AnalyticsData>(
    `/api/webinars/${webinarId}/analytics`,
    fetcher,
    { refreshInterval: 30_000 }
  );

  function exportCsv() {
    window.open(`/api/webinars/${webinarId}/export-csv`, "_blank");
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  if (!data) return null;

  const conversionRate = data.visits > 0 ? ((data.totalLeads / data.visits) * 100).toFixed(1) : "—";

  const FUNNEL_COLORS = ["#7c3aed", "#2563eb", "#059669", "#ca8a04"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
            Visão geral do webinar
          </p>
          <p className="text-sm font-medium text-slate-100">
            {webinarName}
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-200 shadow-sm transition hover:border-violet-500/70 hover:text-white hover:shadow-[0_0_18px_rgba(79,70,229,0.6)]"
        >
          <Download className="h-4 w-4" /> Exportar CSV
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Visitas", value: data.visits, Icon: Eye, color: "text-blue-400" },
          { label: "Leads", value: data.totalLeads, Icon: Users, color: "text-violet-400" },
          { label: "Assistiram", value: data.watchedLeads, Icon: Activity, color: "text-emerald-400" },
          { label: "Msgs no Chat", value: data.chatMessages, Icon: MessageCircle, color: "text-amber-400" },
        ].map(({ label, value, Icon, color }) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.9)]"
          >
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${color}`} />
              <p className="text-xs text-slate-400">{label}</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-50">{value.toLocaleString("pt-BR")}</p>
          </div>
        ))}
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-violet-500/40 bg-violet-950/40 p-4 shadow-[0_20px_55px_rgba(79,70,229,0.7)]">
          <p className="text-xs text-slate-400">Taxa de conversão</p>
          <p className="mt-1 text-xl font-bold text-violet-400">{conversionRate}%</p>
          <p className="text-xs text-slate-500">visitas → leads</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-4 shadow-[0_20px_55px_rgba(16,185,129,0.5)]">
          <p className="text-xs text-slate-400">Média assitido</p>
          <p className="mt-1 text-xl font-bold text-emerald-400">{data.avgWatched}%</p>
          <p className="text-xs text-slate-500">do webinar</p>
        </div>
        <div className="rounded-2xl border border-blue-500/40 bg-blue-950/40 p-4 shadow-[0_20px_55px_rgba(59,130,246,0.5)]">
          <p className="text-xs text-slate-400">Taxa de retenção</p>
          <p className="mt-1 text-xl font-bold text-blue-400">
            {data.totalLeads > 0 ? ((data.watchedLeads / data.totalLeads) * 100).toFixed(1) : "—"}%
          </p>
          <p className="text-xs text-slate-500">leads → assistiram</p>
        </div>
      </div>

      {/* Funnel */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-200">Funil de Conversão</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.funnel} layout="vertical">
            <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis dataKey="stage" type="category" width={110} tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <Tooltip
              contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#f1f5f9", fontSize: 12 }}
              cursor={{ fill: "#334155" }}
            />
            <Bar dataKey="value" radius={[0, 10, 10, 0]}>
              {data.funnel.map((_, i) => (
                <Cell key={i} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Retention */}
      {data.retention.length > 0 && (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-200">Participantes por Minuto</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.retention}>
              <XAxis dataKey="minute" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => `${v}m`} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#f1f5f9", fontSize: 12 }}
                labelFormatter={(v) => `Minuto ${v}`}
              />
              <Area
                type="monotone"
                dataKey="viewers"
                stroke="#7c3aed"
                fill="url(#viewersGradient)"
                strokeWidth={2}
              />
              <defs>
                <linearGradient id="viewersGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.1} />
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Leads trend */}
      {data.leadsTrend.length > 0 && (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-200">Leads por Dia</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.leadsTrend}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#f1f5f9", fontSize: 12 }}
              />
              <Bar dataKey="count" fill="#7c3aed" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
