import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import { redirect } from "next/navigation";

import UsersPanel from "@/components/users/UsersPanel";
import { requireUser } from "@/lib/auth";

export default async function NewUserPage() {
  const current = await requireUser();

  if (current.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title text-slate-900">Nouveau compte utilisateur</h1>
          <p className="page-subtitle">
            Renseignez les informations du nouveau compte, puis validez la creation.
          </p>
        </div>
        <Link href="/users" className="app-btn-soft">
          <FiArrowLeft className="text-sm" />
          Retour a la liste
        </Link>
      </section>

      <UsersPanel
        users={[]}
        currentUserId={current.id}
        view="create"
        redirectAfterCreate="/users"
      />
    </div>
  );
}
