import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

import MessagesPanel from "@/components/messages/MessagesPanel";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

function canSendDirectEmail(role: Role) {
  return role === "admin" || role === "manager";
}

export default async function NewMessagePage() {
  const user = await requireUser();

  if (!canSendDirectEmail(user.role)) {
    redirect("/dashboard");
  }

  const users = await prisma.user.findMany({
    where: {
      id: { not: user.id },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  });

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title text-slate-900">Nouveau message</h1>
          <p className="page-subtitle">
            Selectionnez un destinataire puis redigez un email professionnel.
          </p>
        </div>
        <Link href="/messages" className="app-btn-soft">
          <FiArrowLeft className="text-sm" />
          Retour a la liste
        </Link>
      </section>

      <MessagesPanel
        messages={[]}
        users={users}
        view="create"
        redirectAfterCreate="/messages"
      />
    </div>
  );
}
