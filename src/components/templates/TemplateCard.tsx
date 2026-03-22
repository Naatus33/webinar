"use client";

import type { WebinarTemplate } from "@/lib/webinar-templates";
import { CheckCircle } from "lucide-react";

interface TemplateCardProps {
  template: WebinarTemplate;
  selected: boolean;
  onSelect: (id: string) => void;
}

export function TemplateCard({ template, selected, onSelect }: TemplateCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(template.id)}
      className={`relative flex flex-col overflow-hidden rounded-xl border-2 text-left transition-all hover:scale-[1.02] ${
        selected
          ? "border-violet-500 ring-2 ring-violet-500/40"
          : "border-slate-700 hover:border-slate-500"
      }`}
    >
      {/* Preview visual */}
      <div
        className="flex h-28 items-center justify-center"
        style={{ backgroundColor: template.previewBg }}
      >
        <div className="flex flex-col items-center gap-1">
          <div
            className="h-2 w-24 rounded-full opacity-80"
            style={{ backgroundColor: template.config.branding.primaryColor }}
          />
          <div
            className="h-1.5 w-16 rounded-full opacity-50"
            style={{ backgroundColor: template.config.branding.secondaryColor }}
          />
          <div className="mt-2 flex gap-1">
            <div className="h-8 w-14 rounded bg-black/30" />
            <div className="h-8 w-8 rounded bg-black/20" />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1 bg-slate-900 p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-50">{template.name}</p>
            <span className="inline-block rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
              {template.niche}
            </span>
          </div>
          {selected && <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-violet-400" />}
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">{template.description}</p>
      </div>
    </button>
  );
}
