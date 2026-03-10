import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";

import { apiError } from "@/lib/api";
import { isMailerConfigured, sendMessageNotificationEmail } from "@/lib/mailer";
import { requireApiUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

const createMessageSchema = z.object({
  receiverId: z.string().cuid(),
  content: z.string().trim().min(1).max(1200),
});

function canSendDirectEmail(role: Role) {
  return role === "admin" || role === "manager";
}

export async function GET(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return apiError("Unauthorized", 401);
  }

  if (!canSendDirectEmail(user.role)) {
    return apiError("Forbidden", 403);
  }

  const messages = await prisma.message.findMany({
    where:
      user.role === "admin"
        ? undefined
        : {
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

    if (parsed.data.receiverId === user.id) {
      return apiError("Vous ne pouvez pas vous envoyer un message.", 400);
    }

    const receiver = await prisma.user.findUnique({
      where: { id: parsed.data.receiverId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!receiver) {
      return apiError("Destinataire introuvable.", 404);
    }

    if (!isMailerConfigured()) {
      return apiError("SMTP n'est pas configure. L'email ne peut pas etre envoye.", 503);
    }

    try {
      await sendMessageNotificationEmail({
        receiverEmail: receiver.email,
        receiverName: `${receiver.firstName} ${receiver.lastName}`,
        senderName: `${user.firstName} ${user.lastName}`,
        content: parsed.data.content,
      });
    } catch {
      return apiError("L'envoi de l'email a echoue. Verifiez la configuration SMTP.", 502);
    }

    const message = await prisma.message.create({
      data: {
        senderId: user.id,
        receiverId: receiver.id,
        content: parsed.data.content,
      },
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

    return NextResponse.json(
      {
        message: "Message envoye.",
        data: message,
        emailNotificationSent: true,
      },
      { status: 201 },
    );
  } catch {
    return apiError("Erreur serveur.", 500);
  }
}
