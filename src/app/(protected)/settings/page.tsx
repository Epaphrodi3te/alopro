import Badge from "@/components/ui/Badge";
import { requireUser } from "@/lib/auth";
import { getDepartmentLabel } from "@/lib/constants";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="space-y-5">
      <section>
        <h1 className="page-title text-slate-900">Parametres</h1>
        <p className="page-subtitle">Informations de votre compte et bonnes pratiques de securite.</p>
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

      <section className="rounded-2xl border border-amber-200 bg-amber-50/90 p-5 text-sm text-amber-800">
        Les sessions sont gerees par token JWT stocke en cookie HTTP Only. Gardez vos identifiants confidentiels.
      </section>
    </div>
  );
}
