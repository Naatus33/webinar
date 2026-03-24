import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { LoginForm } from "./ui/LoginForm";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 font-sans">
      
      {/* Background Dinâmico Premium */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute inset-0 bg-[url('/grid-bg.svg')] bg-center opacity-10" />
      </div>

      {/* Container de Login com Glassmorphism */}
      <div className="relative z-10 w-full max-w-md p-10 rounded-[48px] bg-slate-900/40 border border-slate-800/60 backdrop-blur-3xl shadow-2xl shadow-black/50">
        <LoginForm />
      </div>

      {/* Rodapé de Segurança */}
      <div className="absolute bottom-8 text-center w-full z-10">
        <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">
          Ambiente Seguro & Criptografado • 2026
        </p>
      </div>
    </div>
  );
}
