"use client";

import { Switch } from "@/components/ui/switch";

interface AdvancedSettingsTabProps {
  redirectEnabled: boolean;
  redirectUrl: string;
  passwordEnabled: boolean;
  password: string;
  replayEnabled: boolean;
  lgpdEnabled: boolean;
  lgpdText: string;
  onChange: (field: string, value: unknown) => void;
}

export function AdvancedSettingsTab({
  redirectEnabled,
  redirectUrl,
  passwordEnabled,
  password,
  replayEnabled,
  lgpdEnabled,
  lgpdText,
  onChange,
}: AdvancedSettingsTabProps) {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-50">Configurações Avançadas</h2>
        <p className="text-sm text-slate-400">Personalizar comportamento avançado do webinar.</p>
      </div>

      <div className="space-y-4">
        {/* Redirecionamento */}
        <div className="space-y-2 rounded-lg border border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-200">Redirecionar após o webinar</p>
              <p className="text-xs text-slate-500">Enviar o participante para uma URL ao finalizar</p>
            </div>
            <Switch
              enabled={redirectEnabled}
              onToggle={() => onChange("redirectEnabled", !redirectEnabled)}
              aria-label="Redirecionar após o webinar"
              className="shrink-0 motion-transition"
            />
          </div>
          {redirectEnabled && (
            <input
              type="url"
              value={redirectUrl}
              onChange={(e) => onChange("redirectUrl", e.target.value)}
              className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50 outline-none ring-primary placeholder:text-slate-500 focus:ring-2"
              placeholder="https://seusite.com/obrigado"
            />
          )}
        </div>

        {/* Senha */}
        <div className="space-y-2 rounded-lg border border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-200">Proteger com senha</p>
              <p className="text-xs text-slate-500">Exigir senha para acessar a página de captura</p>
            </div>
            <Switch
              enabled={passwordEnabled}
              onToggle={() => onChange("passwordEnabled", !passwordEnabled)}
              aria-label="Proteger com senha"
              className="shrink-0 motion-transition"
            />
          </div>
          {passwordEnabled && (
            <input
              type="text"
              value={password}
              onChange={(e) => onChange("password", e.target.value)}
              className="h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-50 outline-none ring-primary placeholder:text-slate-500 focus:ring-2"
              placeholder="Senha de acesso"
            />
          )}
        </div>

        {/* Replay */}
        <div className="flex items-center justify-between rounded-lg border border-slate-800 p-4">
          <div>
            <p className="text-sm font-medium text-slate-200">Habilitar replay</p>
            <p className="text-xs text-slate-500">Permite assistir ao webinar após o término</p>
          </div>
          <Switch
            enabled={replayEnabled}
            onToggle={() => onChange("replayEnabled", !replayEnabled)}
            aria-label="Habilitar replay"
            className="shrink-0 motion-transition"
          />
        </div>

        {/* LGPD */}
        <div className="space-y-2 rounded-lg border border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-200">Consentimento LGPD</p>
              <p className="text-xs text-slate-500">Exibir checkbox de consentimento no formulário</p>
            </div>
            <Switch
              enabled={lgpdEnabled}
              onToggle={() => onChange("lgpdEnabled", !lgpdEnabled)}
              aria-label="Consentimento LGPD"
              className="shrink-0 motion-transition"
            />
          </div>
          {lgpdEnabled && (
            <textarea
              value={lgpdText}
              onChange={(e) => onChange("lgpdText", e.target.value)}
              rows={3}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 outline-none ring-primary placeholder:text-slate-500 focus:ring-2 resize-none"
              placeholder="Ao se inscrever, você concorda com nossa Política de Privacidade e aceita receber comunicações por e-mail."
            />
          )}
        </div>
      </div>
    </div>
  );
}
