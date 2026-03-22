import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { LoginForm } from "./ui/LoginForm";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-app-gradient px-4">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.2),_transparent_55%)]" />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-3xl bg-card-glass p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-gradient-to-tr from-violet-500 to-indigo-500 shadow-[0_0_40px_rgba(79,70,229,0.8)]" />
          <h1 className="text-xl font-semibold text-slate-50">
            Entrar na plataforma
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Acesse o painel para criar e gerenciar seus webinars.
          </p>
        </div>

        <LoginForm />

        <div className="mt-6 flex items-center justify-between text-xs text-slate-400">
          <Link href="/forgot-password" className="hover:text-slate-200">
            Esqueci minha senha
          </Link>
          <span>Não tem acesso? Fale com o administrador.</span>
        </div>
      </div>
    </div>
  );
}

