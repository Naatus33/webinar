"use client";

import { useWebinarStore } from "@/store/useWebinarStore";

export function ContentPanel() {
  const { config, updateConfig } = useWebinarStore();
  const { content } = config;

  return (
    <div className="space-y-5 p-5">
      <div>
        <h3 className="text-sm font-semibold text-slate-200">Conteúdo</h3>
        <p className="text-xs text-slate-500">Textos exibidos na página do webinar.</p>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-slate-400">Título principal</label>
        <input
          type="text"
          value={content.title}
          onChange={(e) => updateConfig("content", { title: e.target.value })}
          className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50 outline-none ring-violet-500 placeholder:text-slate-500 focus:ring-2"
          placeholder="Título do seu webinar"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-slate-400">Subtítulo</label>
        <input
          type="text"
          value={content.subtitle}
          onChange={(e) => updateConfig("content", { subtitle: e.target.value })}
          className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50 outline-none ring-violet-500 placeholder:text-slate-500 focus:ring-2"
          placeholder="Subtítulo ou slogan"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-slate-400">Descrição</label>
        <textarea
          value={content.description}
          onChange={(e) => updateConfig("content", { description: e.target.value })}
          rows={4}
          className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-violet-500 placeholder:text-slate-500 focus:ring-2 resize-none"
          placeholder="Descrição que aparece abaixo do player..."
        />
      </div>
    </div>
  );
}
