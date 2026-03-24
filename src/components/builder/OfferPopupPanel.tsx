"use client";

import { useRef } from "react";
import { useWebinarStore } from "@/store/useWebinarStore";

function Toggle({ enabled, onToggle, label, description }: { enabled: boolean; onToggle: () => void; label: string; description?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-200">{label}</p>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
      <button type="button" onClick={onToggle} className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${enabled ? "bg-primary" : "bg-slate-700"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-4" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

export function OfferPopupPanel() {
  const { config, updateConfig, webinarId } = useWebinarStore();
  const { offerPopup } = config;
  const imgRef = useRef<HTMLInputElement>(null);

  async function handleImageUpload(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    if (webinarId) formData.append("webinarId", webinarId);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    if (res.ok) {
      const data = await res.json();
      updateConfig("offerPopup", { image: data.url });
    }
  }

  return (
    <div className="space-y-5 p-5">
      <div>
        <h3 className="text-sm font-semibold text-slate-200">Pop-up de Oferta</h3>
        <p className="text-xs text-slate-500">Pop-up que aparece após X minutos.</p>
      </div>

      <div className="space-y-4 rounded-lg border border-slate-800 p-4">
        <Toggle
          enabled={offerPopup.enabled}
          onToggle={() => updateConfig("offerPopup", { enabled: !offerPopup.enabled })}
          label="Ativar pop-up de oferta"
        />

        {offerPopup.enabled && (
          <>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-400">Aparecer após (minutos)</label>
              <input type="number" min={0} value={offerPopup.delayMinutes}
                onChange={(e) => updateConfig("offerPopup", { delayMinutes: parseInt(e.target.value) || 0 })}
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50 outline-none ring-primary focus:ring-2" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-400">Fechar automaticamente após (segundos, 0 = manual)</label>
              <input type="number" min={0} value={offerPopup.autoCloseSeconds}
                onChange={(e) => updateConfig("offerPopup", { autoCloseSeconds: parseInt(e.target.value) || 0 })}
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50 outline-none ring-primary focus:ring-2" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-400">Título do pop-up</label>
              <input type="text" value={offerPopup.title}
                onChange={(e) => updateConfig("offerPopup", { title: e.target.value })}
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50 outline-none ring-primary focus:ring-2" placeholder="Oferta especial para você!" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-400">Texto do pop-up</label>
              <textarea rows={2} value={offerPopup.text}
                onChange={(e) => updateConfig("offerPopup", { text: e.target.value })}
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-primary focus:ring-2 resize-none" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-400">Texto do botão</label>
              <input type="text" value={offerPopup.buttonText}
                onChange={(e) => updateConfig("offerPopup", { buttonText: e.target.value })}
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50 outline-none ring-primary focus:ring-2" placeholder="Quero aproveitar!" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-400">URL de destino</label>
              <input type="url" value={offerPopup.buttonUrl}
                onChange={(e) => updateConfig("offerPopup", { buttonUrl: e.target.value })}
                className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50 outline-none ring-primary focus:ring-2" placeholder="https://..." />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-400">Imagem do pop-up</label>
              <button type="button" onClick={() => imgRef.current?.click()}
                className="flex h-16 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-700 text-sm text-slate-500 hover:border-slate-500 hover:text-slate-300">
                {offerPopup.image ? "Trocar imagem" : "Enviar imagem"}
              </button>
              <input ref={imgRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
