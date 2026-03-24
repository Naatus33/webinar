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
    <aside className="flex w-60 flex-shrink-0 flex-col gap-1 border-r border-border bg-card/40 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
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
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm motion-transition ${
              isActive
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
