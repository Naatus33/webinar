"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (result?.error) {
      setError("Credenciais inválidas. Verifique seu e-mail e senha.");
      return;
    }

    router.push(callbackUrl);
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
      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-200">
          Senha
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
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}

