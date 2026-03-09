import { redirect } from "next/navigation";

import LoginForm from "@/components/auth/LoginForm";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_12%,rgba(14,165,233,0.16),transparent_35%),radial-gradient(circle_at_12%_90%,rgba(20,184,166,0.2),transparent_35%)]" />

      <section className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white/95 p-8 shadow-[0_26px_60px_-28px_rgba(3,15,34,0.55)]">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">AloPro</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">Connexion</h1>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          Plateforme interne de gestion des projets, taches et messages.
        </p>

        <div className="mt-6">
          <LoginForm />
        </div>

        <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          Compte admin seed: admin@alopro.com / Admin@1234
        </div>
      </section>
    </main>
  );
}
