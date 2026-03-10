import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { hashPassword, requireApiUser } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { DEPARTMENT_OPTIONS, ROLE_OPTIONS } from "@/lib/constants";
import { canManageUsers } from "@/lib/permissions";
import prisma from "@/lib/prisma";

const updateUserSchema = z.object({
  firstName: z.string().trim().min(2).optional(),
  lastName: z.string().trim().min(2).optional(),
  email: z.email().optional(),
  phone: z.string().trim().min(6).optional().or(z.literal("")),
  password: z.string().min(8).optional(),
  role: z.enum(ROLE_OPTIONS).optional(),
  department: z.enum(DEPARTMENT_OPTIONS).optional(),
});

type Params = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: NextRequest, { params }: Params) {
  const current = await requireApiUser(request);
  if (!current) {
    return apiError("Unauthorized", 401);
  }

  if (!canManageUsers(current.role)) {
    return apiError("Forbidden", 403);
  }

  const { id } = await params;

  try {
    const json = await request.json();
    const parsed = updateUserSchema.safeParse(json);

    if (!parsed.success) {
      return apiError("Donnees utilisateur invalides.", 400);
    }

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return apiError("Utilisateur introuvable.", 404);
    }

    const data: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string | null;
      role?: (typeof ROLE_OPTIONS)[number];
      department?: (typeof DEPARTMENT_OPTIONS)[number];
      password?: string;
    } = {};

    if (parsed.data.firstName) {
      data.firstName = parsed.data.firstName;
    }

    if (parsed.data.lastName) {
      data.lastName = parsed.data.lastName;
    }

    if (parsed.data.email) {
      const nextEmail = parsed.data.email.toLowerCase().trim();
      const existing = await prisma.user.findUnique({ where: { email: nextEmail }, select: { id: true } });

      if (existing && existing.id !== id) {
        return apiError("Cet email existe deja.", 409);
      }

      data.email = nextEmail;
    }

    if (parsed.data.phone !== undefined) {
      data.phone = parsed.data.phone || null;
    }

    if (parsed.data.role) {
      data.role = parsed.data.role;
    }

    if (parsed.data.department) {
      data.department = parsed.data.department;
    }

    if (parsed.data.password) {
      data.password = await hashPassword(parsed.data.password);
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        department: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ message: "Utilisateur modifie.", user: updated });
  } catch {
    return apiError("Erreur serveur.", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const current = await requireApiUser(request);
  if (!current) {
    return apiError("Unauthorized", 401);
  }

  if (!canManageUsers(current.role)) {
    return apiError("Forbidden", 403);
  }

  const { id } = await params;

  if (id === current.id) {
    return apiError("Vous ne pouvez pas supprimer votre propre compte.", 400);
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return apiError("Utilisateur introuvable.", 404);
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ message: "Utilisateur supprime." });
}
