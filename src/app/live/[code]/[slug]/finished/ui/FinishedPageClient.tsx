"use client";

import type { WebinarConfig } from "@/lib/webinar-templates";
import { CheckCircle } from "lucide-react";

interface WebinarData {
  id: string;
  name: string;
  redirectEnabled: boolean;
  redirectUrl: string | null;
  config: WebinarConfig;
}

export function FinishedPageClient({ webinar }: { webinar: WebinarData }) {
  const { config } = webinar;
  const { finished, branding, layout } = config;

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 text-center"
      style={{ backgroundColor: layout.bgColor }}
    >
      {branding.logo ? (
        <img src={branding.logo} alt="Logo" className="mb-6 h-10 w-auto" />
      ) : (
        <div className="mb-6 h-10 w-10 rounded-full" style={{ backgroundColor: branding.primaryColor }} />
      )}

      <CheckCircle className="mb-4 h-14 w-14 text-emerald-400" />

      <h1 className="mb-3 text-2xl font-bold text-white">
        {finished.message || "Obrigado por participar!"}
      </h1>

      <p className="mb-8 max-w-md text-sm text-white/60">
        Esperamos que o conteúdo tenha sido valioso para você. Fique de olho no seu e-mail para mais novidades!
      </p>

      {finished.showOfferButton && finished.offerUrl && (
        <a
          href={finished.offerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-12 items-center rounded-xl px-8 text-base font-bold text-white shadow-lg transition hover:scale-[1.02]"
          style={{ backgroundColor: branding.primaryColor }}
        >
          {finished.offerText || "Aproveitar oferta"}
        </a>
      )}
    </div>
  );
}
