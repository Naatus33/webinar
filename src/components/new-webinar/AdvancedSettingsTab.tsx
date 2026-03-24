"use client";

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

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors ${
        enabled ? "bg-primary" : "bg-slate-700"
      }`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
          enabled ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
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
            <Toggle enabled={redirectEnabled} onToggle={() => onChange("redirectEnabled", !redirectEnabled)} />
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
            <Toggle enabled={passwordEnabled} onToggle={() => onChange("passwordEnabled", !passwordEnabled)} />
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
          <Toggle enabled={replayEnabled} onToggle={() => onChange("replayEnabled", !replayEnabled)} />
        </div>

        {/* LGPD */}
        <div className="space-y-2 rounded-lg border border-slate-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-200">Consentimento LGPD</p>
              <p className="text-xs text-slate-500">Exibir checkbox de consentimento no formulário</p>
            </div>
            <Toggle enabled={lgpdEnabled} onToggle={() => onChange("lgpdEnabled", !lgpdEnabled)} />
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
