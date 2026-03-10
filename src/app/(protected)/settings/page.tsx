import { FiBell, FiLock, FiMail, FiPhone, FiShield, FiUser } from "react-icons/fi";

import Badge from "@/components/ui/Badge";
import { requireUser } from "@/lib/auth";
import { getDepartmentLabel } from "@/lib/constants";
import { getRoleLabel } from "@/lib/navigation";

export default async function SettingsPage() {
  const user = await requireUser();
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-[linear-gradient(150deg,#ffffff,#eef2ff_55%,#f8fafc)] p-6 shadow-sm">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-200/55 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-[-4rem] h-44 w-44 rounded-full bg-sky-100/65 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-indigo-700">
              <FiShield className="text-[11px]" />
              Parametres
            </p>
            <h1 className="mt-3 page-title text-slate-900">Compte et securite</h1>
            <p className="page-subtitle">
              Retrouvez vos informations personnelles, votre role et les points de securite de votre espace.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge
                label={getRoleLabel(user.role)}
                variant={user.role === "admin" ? "admin" : user.role === "manager" ? "manager" : "agent"}
              />
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                {getDepartmentLabel(user.department)}
              </span>
            </div>
          </div>
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-xl font-extrabold text-white shadow-sm">
            {initials}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <article className="app-card p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Informations du profil</h2>
            <FiUser className="text-slate-500" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Nom complet</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{user.firstName} {user.lastName}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Role</p>
              <div className="mt-1">
                <Badge
                  label={user.role}
                  variant={user.role === "admin" ? "admin" : user.role === "manager" ? "manager" : "agent"}
                />
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                <FiMail className="text-[11px]" />
                Email
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{user.email}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                <FiPhone className="text-[11px]" />
                Telephone
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{user.phone ?? "-"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Departement</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{getDepartmentLabel(user.department)}</p>
            </div>
          </div>
        </article>

        <aside className="space-y-3">
          <article className="rounded-2xl border border-emerald-100 bg-[linear-gradient(160deg,#ffffff,#ecfdf5)] p-4 shadow-sm">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
              <FiLock />
              Securite
            </p>
            <p className="mt-2 text-sm text-slate-700">
              Session geree par token JWT en cookie HTTP-only. Deconnectez-vous apres utilisation sur appareil partage.
            </p>
          </article>

          <article className="rounded-2xl border border-sky-100 bg-[linear-gradient(160deg,#ffffff,#eff6ff)] p-4 shadow-sm">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
              <FiBell />
              Notifications
            </p>
            <p className="mt-2 text-sm text-slate-700">
              Les badges informent des nouveautes et modifications sur vos espaces selon votre role.
            </p>
          </article>

          <article className="rounded-2xl border border-amber-100 bg-[linear-gradient(160deg,#ffffff,#fffbeb)] p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Membre depuis</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{new Date(user.createdAt).toLocaleDateString()}</p>
          </article>
        </aside>
      </section>
    </div>
  );
}
