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
      <section>
        <h1 className="text-2xl font-bold text-slate-900">Gestion des utilisateurs</h1>
        <p className="mt-1 text-sm text-slate-600">
          Creation, edition et suppression des comptes (admin uniquement).
        </p>
      </section>

      <UsersPanel users={users} currentUserId={current.id} />
    </div>
  );
}
