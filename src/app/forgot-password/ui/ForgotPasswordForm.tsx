"use client";

import { useState } from "react";

const inputClass =
  "h-10 w-full rounded-xl border border-border/80 bg-background/50 px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground transition motion-transition focus:border-primary focus:ring-2 focus:ring-primary/35";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setLoading(false);

    if (!res.ok) {
      setError("Não foi possível enviar o e-mail. Tente novamente.");
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <p className="text-sm text-foreground">
        Se existir uma conta com esse e-mail, enviamos um link de redefinição
        de senha.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="block text-xs font-medium text-foreground">
          E-mail
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          placeholder="voce@empresa.com"
        />
      </div>

      {error && (
        <p className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex h-10 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-[0_10px_28px_rgba(249,177,122,0.35)] transition motion-safe:hover:brightness-110 disabled:opacity-60"
      >
        {loading ? "Enviando..." : "Enviar link"}
      </button>
    </form>
  );
}
