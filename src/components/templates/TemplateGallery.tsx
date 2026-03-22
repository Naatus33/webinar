"use client";

import { webinarTemplates } from "@/lib/webinar-templates";
import { TemplateCard } from "./TemplateCard";

interface TemplateGalleryProps {
  selected: string;
  onSelect: (id: string) => void;
}

export function TemplateGallery({ selected, onSelect }: TemplateGalleryProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-50">Escolha um template</h2>
        <p className="text-sm text-slate-400">
          Selecione um ponto de partida para o seu webinar. Você pode personalizar tudo depois.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {webinarTemplates.map((t) => (
          <TemplateCard
            key={t.id}
            template={t}
            selected={selected === t.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
