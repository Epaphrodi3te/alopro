import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { hashPassword, requireApiUser } from "@/lib/auth";
import { apiError } from "@/lib/api";
import { DEPARTMENT_OPTIONS, ROLE_OPTIONS } from "@/lib/constants";
import { canManageUsers } from "@/lib/permissions";
import prisma from "@/lib/prisma";

const createUserSchema = z.object({
  firstName: z.string().trim().min(2),
  lastName: z.string().trim().min(2),
  email: z.email(),
  phone: z.string().trim().min(6).optional().or(z.literal("")),
  password: z.string().min(8),
  role: z.enum(ROLE_OPTIONS),
  department: z.enum(DEPARTMENT_OPTIONS),
});

export async function GET(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return apiError("Unauthorized", 401);
  }

  if (!canManageUsers(user.role)) {
    return apiError("Forbidden", 403);
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
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

  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return apiError("Unauthorized", 401);
  }

  if (!canManageUsers(user.role)) {
    return apiError("Forbidden", 403);
  }

  try {
    const json = await request.json();
    const parsed = createUserSchema.safeParse(json);

    if (!parsed.success) {
      return apiError("Donnees utilisateur invalides.", 400);
    }

    const email = parsed.data.email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return apiError("Cet email existe deja.", 409);
    }

    const password = await hashPassword(parsed.data.password);

    const created = await prisma.user.create({
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email,
        phone: parsed.data.phone || null,
        role: parsed.data.role,
        department: parsed.data.department,
        password,
      },
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

    return NextResponse.json({ message: "Utilisateur cree.", user: created }, { status: 201 });
  } catch {
    return apiError("Erreur serveur.", 500);
  }
}
