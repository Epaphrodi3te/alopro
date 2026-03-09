import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import { redirect } from "next/navigation";

import UsersPanel from "@/components/users/UsersPanel";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export default async function UsersPage() {
  const current = await requireUser();

  if (current.role !== "admin") {
    redirect("/dashboard");
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title text-slate-900">Gestion des utilisateurs</h1>
          <p className="page-subtitle">
            Liste complete des comptes. Utilisez le bouton Nouveau pour ouvrir le formulaire de creation.
          </p>
        </div>
        <Link href="/users/new" className="app-btn-primary">
          <FiPlus className="text-sm" />
          Nouveau
        </Link>
      </section>

      <UsersPanel users={users} currentUserId={current.id} view="list" />
    </div>
  );
}
