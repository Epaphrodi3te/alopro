import { redirect } from "next/navigation";

import LoginForm from "@/components/auth/LoginForm";
import BrandMark from "@/components/brand/BrandMark";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg md:grid-cols-[1fr_1fr]">
        <div className="bg-slate-900 p-8 text-white md:p-10">
          <BrandMark dark subtitle="Gestion de projets et taches" />
          <div className="mt-10">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Centralisez votre activite.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              Suivez l&apos;avancement, assignez et validez rapidement.
            </p>
          </div>
        </div>

        <div className="p-8 md:p-10">
          <span className="form-kicker">Connexion</span>
          <h2 className="mt-3 text-xl font-bold text-slate-900">Accedez a votre espace</h2>
          <p className="mt-1 text-sm text-slate-500">Entrez vos identifiants pour continuer.</p>

          <div className="mt-6">
            <LoginForm />
          </div>
        </div>
      </section>
    </main>
  );
}
