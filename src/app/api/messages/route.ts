import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiError } from "@/lib/api";
import { isMailerConfigured, sendMessageNotificationEmail } from "@/lib/mailer";
import { requireApiUser } from "@/lib/auth";
import { canSendDirectEmail, canSendMessageToRole } from "@/lib/permissions";
import prisma from "@/lib/prisma";

const createMessageSchema = z.object({
  receiverIds: z.array(z.string().cuid()).min(1).max(100),
  content: z.string().trim().min(1).max(1200),
});

export async function GET(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return apiError("Unauthorized", 401);
  }

  const messages = await prisma.message.findMany({
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
  });

  return NextResponse.json({ messages });
}

export async function POST(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return apiError("Unauthorized", 401);
  }

  if (!canSendDirectEmail(user.role)) {
    return apiError("Seuls l'admin et le manager peuvent envoyer des emails.", 403);
  }

  try {
    const json = await request.json();
    const parsed = createMessageSchema.safeParse(json);

    if (!parsed.success) {
      return apiError("Donnees de message invalides.", 400);
    }

    const uniqueReceiverIds = [...new Set(parsed.data.receiverIds)];

    if (uniqueReceiverIds.includes(user.id)) {
      return apiError("Vous ne pouvez pas vous envoyer un message.", 400);
    }

    const receivers = await prisma.user.findMany({
      where: { id: { in: uniqueReceiverIds } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    if (receivers.length !== uniqueReceiverIds.length) {
      return apiError("Un ou plusieurs destinataires sont introuvables.", 404);
    }

    if (receivers.some((receiver) => !canSendMessageToRole(user.role, receiver.role))) {
      return apiError("Un agent peut envoyer des messages seulement aux administrateurs et managers.", 403);
    }

    if (!isMailerConfigured()) {
      return apiError("SMTP n'est pas configure. L'email ne peut pas etre envoye.", 503);
    }

    try {
      for (const receiver of receivers) {
        await sendMessageNotificationEmail({
          receiverEmail: receiver.email,
          receiverName: `${receiver.firstName} ${receiver.lastName}`,
          senderName: `${user.firstName} ${user.lastName}`,
          content: parsed.data.content,
        });
      }
    } catch {
      return apiError("L'envoi de l'email a echoue. Verifiez la configuration SMTP.", 502);
    }

    await prisma.message.createMany({
      data: receivers.map((receiver) => ({
        senderId: user.id,
        receiverId: receiver.id,
        content: parsed.data.content,
      })),
    });

    return NextResponse.json(
      {
        message: receivers.length === 1 ? "Message envoye." : "Messages envoyes.",
        sentCount: receivers.length,
        emailNotificationSent: true,
      },
      { status: 201 },
    );
  } catch {
    return apiError("Erreur serveur.", 500);
  }
}
