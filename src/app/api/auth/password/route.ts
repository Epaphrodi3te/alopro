import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { hashPassword, requireApiUser, verifyPassword } from "@/lib/auth";
import { apiError } from "@/lib/api";
import prisma from "@/lib/prisma";

const schema = z
  .object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "La confirmation du nouveau mot de passe est invalide.",
    path: ["confirmPassword"],
  });

export async function PUT(request: NextRequest) {
  const current = await requireApiUser(request);
  if (!current) {
    return apiError("Unauthorized", 401);
  }

  try {
    const json = await request.json();
    const parsed = schema.safeParse(json);

    if (!parsed.success) {
      return apiError("Donnees invalides pour le changement de mot de passe.", 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: current.id },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      return apiError("Utilisateur introuvable.", 404);
    }

    const isValidCurrentPassword = await verifyPassword(parsed.data.currentPassword, user.password);
    if (!isValidCurrentPassword) {
      return apiError("Le mot de passe actuel est incorrect.", 400);
    }

    const isSamePassword = await verifyPassword(parsed.data.newPassword, user.password);
    if (isSamePassword) {
      return apiError("Le nouveau mot de passe doit etre different de l'ancien.", 400);
    }

    const password = await hashPassword(parsed.data.newPassword);

    await prisma.user.update({
      where: { id: current.id },
      data: { password },
    });

    return NextResponse.json({ message: "Mot de passe mis a jour." });
  } catch {
    return apiError("Erreur serveur.", 500);
  }
}
