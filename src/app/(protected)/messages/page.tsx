import MessagesPanel from "@/components/messages/MessagesPanel";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export default async function MessagesPage() {
  const user = await requireUser();

  const [messages, users] = await Promise.all([
    prisma.message.findMany({
      where: {
        OR: [{ senderId: user.id }, { receiverId: user.id }],
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
      <section>
        <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
        <p className="mt-1 text-sm text-slate-600">
          Messagerie interne simple pour la collaboration entre equipes.
        </p>
      </section>

      <MessagesPanel messages={messages} users={users} currentUserId={user.id} />
    </div>
  );
}
