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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(15,23,42,0.09),transparent_38%),radial-gradient(circle_at_bottom_left,_rgba(20,184,166,0.16),transparent_34%)]" />

      <section className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">AloPro</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Connexion</h1>
        <p className="mt-1 text-sm text-slate-600">
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
