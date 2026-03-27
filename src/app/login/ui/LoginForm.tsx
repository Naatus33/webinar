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
    } catch {
      setError("Ocorreu um erro ao tentar entrar. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="space-y-2 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-[24px] border border-primary/25 bg-primary/10 shadow-2xl shadow-primary/10">
          <Zap className="h-8 w-8 fill-primary/20 text-primary" />
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tight text-foreground">Bem-vindo de volta</h1>
        <p className="text-sm font-medium text-muted-foreground">
          Acesse sua torre de comando para gerenciar seus webinars.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="ml-1 block text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              E-mail Profissional
            </label>
            <div className="group relative">
              <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 w-full rounded-2xl border border-input bg-background pl-12 pr-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10"
                placeholder="exemplo@empresa.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="ml-1 flex items-center justify-between">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                Senha de Acesso
              </label>
              <button type="button" className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">
                Esqueceu?
              </button>
            </div>
            <div className="group relative">
              <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 w-full rounded-2xl border border-input bg-background pl-12 pr-4 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10"
                placeholder="••••••••"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="flex animate-in items-center gap-3 rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-destructive fade-in slide-in-from-top-2 duration-300">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-xs font-bold">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="group relative flex h-14 w-full items-center justify-center overflow-hidden rounded-2xl bg-primary px-6 text-sm font-black text-primary-foreground shadow-2xl shadow-primary/20 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <div className="flex items-center gap-2">
              <span>ENTRAR NO SISTEMA</span>
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </div>
          )}
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-shimmer" />
        </button>
      </form>

      <div className="text-center">
        <p className="text-xs font-medium text-muted-foreground">
          Não tem uma conta?{" "}
          <button type="button" className="font-black text-primary hover:underline">
            Fale com o suporte
          </button>
        </p>
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
