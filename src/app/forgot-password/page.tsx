import { ForgotPasswordForm } from "./ui/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-app-gradient px-4">
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="bg-[radial-gradient(circle_at_top,_rgba(249,177,122,0.16),_transparent_55%)]" />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-3xl bg-card-glass p-8">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-semibold text-foreground">
            Recuperar senha
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Informe seu e-mail para receber o link de redefinição.
          </p>
        </div>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}

