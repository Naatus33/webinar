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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-app-gradient px-4 font-sans">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-[40%] w-[40%] animate-pulse rounded-full bg-primary/15 blur-[120px]" />
        <div
          className="absolute bottom-[-10%] right-[-10%] h-[40%] w-[40%] animate-pulse rounded-full bg-muted blur-[120px]"
          style={{ animationDelay: "1s" }}
        />
        <div className="absolute inset-0 bg-[url('/grid-bg.svg')] bg-center opacity-[0.08] dark:opacity-[0.12]" />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-[2rem] border border-border/80 bg-card/92 p-10 shadow-premium backdrop-blur-2xl md:rounded-[2.25rem]">
        <LoginForm />
      </div>

      <div className="absolute bottom-8 z-10 w-full text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
          Ambiente Seguro & Criptografado • 2026
        </p>
      </div>
    </div>
  );
}
