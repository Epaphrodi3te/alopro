import Link from "next/link";
import { FiPlus } from "react-icons/fi";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

import MessagesPanel from "@/components/messages/MessagesPanel";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

function canSendDirectEmail(role: Role) {
  return role === "admin" || role === "manager";
}

export default async function MessagesPage() {
  const user = await requireUser();

  if (!canSendDirectEmail(user.role)) {
    redirect("/dashboard");
  }

  const [messages, users] = await Promise.all([
    prisma.message.findMany({
      where: {
        senderId: user.id,
      },
      orderBy: { createdAt: "desc" },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    }),
    prisma.user.findMany({
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
    }),
  ]);

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title text-slate-900">Messages</h1>
          <p className="page-subtitle">
            Historique des emails envoyes. Cliquez sur Nouveau pour rediger un email direct.
          </p>
        </div>
        <Link href="/messages/new" className="app-btn-primary">
          <FiPlus className="text-sm" />
          Nouveau
        </Link>
      </section>

      <MessagesPanel messages={messages} users={users} view="list" />
    </div>
  );
}
