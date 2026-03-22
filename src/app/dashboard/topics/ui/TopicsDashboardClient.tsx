"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, PlusCircle, Trash2, X } from "lucide-react";

type Topic = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
};

export function TopicsDashboardClient() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  async function fetchTopics() {
    const res = await fetch("/api/topics");
    if (!res.ok) return;
    const data = (await res.json()) as Topic[];
    setTopics(data);
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/topics");
        if (!res.ok) return;
        const data = (await res.json()) as Topic[];
        if (mounted) setTopics(data);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;

    setCreating(true);
    try {
      const res = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "Erro ao criar tema.");
        return;
      }

      setNewName("");
      await fetchTopics();
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    const name = editingName.trim();
    if (!name) return;

    setSavingEdit(true);
    try {
      const res = await fetch(`/api/topics/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "Erro ao atualizar tema.");
        return;
      }

      setEditingId(null);
      setEditingName("");
      await fetchTopics();
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = confirm("Tem certeza que deseja excluir este tema?");
    if (!ok) return;

    const res = await fetch(`/api/topics/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Erro ao excluir tema.");
      return;
    }

    await fetchTopics();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Temas</h2>
          <p className="text-sm text-slate-400">
            Use temas para organizar os tópicos dos seus webinars.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-300">
              Novo tema
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Vendas, Marketing, Onboarding..."
              className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50 outline-none ring-violet-500 focus:ring-2"
              disabled={creating}
            />
          </div>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || newName.trim().length === 0}
            className="mt-1 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-violet-600 px-4 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
            Adicionar
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="py-3 text-left font-semibold text-slate-400">Tema</th>
              <th className="py-3 text-left font-semibold text-slate-400">Slug</th>
              <th className="py-3 text-right font-semibold text-slate-400">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="py-10 text-center text-slate-500">
                  Carregando...
                </td>
              </tr>
            ) : topics.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-10 text-center text-slate-500">
                  Nenhum tema cadastrado.
                </td>
              </tr>
            ) : (
              topics.map((t) => {
                const isEditing = editingId === t.id;
                return (
                  <tr key={t.id} className="border-b border-slate-800/40">
                    <td className="py-4">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="h-9 w-full rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-50 outline-none ring-violet-500 focus:ring-2"
                          disabled={savingEdit}
                        />
                      ) : (
                        <span className="font-medium text-slate-100">{t.name}</span>
                      )}
                    </td>
                    <td className="py-4 text-slate-400">{t.slug}</td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={handleSaveEdit}
                              disabled={savingEdit || editingName.trim().length === 0}
                              className="inline-flex h-8 items-center justify-center rounded-md bg-violet-600 px-3 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-60"
                            >
                              Salvar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(null);
                                setEditingName("");
                              }}
                              disabled={savingEdit}
                              className="inline-flex h-8 items-center justify-center rounded-md border border-slate-800 px-3 text-xs font-medium text-slate-300 hover:bg-slate-900"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(t.id);
                                setEditingName(t.name);
                              }}
                              className="inline-flex h-8 items-center justify-center rounded-md border border-slate-800 px-3 text-xs font-medium text-slate-300 hover:bg-slate-900"
                            >
                              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(t.id)}
                              className="inline-flex h-8 items-center justify-center rounded-md bg-red-500/10 px-3 text-xs font-medium text-red-300 hover:bg-red-500/20"
                            >
                              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Excluir
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

