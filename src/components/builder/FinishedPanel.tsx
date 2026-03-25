"use client";

import { SwitchRow } from "@/components/ui/switch-row";
import { useWebinarStore } from "@/store/useWebinarStore";

export function FinishedPanel() {
  const { config, updateConfig } = useWebinarStore();
  const { finished } = config;

  return (
    <div className="space-y-5 p-5">
      <div>
        <h3 className="text-sm font-semibold text-slate-200">Página de Encerramento</h3>
        <p className="text-xs text-slate-500">O que aparece após o webinar finalizar.</p>
      </div>

      <div className="space-y-4 rounded-lg border border-slate-800 p-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-400">Mensagem de encerramento</label>
          <textarea rows={3} value={finished.message}
            onChange={(e) => updateConfig("finished", { message: e.target.value })}
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-primary focus:ring-2 resize-none"
            placeholder="Obrigado por participar!" />
        </div>

        <SwitchRow
          enabled={finished.showOfferButton}
          onToggle={() => updateConfig("finished", { showOfferButton: !finished.showOfferButton })}
          label="Exibir botão de oferta final"
        />

        {finished.showOfferButton && (
          <>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-400">Texto do botão de oferta</label>
              <input type="text" value={finished.offerText}
                onChange={(e) => updateConfig("finished", { offerText: e.target.value })}
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50 outline-none ring-primary focus:ring-2" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-400">URL de destino</label>
              <input type="url" value={finished.offerUrl}
                onChange={(e) => updateConfig("finished", { offerUrl: e.target.value })}
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50 outline-none ring-primary focus:ring-2" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
