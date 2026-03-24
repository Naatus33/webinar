"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Play,
  Users,
  BarChart3,
  Eye,
  PlusCircle,
  Settings,
  Copy,
  Check,
  TrendingUp,
} from "lucide-react";
import {
  AreaChart,
  Area,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import "./dashboard-theme.css";
import { theme } from "@/styles/theme";
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
  /** Métricas por vendedor (gestor/admin); omitido para vendedor. */
  teamSellerMetrics?: TeamSellerMetric[] | null;
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
  const canCreateWebinar = userRole === "GERENTE" || userRole === "ADMIN";
  const showOwnerColumn =
    (userRole === "GERENTE" || userRole === "ADMIN") &&
    webinars.some((w) => w.ownerUserId !== currentUserId);
  const panelLabel =
    userRole === "VENDEDOR"
      ? "Vendedor"
      : userRole === "GERENTE"
        ? "Gestor"
        : "Administrador";
  const webinarsSectionTitle =
    userRole === "VENDEDOR"
      ? "Meus webinars"
      : userRole === "GERENTE"
        ? "Webinars (seus e da equipe)"
        : "Todos os webinars";
  const [newWebinarOpen, setNewWebinarOpen] = useState(false);
  const [copiedLeadForWebinarId, setCopiedLeadForWebinarId] = useState<string | null>(null);

  const chartData = (() => {
    const now = new Date();
    const base = Math.max(10, Math.round(stats.totalLeads / 7));
    const makeLabel = (d: Date) => {
      const dd = d.getDate().toString().padStart(2, "0");
      const mm = (d.getMonth() + 1).toString().padStart(2, "0");
      return `${dd}/${mm}`;
    };

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(now.getDate() - (6 - i));
      const factor = 0.7 + i * 0.12;
      // Distribuição determinística para manter layout estável
      const value = Math.max(0, Math.round(base * factor));
      return { label: makeLabel(d), value };
    });
  })();

  const hexToRgba = (hex: string, alpha: number) => {
    const cleaned = hex.replace("#", "");
    const bigint = parseInt(cleaned, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const chartGradientTop = hexToRgba(theme.colors.accent, 0.125);
  const chartGradientBottom = hexToRgba(theme.colors.accent, 0);

  const attendance =
    stats.attendanceRate ??
    (stats.totalLeads > 0
      ? Math.round(
          (webinars.reduce(
            (acc, w) => acc + (w.attendeesCount ?? 0),
            0,
          ) /
            (webinars.length || 1)) *
            100,
        )
      : 0);

  return (
    <div className="wm-body">
      <div className="wm-dashboard">
        <div className="wm-top-bar">
          <div className="wm-logo-area">
            <h1>
              webinar<span>manager</span>
            </h1>
            <p className="mt-1 text-xs font-normal normal-case text-white/45">
              {userRole === "VENDEDOR"
                ? "Painel do vendedor — apenas seus webinars"
                : userRole === "GERENTE"
                  ? "Painel do gestor — seus webinars e da equipe"
                  : "Painel administrativo — visão global"}
            </p>
          </div>
          <div className="wm-header-actions">
            {canCreateWebinar && (
              <button
                type="button"
                className="wm-btn-new"
                onClick={() => setNewWebinarOpen(true)}
              >
                <PlusCircle className="h-4 w-4" />
                <span>Novo webinar</span>
              </button>
            )}
            <div className="wm-profile-badge">
              <Users className="mr-1 h-5 w-5 text-primary" />
              <span className="flex flex-col items-start leading-tight">
                <span className="text-[10px] font-normal uppercase tracking-wider text-white/50">
                  {panelLabel}
                </span>
                <span>{userName || "Usuário"}</span>
              </span>
            </div>
          </div>
        </div>

        {(userRole === "GERENTE" || userRole === "ADMIN") && (
          <div className="mb-4 flex flex-wrap gap-2 border-b border-white/10 pb-4 text-sm">
            <Link
              href="/dashboard/equipe"
              className="rounded-lg bg-primary/15 px-3 py-1.5 text-primary hover:bg-primary/25 motion-transition"
            >
              Equipe
            </Link>
            <Link
              href="/dashboard/topics"
              className="rounded-lg bg-white/5 px-3 py-1.5 text-white/80 hover:bg-white/10"
            >
              Temas
            </Link>
            <Link
              href="/webinar/new"
              className="rounded-lg bg-white/5 px-3 py-1.5 text-white/80 hover:bg-white/10"
            >
              Novo webinar
            </Link>
          </div>
        )}

        <div className="wm-stats-grid">
          <div className="wm-stat-card">
            <div className="wm-stat-info">
              <h3>Total webinars</h3>
              <div className="wm-stat-number">
                {stats.totalWebinars.toLocaleString("pt-BR")}
              </div>
            </div>
            <div className="wm-stat-icon">
              <BarChart3 className="h-6 w-6" />
            </div>
          </div>

          <div className="wm-stat-card">
            <div className="wm-stat-info">
              <h3>Inscrições</h3>
              <div className="wm-stat-number">
                {stats.totalLeads.toLocaleString("pt-BR")}
              </div>
            </div>
            <div className="wm-stat-icon">
              <Users className="h-6 w-6" />
            </div>
          </div>

          <div className="wm-stat-card">
            <div className="wm-stat-info">
              <h3>Próximos</h3>
              <div className="wm-stat-number">
                {upcoming.length.toLocaleString("pt-BR")}
              </div>
            </div>
            <div className="wm-stat-icon">
              <Calendar className="h-6 w-6" />
            </div>
          </div>

          <div className="wm-stat-card">
            <div className="wm-stat-info">
              <h3>Taxa presença</h3>
              <div className="wm-stat-number">
                {attendance.toLocaleString("pt-BR")}
                %
              </div>
            </div>
            <div className="wm-stat-icon">
              <BarChart3 className="h-6 w-6" />
            </div>
          </div>
        </div>

        {teamSellerMetrics != null && (
          <div className="wm-recent-section mb-6">
            <div className="wm-section-header">
              <TrendingUp className="h-7 w-7 text-primary" />
              <h2 className="wm-section-header-title">
                Desempenho por vendedor
              </h2>
            </div>
            <p className="mb-3 text-sm text-white/50">
              Leads totais nos webinars de cada vendedor e taxa de conversão da
              oferta (cliques em &quot;oferta&quot; / inscrições).
            </p>
            {teamSellerMetrics.length === 0 ? (
              <div
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-white/55"
                role="status"
              >
                Nenhum vendedor listado. Vincule vendedores em{" "}
                <Link href="/dashboard/equipe" className="text-primary underline underline-offset-2">
                  Equipe
                </Link>
                .
              </div>
            ) : (
              <div className="wm-table-wrapper">
                <table className="wm-table">
                  <thead>
                    <tr>
                      <th>Vendedor</th>
                      <th>Webinars</th>
                      <th>Inscrições</th>
                      <th>Conv. oferta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamSellerMetrics.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <div className="flex flex-col">
                            <span className="font-medium text-white/90">
                              {m.name ?? "—"}
                            </span>
                            <span className="text-xs text-white/45">
                              {m.email}
                            </span>
                          </div>
                        </td>
                        <td>{m.webinarsCount.toLocaleString("pt-BR")}</td>
                        <td>{m.totalLeads.toLocaleString("pt-BR")}</td>
                        <td>
                          {m.offerConversionPercent == null
                            ? "—"
                            : `${m.offerConversionPercent}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div className="wm-content-row">
          <div className="wm-chart-card">
            <div className="wm-chart-header">
              <h3 className="flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-primary" />
                Inscrições (últimos 7 dias)
              </h3>
              <span>
                <Clock className="h-4 w-4" />
                atualizado
              </span>
            </div>

            <div className="wm-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="wmChartFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartGradientTop} />
                      <stop offset="100%" stopColor={chartGradientBottom} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid vertical={false} stroke={theme.colors.borda} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: theme.colors.textoSecundario, fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    tickMargin={8}
                  />
                  <YAxis
                    tick={{ fill: theme.colors.textoSecundario, fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme.colors.pretoElevado,
                      border: `1px solid ${theme.colors.borda}`,
                      borderRadius: "8px",
                      color: theme.colors.branco,
                      fontSize: 12,
                    }}
                    formatter={(v) => [`${v}`, "Inscrições"]}
                    labelFormatter={(l) => `Dia ${l}`}
                    cursor={{ stroke: theme.colors.accent, strokeWidth: 2, fill: "transparent" }}
                  />

                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={theme.colors.accent}
                    strokeWidth={3}
                    fill="url(#wmChartFill)"
                    dot={{
                      r: 4,
                      stroke: theme.colors.branco,
                      strokeWidth: 2,
                      fill: theme.colors.accent,
                    }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="wm-card">
            <div className="wm-card-header">
              <Calendar className="h-6 w-6 text-primary" />
              <h3 className="wm-card-header-title">Próximos ao vivo</h3>
            </div>
            <ul className="wm-upcoming-list">
              {upcoming.length === 0 ? (
                <li className="wm-upcoming-item">
                  <div className="wm-item-info">
                    <div className="wm-item-title">
                      Nenhum webinar futuro encontrado
                    </div>
                    <div className="wm-item-meta">
                      <span>Crie um novo webinar para aparecer aqui.</span>
                    </div>
                  </div>
                </li>
              ) : (
                upcoming.slice(0, 4).map((item) => {
                  const day = item.date.getDate().toString().padStart(2, "0");
                  const month = item.date
                    .toLocaleDateString("pt-BR", { month: "short" })
                    .toUpperCase();
                  return (
                    <li key={item.id} className="wm-upcoming-item">
                      <div className="wm-item-date">
                        <span className="wm-item-day">{day}</span>
                        {month}
                      </div>
                      <div className="wm-item-info">
                        <div className="wm-item-title">{item.title}</div>
                        <div className="wm-item-meta">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {item.time ?? "Horário a definir"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {item.leadsCount.toLocaleString("pt-BR")} insc.
                          </span>
                        </div>
                      </div>
                      {item.isLive && (
                        <span className="wm-tag-live">AO VIVO</span>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>

        <div className="wm-recent-section">
          <div className="wm-section-header">
            <BarChart3 className="h-7 w-7 text-primary" />
            <h2 className="wm-section-header-title">{webinarsSectionTitle}</h2>
          </div>
          <div className="wm-table-wrapper">
            <table className="wm-table">
              <thead>
                <tr>
                  <th>Título</th>
                  {showOwnerColumn && <th>Responsável</th>}
                  <th>Data início</th>
                  <th>Inscrições</th>
                  <th>Participantes</th>
                  <th>Status</th>
                  <th style={{ textAlign: "center" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {webinars.map((w) => (
                  <tr key={w.id}>
                    <td>
                      <div className="flex flex-wrap items-center gap-2">
                        <Play className="h-4 w-4 shrink-0 text-primary" />
                        <span>{w.name}</span>
                        {w.ownerUserId !== currentUserId && (
                          <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium uppercase text-primary">
                            Equipe
                          </span>
                        )}
                      </div>
                    </td>
                    {showOwnerColumn && (
                      <td className="text-sm text-[var(--wm-text-secondary)]">
                        {w.ownerUserId === currentUserId ? (
                          <span className="text-white/60">Você</span>
                        ) : (
                          w.ownerName
                        )}
                      </td>
                    )}
                    <td>
                      {w.startDate
                        ? `${w.startDate.toLocaleDateString("pt-BR")}${w.startTime?.trim() ? ` · ${w.startTime}` : ""}`
                        : "—"}
                    </td>
                    <td>{w.leadsCount.toLocaleString("pt-BR")}</td>
                    <td>
                      {(w.attendeesCount ?? w.leadsCount).toLocaleString(
                        "pt-BR",
                      )}
                    </td>
                    <td>
                      {(() => {
                        const isCanceled =
                          w.status === "CANCELED" || w.status === "CANCELLED";
                        const label = isCanceled
                          ? "cancelado"
                          : w.status === "DRAFT"
                            ? "rascunho"
                            : w.status === "SCHEDULED"
                              ? "agendado"
                              : w.status === "LIVE"
                                ? "ao vivo"
                                : w.status === "REPLAY"
                                  ? "replay"
                                  : w.status === "FINISHED"
                                    ? "realizado"
                                    : w.status.toLowerCase();

                        return (
                      <span
                        className={[
                          "wm-status-badge",
                          isCanceled
                            ? "wm-status-badge-canceled"
                            : "",
                        ].join(" ")}
                      >
                        {label}
                      </span>
                        );
                      })()}
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-3">
                        <Link
                          href={`/dashboard/webinars/${w.id}/analytics`}
                          title="Estatísticas"
                        >
                          <BarChart3 className="h-4 w-4 text-[var(--wm-text-secondary)] hover:text-primary motion-transition" />
                        </Link>
                        <Link
                          href={`/dashboard/webinars/${w.id}/live`}
                          title="Visualizar"
                        >
                          <Eye className="h-4 w-4 text-[var(--wm-text-secondary)] hover:text-primary motion-transition" />
                        </Link>
                        <Link href={`/webinar/${w.id}/builder`} title="Configurar (builder)">
                          <Settings className="h-4 w-4 text-[var(--wm-text-secondary)] hover:text-primary motion-transition" />
                        </Link>
                        <a
                          href={`/${w.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Tocar/Assistir (link do cliente)"
                          className="inline-flex items-center justify-center"
                        >
                          <Play className="h-4 w-4 text-[var(--wm-text-secondary)] hover:text-primary motion-transition" />
                        </a>
                        <button
                          type="button"
                          title="Copiar link do lead (inscrição)"
                          className="inline-flex items-center justify-center"
                          disabled={copiedLeadForWebinarId === w.id}
                          onClick={async () => {
                            // Link público padrão do cliente: "/{slug}"
                            // A rota "/[slug]" redireciona para "/live/{code}/{slug}" (tela de captura/login por e-mail).
                            const leadUrl = `${window.location.origin}/${w.slug}`;
                            try {
                              await navigator.clipboard.writeText(leadUrl);
                              setCopiedLeadForWebinarId(w.id);
                              window.setTimeout(() => {
                                setCopiedLeadForWebinarId((curr) => (curr === w.id ? null : curr));
                              }, 1500);
                            } catch {
                              // fallback: abre o link público (pelo menos o usuário consegue copiar/compartilhar)
                              window.open(leadUrl, "_blank", "noopener,noreferrer");
                            }
                          }}
                        >
                          {copiedLeadForWebinarId === w.id ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : (
                            <Copy className="h-4 w-4 text-[var(--wm-text-secondary)] hover:text-primary motion-transition" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {webinars.length === 0 && (
                  <tr>
                    <td
                      colSpan={showOwnerColumn ? 7 : 6}
                      style={{ textAlign: "center", padding: 24 }}
                    >
                      {userRole === "GERENTE"
                        ? "Nenhum webinar. Crie um ou peça ao admin para vincular vendedores em Equipe."
                        : "Nenhum webinar cadastrado ainda."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="wm-footer">
          <Clock className="mr-1 inline-block h-4 w-4 align-middle" /> Última
          atualização:{" "}
          {new Date().toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}{" "}
          •{" "}
          <strong>
            {stats.totalWebinars.toLocaleString("pt-BR")} webinars
          </strong>{" "}
          cadastrados
        </div>
      </div>

      {canCreateWebinar && (
        <Modal
          isOpen={newWebinarOpen}
          onClose={() => setNewWebinarOpen(false)}
          title="Novo webinar"
        >
          <NewWebinarForm onCancel={() => setNewWebinarOpen(false)} />
        </Modal>
      )}
    </div>
  );
}

