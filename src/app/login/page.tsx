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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_12%,rgba(14,165,233,0.16),transparent_35%),radial-gradient(circle_at_12%_90%,rgba(20,184,166,0.2),transparent_35%)]" />

      <section className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/92 shadow-[0_36px_80px_-44px_rgba(15,23,42,0.55)] backdrop-blur md:grid-cols-[1.05fr_0.95fr]">
        <div className="relative bg-[linear-gradient(155deg,#0f172a,#1e3a8a_58%,#0ea5e9)] p-7 text-white md:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.22),transparent_30%)]" />
          <div className="relative">
            <BrandMark
              dark
              subtitle="Pilotage centralise des projets, taches et communications d'equipe."
            />
            <div className="mt-10 max-w-md">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-100">Workspace professionnel</p>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                Une interface claire pour coordonner l&apos;execution.
              </h1>
              <p className="mt-4 text-sm leading-7 text-slate-200">
                Connectez-vous pour suivre les equipes, assigner les responsabilites et centraliser les actions critiques sur une seule plateforme.
              </p>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-100">
                Gestion multi-equipes
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-100">
                Emails et suivi interne
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-slate-100">
                Interface responsive
              </span>
            </div>
          </div>
        </div>

        <div className="p-7 md:p-10">
          <span className="form-kicker">AloPro access</span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">Connexion</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Accedez a votre espace de travail pour gerer les operations et la collaboration.
          </p>

          <div className="mt-6">
            <LoginForm />
          </div>
        </div>
      </section>
    </main>
  );
}
