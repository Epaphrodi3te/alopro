import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";

import MessagesPanel from "@/components/messages/MessagesPanel";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export default async function NewMessagePage() {
  const user = await requireUser();

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
            Selectionnez un destinataire puis redigez votre message.
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
        currentUserId={user.id}
        view="create"
        redirectAfterCreate="/messages"
      />
    </div>
  );
}
