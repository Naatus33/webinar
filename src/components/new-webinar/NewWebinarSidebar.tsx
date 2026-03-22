"use client";

import { AlertCircle, CheckCircle2, Settings, Sliders, FileText } from "lucide-react";

export type NewWebinarTab = "general" | "advanced" | "registration";

interface NewWebinarSidebarProps {
  activeTab: NewWebinarTab;
  onTabChange: (tab: NewWebinarTab) => void;
  generalValid: boolean;
}

const tabs: { id: NewWebinarTab; label: string; Icon: React.ElementType }[] = [
  { id: "general", label: "Configurações Gerais", Icon: Settings },
  { id: "advanced", label: "Configurações Avançadas", Icon: Sliders },
  { id: "registration", label: "Página de Cadastro", Icon: FileText },
];

export function NewWebinarSidebar({ activeTab, onTabChange, generalValid }: NewWebinarSidebarProps) {
  return (
    <aside className="flex w-60 flex-shrink-0 flex-col gap-1 border-r border-slate-800 bg-slate-950 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
        Etapas
      </p>
      {tabs.map(({ id, label, Icon }) => {
        const isActive = activeTab === id;
        const showWarning = id === "general" && !generalValid;

        return (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
              isActive
                ? "bg-violet-600/20 text-violet-300"
                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            }`}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1 text-left">{label}</span>
            {showWarning ? (
              <AlertCircle className="h-3.5 w-3.5 text-yellow-500" />
            ) : id === "general" ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            ) : null}
          </button>
        );
      })}
    </aside>
  );
}
