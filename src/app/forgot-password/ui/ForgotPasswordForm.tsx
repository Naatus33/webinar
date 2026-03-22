"use client";

import { useState } from "react";

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
      <p className="text-sm text-slate-200">
        Se existir uma conta com esse e-mail, enviamos um link de redefinição
        de senha.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-200">
          E-mail
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-10 w-full rounded-xl border border-slate-700/70 bg-slate-950/40 px-3 text-sm text-slate-50 outline-none placeholder:text-slate-500 transition focus:border-violet-400/80 focus:ring-2 focus:ring-violet-500/70"
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
        className="flex h-10 w-full items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 text-sm font-medium text-white shadow-[0_10px_30px_rgba(79,70,229,0.6)] transition hover:brightness-110 disabled:opacity-60"
      >
        {loading ? "Enviando..." : "Enviar link"}
      </button>
    </form>
  );
}

