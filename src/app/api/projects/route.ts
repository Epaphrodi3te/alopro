import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { apiError, parseDate } from "@/lib/api";
import { PROJECT_STATUS_OPTIONS } from "@/lib/constants";
import { requireApiUser } from "@/lib/auth";
import { canAssignProject, canCreateProject } from "@/lib/permissions";
import prisma from "@/lib/prisma";

const createProjectSchema = z.object({
  title: z.string().trim().min(2),
  description: z.string().trim().min(3),
  deadline: z.string().optional().or(z.literal("")),
  status: z.enum(PROJECT_STATUS_OPTIONS).optional(),
  assignedToId: z.string().cuid().optional().or(z.literal("")),
});

export async function GET(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return apiError("Unauthorized", 401);
  }

  let where: Prisma.ProjectWhereInput = {};

  if (user.role === "manager") {
    where = {
      OR: [{ createdById: user.id }, { assignedToId: user.id }],
    };
  }

  if (user.role === "agent") {
    where = {
      assignedToId: user.id,
    };
  }

  const projects = await prisma.project.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
      _count: {
        select: { tasks: true },
      },
    },
  });

  return NextResponse.json({ projects });
}

export async function POST(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return apiError("Unauthorized", 401);
  }

  if (!canCreateProject(user.role)) {
    return apiError("Forbidden", 403);
  }

  try {
    const json = await request.json();
    const parsed = createProjectSchema.safeParse(json);

    if (!parsed.success) {
      return apiError("Donnees de projet invalides.", 400);
    }

    let assignedToId: string | null = null;

    if (user.role === "agent") {
      // Agents cannot assign projects to others; their own creations are auto-assigned to them.
      assignedToId = user.id;
    }

    if (canAssignProject(user.role) && parsed.data.assignedToId) {
      const assignee = await prisma.user.findUnique({
        where: { id: parsed.data.assignedToId },
        select: { id: true },
      });

      if (!assignee) {
        return apiError("Utilisateur a assigner introuvable.", 404);
      }

      assignedToId = assignee.id;
    }

    const project = await prisma.project.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        deadline: parseDate(parsed.data.deadline),
        status: parsed.data.status ?? "pending",
        createdById: user.id,
        assignedToId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        _count: {
          select: { tasks: true },
        },
      },
    });

    return NextResponse.json({ message: "Projet cree.", project }, { status: 201 });
  } catch {
    return apiError("Erreur serveur.", 500);
  }
}
