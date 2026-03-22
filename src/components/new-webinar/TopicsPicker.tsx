"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";

type Topic = {
  id: string;
  name: string;
  slug: string;
};

export function TopicsPicker({
  selectedTopicIds,
  onChangeSelectedTopicIds,
}: {
  selectedTopicIds: string[];
  onChangeSelectedTopicIds: (ids: string[]) => void;
}) {
  const selectedSet = useMemo(
    () => new Set(selectedTopicIds),
    [selectedTopicIds],
  );

  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  const [creating, setCreating] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");

  async function refresh() {
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

  async function handleCreateTopic() {
    const name = newTopicName.trim();
    if (!name || creating) return;

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

      const created = (await res.json()) as Topic;
      await refresh();

      onChangeSelectedTopicIds(Array.from(new Set([...selectedTopicIds, created.id])));
      setNewTopicName("");
    } finally {
      setCreating(false);
    }
  }

  function toggle(topicId: string) {
    if (selectedSet.has(topicId)) {
      onChangeSelectedTopicIds(selectedTopicIds.filter((id) => id !== topicId));
      return;
    }

    onChangeSelectedTopicIds([...selectedTopicIds, topicId]);
  }

  return (
    <section className="border-t border-slate-800 p-6">
      <div className="mb-4 space-y-1">
        <h3 className="text-base font-semibold text-slate-50">Temas</h3>
        <p className="text-sm text-slate-400">
          Selecione quais temas esse webinar aborda. Você também pode criar um novo tema aqui.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando temas...
        </div>
      ) : topics.length === 0 ? (
        <div className="text-sm text-slate-500">
          Nenhum tema encontrado. Crie o primeiro abaixo.
        </div>
      ) : (
        <div className="space-y-2">
          {topics.map((t) => {
            const checked = selectedSet.has(t.id);
            return (
              <label
                key={t.id}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-slate-800/60 bg-slate-900/40 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(t.id)}
                    className="accent-violet-600"
                  />
                  <span className="text-sm text-slate-100">{t.name}</span>
                </div>
                <span className="text-xs text-slate-500">{t.slug}</span>
              </label>
            );
          })}
        </div>
      )}

      <div className="mt-6 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-slate-400">Criar tema rápido</p>
          {selectedTopicIds.length > 0 && (
            <p className="text-xs text-slate-500">{selectedTopicIds.length} selecionado(s)</p>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-300">Nome</label>
            <input
              type="text"
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
              placeholder="Ex: IA, Vendas, Gestão..."
              className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50 outline-none ring-violet-500 focus:ring-2"
              disabled={creating}
            />
          </div>
          <button
            type="button"
            onClick={handleCreateTopic}
            disabled={creating || newTopicName.trim().length === 0}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-violet-600 px-4 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
            Criar
          </button>
        </div>

        {selectedTopicIds.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {selectedTopicIds.map((id) => {
              const t = topics.find((x) => x.id === id);
              const label = t?.name ?? "Tema";
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggle(id)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs text-slate-200 hover:bg-slate-900"
                  title="Remover"
                >
                  {label}
                  <Trash2 className="h-3.5 w-3.5 text-slate-400" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

