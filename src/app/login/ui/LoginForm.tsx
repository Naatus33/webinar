"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Mail, Lock, Loader2, AlertCircle, ArrowRight, Zap } from "lucide-react";

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

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setError("Credenciais inválidas. Verifique seu e-mail e senha.");
        setLoading(false);
        return;
      }

      router.push(callbackUrl);
    } catch (err) {
      setError("Ocorreu um erro ao tentar entrar. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-[24px] bg-primary/10 border border-primary/20 mb-4 shadow-2xl shadow-primary/10">
          <Zap className="h-8 w-8 text-primary fill-primary/20" />
        </div>
        <h1 className="text-3xl font-black text-white uppercase tracking-tight">Bem-vindo de volta</h1>
        <p className="text-sm text-slate-500 font-medium">Acesse sua torre de comando para gerenciar seus webinars.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
              E-mail Profissional
            </label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600 group-focus-within:text-primary transition-colors" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 w-full rounded-2xl border border-slate-800 bg-slate-900/50 pl-12 pr-4 text-sm text-white outline-none placeholder:text-slate-700 transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                placeholder="exemplo@empresa.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                Senha de Acesso
              </label>
              <button type="button" className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">Esqueceu?</button>
            </div>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600 group-focus-within:text-primary transition-colors" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 w-full rounded-2xl border border-slate-800 bg-slate-900/50 pl-12 pr-4 text-sm text-white outline-none placeholder:text-slate-700 transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                placeholder="••••••••"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 animate-in fade-in slide-in-from-top-2 duration-300">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-xs font-bold">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="group relative flex h-14 w-full items-center justify-center rounded-2xl bg-primary px-6 text-sm font-black text-white shadow-2xl shadow-primary/20 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60 overflow-hidden"
        >
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <div className="flex items-center gap-2">
              <span>ENTRAR NO SISTEMA</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
        </button>
      </form>

      <div className="text-center">
        <p className="text-xs text-slate-600 font-medium">
          Não tem uma conta? <button className="text-primary font-black hover:underline">Fale com o suporte</button>
        </p>
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
