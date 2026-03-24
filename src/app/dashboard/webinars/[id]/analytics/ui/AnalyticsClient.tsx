"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Download, Users, Eye, MessageCircle, Activity, Trash2 } from "lucide-react";

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
  recentLeads?: { id: string; name: string; email: string; createdAt: string }[];
}

export function AnalyticsClient({ webinarId, webinarName }: { webinarId: string; webinarName: string }) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { data, isLoading, mutate } = useSWR<AnalyticsData>(
    `/api/webinars/${webinarId}/analytics`,
    fetcher,
    { refreshInterval: 30_000 }
  );

  async function deleteLead(leadId: string) {
    if (!window.confirm("Eliminar este lead permanentemente? (LGPD)")) return;
    setDeletingId(leadId);
    try {
      const res = await fetch(`/api/webinars/${webinarId}/leads/${leadId}`, { method: "DELETE" });
      if (res.ok) await mutate();
    } finally {
      setDeletingId(null);
    }
  }

  function exportCsv() {
    window.open(`/api/webinars/${webinarId}/export-csv`, "_blank");
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!data) return null;

  const conversionRate = data.visits > 0 ? ((data.totalLeads / data.visits) * 100).toFixed(1) : "—";

  const FUNNEL_COLORS = ["#f9b17a", "#676f9d", "#059669", "#ca8a04"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Visão geral do webinar
          </p>
          <p className="text-sm font-medium text-foreground">
            {webinarName}
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-xs text-foreground shadow-sm motion-transition hover:border-primary/50 hover:shadow-[0_0_18px_rgba(249,177,122,0.25)]"
        >
          <Download className="h-4 w-4" /> Exportar CSV
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Visitas", value: data.visits, Icon: Eye, color: "text-blue-400" },
          { label: "Leads", value: data.totalLeads, Icon: Users, color: "text-primary" },
          { label: "Assistiram", value: data.watchedLeads, Icon: Activity, color: "text-emerald-400" },
          { label: "Msgs no Chat", value: data.chatMessages, Icon: MessageCircle, color: "text-amber-400" },
        ].map(({ label, value, Icon, color }) => (
          <div
            key={label}
            className="rounded-2xl border border-border/80 bg-card/70 p-4 shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
          >
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 ${color}`} />
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{value.toLocaleString("pt-BR")}</p>
          </div>
        ))}
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-primary/40 bg-primary/10 p-4 shadow-[0_20px_55px_rgba(249,177,122,0.18)]">
          <p className="text-xs text-muted-foreground">Taxa de conversão</p>
          <p className="mt-1 text-xl font-bold text-primary">{conversionRate}%</p>
          <p className="text-xs text-muted-foreground">visitas → leads</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/40 p-4 shadow-[0_20px_55px_rgba(16,185,129,0.5)]">
          <p className="text-xs text-muted-foreground">Média assitido</p>
          <p className="mt-1 text-xl font-bold text-emerald-400">{data.avgWatched}%</p>
          <p className="text-xs text-muted-foreground">do webinar</p>
        </div>
        <div className="rounded-2xl border border-blue-500/40 bg-blue-950/40 p-4 shadow-[0_20px_55px_rgba(59,130,246,0.5)]">
          <p className="text-xs text-muted-foreground">Taxa de retenção</p>
          <p className="mt-1 text-xl font-bold text-blue-400">
            {data.totalLeads > 0 ? ((data.watchedLeads / data.totalLeads) * 100).toFixed(1) : "—"}%
          </p>
          <p className="text-xs text-muted-foreground">leads → assistiram</p>
        </div>
      </div>

      {/* Funnel */}
      <div className="rounded-2xl border border-border/80 bg-card/70 p-5">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Funil de Conversão</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.funnel} layout="vertical">
            <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis dataKey="stage" type="category" width={110} tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <Tooltip
              contentStyle={{ backgroundColor: "#424769", border: "1px solid #676f9d", borderRadius: "8px", color: "#ffffff", fontSize: 12 }}
              cursor={{ fill: "#676f9d33" }}
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
        <div className="rounded-2xl border border-border/80 bg-card/70 p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Participantes por Minuto</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.retention}>
              <XAxis dataKey="minute" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v) => `${v}m`} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#424769", border: "1px solid #676f9d", borderRadius: "8px", color: "#ffffff", fontSize: 12 }}
                labelFormatter={(v) => `Minuto ${v}`}
              />
              <Area
                type="monotone"
                dataKey="viewers"
                stroke="#f9b17a"
                fill="url(#viewersGradient)"
                strokeWidth={2}
              />
              <defs>
                <linearGradient id="viewersGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f9b17a" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#f9b17a" stopOpacity={0.1} />
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Leads trend */}
      {data.leadsTrend.length > 0 && (
        <div className="rounded-2xl border border-border/80 bg-card/70 p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Leads por Dia</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.leadsTrend}>
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <Tooltip
                contentStyle={{ backgroundColor: "#424769", border: "1px solid #676f9d", borderRadius: "8px", color: "#ffffff", fontSize: 12 }}
              />
              <Bar dataKey="count" fill="#f9b17a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {(data.recentLeads ?? []).length > 0 && (
        <div className="rounded-2xl border border-border/80 bg-card/70 p-5">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Leads recentes (LGPD)</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Até 100 inscrições mais recentes. Use &quot;Exportar CSV&quot; para cópia completa.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-foreground/90">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Nome</th>
                  <th className="py-2 pr-3 font-medium">E-mail</th>
                  <th className="py-2 pr-3 font-medium">Data</th>
                  <th className="py-2 font-medium"> </th>
                </tr>
              </thead>
              <tbody>
                {(data.recentLeads ?? []).map((row) => (
                  <tr key={row.id} className="border-b border-border/60">
                    <td className="py-2 pr-3">{row.name}</td>
                    <td className="py-2 pr-3">{row.email}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {new Date(row.createdAt).toLocaleString("pt-BR")}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => deleteLead(row.id)}
                        disabled={deletingId === row.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-900/60 bg-red-950/40 px-2 py-1 text-red-300 transition hover:border-red-500/50 disabled:opacity-50"
                        title="Eliminar lead"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
