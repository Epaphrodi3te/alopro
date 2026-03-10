import { FiBell, FiLock, FiMail, FiPhone, FiShield, FiUser } from "react-icons/fi";

import Badge from "@/components/ui/Badge";
import PasswordSettingsForm from "@/components/settings/PasswordSettingsForm";
import { requireUser } from "@/lib/auth";
import { getDepartmentLabel } from "@/lib/constants";
import { getRoleLabel } from "@/lib/navigation";

export default async function SettingsPage() {
  const user = await requireUser();
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  return (
    <div className="space-y-5">
      <section className="workspace-page-header">
        <div>
          <h1 className="page-title text-slate-900">Parametres</h1>
          <p className="page-subtitle">Informations de votre compte et bonnes pratiques de securite.</p>
        </div>
      </section>

      <section className="app-card p-5">
        <h2 className="text-lg font-bold text-slate-900">Profil</h2>

        <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <p><span className="font-semibold">Nom:</span> {user.firstName} {user.lastName}</p>
          <p><span className="font-semibold">Email:</span> {user.email}</p>
          <p><span className="font-semibold">Telephone:</span> {user.phone ?? "-"}</p>
          <p><span className="font-semibold">Departement:</span> {getDepartmentLabel(user.department)}</p>
          <p>
            <span className="font-semibold">Role:</span>{" "}
            <Badge
              label={user.role}
              variant={user.role === "admin" ? "admin" : user.role === "manager" ? "manager" : "agent"}
            />
          </p>
          <p><span className="font-semibold">Cree le:</span> {new Date(user.createdAt).toLocaleDateString()}</p>
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

      <PasswordSettingsForm />
    </div>
  );
}
