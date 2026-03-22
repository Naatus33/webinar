"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ResetPasswordFormProps {
  token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirm) {
      setError("As senhas não conferem.");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    setLoading(false);

    if (!res.ok) {
      setError("Não foi possível redefinir sua senha. Tente novamente.");
      return;
    }

    router.push("/login");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-200">
          Nova senha
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-10 w-full rounded-xl border border-slate-700/70 bg-slate-950/40 px-3 text-sm text-slate-50 outline-none placeholder:text-slate-500 transition focus:border-violet-400/80 focus:ring-2 focus:ring-violet-500/70"
          placeholder="********"
        />
      </div>
      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-200">
          Confirmar senha
        </label>
        <input
          type="password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="h-10 w-full rounded-xl border border-slate-700/70 bg-slate-950/40 px-3 text-sm text-slate-50 outline-none placeholder:text-slate-500 transition focus:border-violet-400/80 focus:ring-2 focus:ring-violet-500/70"
          placeholder="********"
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
        {loading ? "Salvando..." : "Redefinir senha"}
      </button>
    </form>
  );
}

