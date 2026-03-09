import Badge from "@/components/ui/Badge";
import { requireUser } from "@/lib/auth";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-2xl font-bold text-slate-900">Parametres</h1>
        <p className="mt-1 text-sm text-slate-600">Informations de votre compte et bonnes pratiques de securite.</p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Profil</h2>

        <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <p><span className="font-semibold">Nom:</span> {user.firstName} {user.lastName}</p>
          <p><span className="font-semibold">Email:</span> {user.email}</p>
          <p><span className="font-semibold">Telephone:</span> {user.phone ?? "-"}</p>
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

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
        Les sessions sont gerees par token JWT stocke en cookie HTTP Only. Gardez vos identifiants confidentiels.
      </section>
    </div>
  );
}
