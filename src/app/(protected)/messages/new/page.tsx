import Link from "next/link";
import { FiArrowLeft, FiMail } from "react-icons/fi";
import { redirect } from "next/navigation";

import MessagesPanel from "@/components/messages/MessagesPanel";
import { requireUser } from "@/lib/auth";
import { canSendDirectEmail } from "@/lib/permissions";
import prisma from "@/lib/prisma";

export default async function NewMessagePage() {
  const user = await requireUser();

  if (!canSendDirectEmail(user.role)) {
    redirect("/dashboard");
  }

  const users = await prisma.user.findMany({
    where: {
      id: { not: user.id },
      role: user.role === "agent" ? { in: ["admin", "manager"] } : undefined,
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
      <section className="app-card overflow-hidden px-5 py-5 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-sky-700">
              <FiMail className="text-[12px]" />
              Nouveau message
            </p>
            <h1 className="page-title mt-3 text-slate-900">Envoyer un email interne</h1>
            <p className="page-subtitle">
              {user.role === "agent"
                ? "Selectionnez un ou plusieurs administrateurs ou managers, puis redigez un message clair et direct."
                : "Selectionnez un ou plusieurs destinataires, puis redigez un email professionnel trace dans l'historique."}
            </p>
          </div>
          <Link href="/messages" className="app-btn-soft">
            <FiArrowLeft className="text-sm" />
            Retour a la liste
          </Link>
        </div>
      </section>

      <MessagesPanel
        messages={[]}
        users={users}
        role={user.role}
        view="create"
        redirectAfterCreate="/messages"
        currentUserId={user.id}
        currentUserRole={user.role}
      />
    </div>
  );
}
