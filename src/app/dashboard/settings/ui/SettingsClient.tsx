"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { useAppTheme } from "@/components/theme/ThemeProvider";
import type { UserPreferences } from "@/lib/user-preferences-schema";
import { DEFAULT_USER_PREFERENCES, parseUserPreferences } from "@/lib/user-preferences-schema";

export function SettingsClient() {
  const { setTheme } = useAppTheme();
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me")
      .then((r) => {
        if (!r.ok) throw new Error("fetch");
        return r.json();
      })
      .then((d: { preferences?: unknown }) => {
        if (cancelled) return;
        setPrefs(parseUserPreferences(d.preferences));
      })
      .catch(() => {
        if (!cancelled) setMessage("Não foi possível carregar as preferências.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        theme: prefs.theme,
        uiDensity: prefs.uiDensity,
        defaultWebinarBranding: prefs.defaultWebinarBranding,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setMessage("Erro ao salvar. Tente novamente.");
      return;
    }
    const data = (await res.json()) as { preferences: UserPreferences };
    setPrefs(data.preferences);
    setTheme(data.preferences.theme);
    setMessage("Preferências salvas.");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Aparência</h2>
        <p className="text-xs text-muted-foreground">
          O tema do painel (claro / escuro / sistema) é guardado na sua conta e num cookie para
          carregar mais rápido.
        </p>
        <div className="flex flex-wrap gap-2">
          {(["light", "dark", "system"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setPrefs((p) => ({ ...p, theme: t }))}
              className={[
                "rounded-lg border px-3 py-2 text-xs font-medium transition",
                prefs.theme === t
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-muted/40 text-muted-foreground hover:border-border/80",
              ].join(" ")}
            >
              {t === "light" ? "Claro" : t === "dark" ? "Escuro" : "Sistema"}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Listas e densidade</h2>
        <div className="flex flex-wrap gap-2">
          {(["comfortable", "compact"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setPrefs((p) => ({ ...p, uiDensity: d }))}
              className={[
                "rounded-lg border px-3 py-2 text-xs font-medium transition",
                prefs.uiDensity === d
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border bg-muted/40 text-muted-foreground hover:border-border/80",
              ].join(" ")}
            >
              {d === "comfortable" ? "Confortável" : "Compacta"}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          A densidade será aplicada nas próximas telas que suportarem este ajuste.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Marca padrão para novos webinars</h2>
        <p className="text-xs text-muted-foreground">
          Cores e logo aplicados por cima do template ao criar um webinar (pode editar depois no
          builder).
        </p>
        <div className="grid max-w-md gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-xs text-muted-foreground">
            Cor primária
            <input
              type="text"
              value={prefs.defaultWebinarBranding?.primaryColor ?? ""}
              onChange={(e) =>
                setPrefs((p) => ({
                  ...p,
                  defaultWebinarBranding: {
                    ...p.defaultWebinarBranding,
                    primaryColor: e.target.value || undefined,
                  },
                }))
              }
              placeholder="#F9B17A"
              className="h-9 w-full rounded-md border border-border bg-background/60 px-2 text-sm text-foreground"
            />
          </label>
          <label className="block space-y-1 text-xs text-muted-foreground">
            Cor secundária
            <input
              type="text"
              value={prefs.defaultWebinarBranding?.secondaryColor ?? ""}
              onChange={(e) =>
                setPrefs((p) => ({
                  ...p,
                  defaultWebinarBranding: {
                    ...p.defaultWebinarBranding,
                    secondaryColor: e.target.value || undefined,
                  },
                }))
              }
              placeholder="#EC4899"
              className="h-9 w-full rounded-md border border-border bg-background/60 px-2 text-sm text-foreground"
            />
          </label>
        </div>
        <label className="block max-w-md space-y-1 text-xs text-muted-foreground">
          URL do logo (opcional)
          <input
            type="url"
            value={prefs.defaultWebinarBranding?.logo ?? ""}
            onChange={(e) =>
              setPrefs((p) => ({
                ...p,
                defaultWebinarBranding: {
                  ...p.defaultWebinarBranding,
                  logo: e.target.value || undefined,
                },
              }))
            }
            placeholder="https://..."
            className="h-9 w-full rounded-md border border-border bg-background/60 px-2 text-sm text-foreground"
          />
        </label>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-[0_8px_24px_rgba(249,177,122,0.3)] hover:brightness-110 disabled:opacity-60 motion-transition"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Salvando..." : "Salvar preferências"}
        </button>
        {message && <span className="text-xs text-muted-foreground">{message}</span>}
      </div>
    </div>
  );
}
