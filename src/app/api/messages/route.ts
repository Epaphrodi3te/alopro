import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

const createMessageSchema = z.object({
  receiverId: z.string().cuid(),
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
      select: { id: true },
    });

    if (!receiver) {
      return apiError("Destinataire introuvable.", 404);
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

    return NextResponse.json({ message: "Message envoye.", data: message }, { status: 201 });
  } catch {
    return apiError("Erreur serveur.", 500);
  }
}
