"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type Role = "ADMIN" | "GERENTE";

type AdminUserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  managerId: string | null;
  manager: { id: string; name: string | null; email: string } | null;
  _count: { webinars: number };
};

type TeamMember = {
  id: string;
  name: string | null;
  email: string;
  _count: { webinars: number };
};

export function EquipeClient({ role }: { role: Role }) {
  const [loading, setLoading] = useState(true);
  const [adminUsers, setAdminUsers] = useState<AdminUserRow[]>([]);
  const [managers, setManagers] = useState<{ id: string; label: string }[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const loadAdmin = useCallback(async () => {
    const res = await fetch("/api/admin/team");
    if (!res.ok) return;
    const data = await res.json();
    const users = data.users as AdminUserRow[];
    setAdminUsers(users);
    const mgrs = users
      .filter((u) => u.role === "GERENTE" || u.role === "ADMIN")
      .map((u) => ({
        id: u.id,
        label: `${u.name ?? u.email} (${u.role === "ADMIN" ? "Admin" : "Gestor"})`,
      }));
    setManagers(mgrs);
  }, []);

  const loadGestor = useCallback(async () => {
    const res = await fetch("/api/team/my-team");
    if (!res.ok) return;
    const data = await res.json();
    setTeamMembers(data.members ?? []);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (role === "ADMIN") await loadAdmin();
      else await loadGestor();
      setLoading(false);
    })();
  }, [role, loadAdmin, loadGestor]);

  async function assignManager(vendedorId: string, managerId: string | null) {
    setSaving(vendedorId);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: vendedorId, managerId }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(j.error ?? "Erro ao salvar");
        return;
      }
      setMsg("Atualizado.");
      await loadAdmin();
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-slate-400">Carregando…</p>
    );
  }

  if (role === "GERENTE") {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-violet-500/20 bg-violet-950/20 px-4 py-3 text-sm text-violet-200/90">
          <strong className="text-violet-100">Sua equipe</strong> — vendedores vinculados a você aparecem aqui.
          Peça ao administrador para atribuir vendedores ao seu perfil.
        </div>
        {teamMembers.length === 0 ? (
          <p className="text-slate-400">
            Nenhum vendedor vinculado ainda. Quando o admin associar vendedores a você, os webinars deles
            aparecerão no seu dashboard.
          </p>
        ) : (
          <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950/50">
            {teamMembers.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="font-medium text-slate-100">{m.name ?? m.email}</p>
                  <p className="text-xs text-slate-500">{m.email}</p>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <span>{m._count.webinars} webinar(s)</span>
                  <Link
                    href="/dashboard"
                    className="text-violet-400 hover:text-violet-300"
                  >
                    Ver no painel →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  const vendedores = adminUsers.filter((u) => u.role === "VENDEDOR");

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-400">
        Associe cada <strong className="text-slate-200">vendedor</strong> a um <strong className="text-slate-200">gestor</strong>.
        O gestor passa a ver e operar os webinars desse vendedor no painel.
      </p>
      {msg && (
        <p className={`text-sm ${msg.includes("Erro") ? "text-red-400" : "text-emerald-400"}`}>{msg}</p>
      )}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-500">
              <th className="px-4 py-3 font-medium">Vendedor</th>
              <th className="px-4 py-3 font-medium">Gestor</th>
            </tr>
          </thead>
          <tbody>
            {vendedores.map((v) => (
              <tr key={v.id} className="border-b border-slate-800/80">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-100">{v.name ?? v.email}</div>
                  <div className="text-xs text-slate-500">{v.email}</div>
                  <div className="mt-1 text-xs text-slate-600">{v._count.webinars} webinar(s)</div>
                </td>
                <td className="px-4 py-3">
                  <select
                    className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                    value={v.managerId ?? ""}
                    disabled={saving === v.id}
                    onChange={(e) => {
                      const val = e.target.value;
                      void assignManager(v.id, val === "" ? null : val);
                    }}
                  >
                    <option value="">— Sem gestor —</option>
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {vendedores.length === 0 && (
          <p className="p-6 text-center text-slate-500">Nenhum vendedor cadastrado.</p>
        )}
      </div>
    </div>
  );
}

export function EquipeHeaderActions() {
  return (
    <Link
      href="/dashboard"
      className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
    >
      <ArrowLeft className="h-4 w-4" />
      Voltar ao painel
    </Link>
  );
}
