import { NextRequest, NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";

import { apiError, parseDate } from "@/lib/api";
import { PROJECT_STATUS_OPTIONS } from "@/lib/constants";
import { requireApiUser } from "@/lib/auth";
import { canAssignProject, canCreateProject } from "@/lib/permissions";
import { getProjectVisibilityWhereForUser } from "@/lib/project-visibility";
import prisma from "@/lib/prisma";

const createProjectSchema = z.object({
  title: z.string().trim().min(2),
  description: z.string().trim().min(3),
  deadline: z.string().optional().or(z.literal("")),
  status: z.enum(PROJECT_STATUS_OPTIONS).optional(),
  assignedToId: z.string().cuid().optional().or(z.literal("")),
  reportRequired: z.boolean().optional(),
  commissionCfa: z.union([z.number().int().min(0), z.string().trim().regex(/^\d+$/), z.literal(""), z.null()]).optional(),
});

function parseCommissionCfa(value: unknown) {
  if (value === undefined) {
    return null;
  }

  if (value === null || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function canAssignProjectToRole(actorRole: Role, assigneeRole: Role) {
  if (actorRole === "admin") {
    return assigneeRole === "manager" || assigneeRole === "agent";
  }

  if (actorRole === "manager") {
    return assigneeRole === "agent";
  }

  return false;
}

export async function GET(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return apiError("Unauthorized", 401);
  }

  const where: Prisma.ProjectWhereInput = getProjectVisibilityWhereForUser({
    id: user.id,
    role: user.role,
  });

  const projects = await prisma.project.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      tasks: {
        select: {
          status: true,
        },
      },
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
    const reportRequired = user.role === "admin" ? Boolean(parsed.data.reportRequired) : false;

    if (user.role === "agent") {
      // Agents cannot assign projects to others; their own creations are auto-assigned to them.
      assignedToId = user.id;
    }

    if (canAssignProject(user.role) && parsed.data.assignedToId) {
      const assignee = await prisma.user.findUnique({
        where: { id: parsed.data.assignedToId },
        select: { id: true, role: true },
      });

      if (!assignee) {
        return apiError("Utilisateur a assigner introuvable.", 404);
      }

      if (!canAssignProjectToRole(user.role, assignee.role)) {
        return apiError("Role d'assignation non autorise pour ce projet.", 400);
      }

      assignedToId = assignee.id;
    }

    const project = await prisma.project.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        commissionCfa: parseCommissionCfa(parsed.data.commissionCfa),
        deadline: parseDate(parsed.data.deadline),
        status: parsed.data.status ?? "pending",
        createdById: user.id,
        assignedToId,
        reportRequired,
        progressPercent: 0,
      },
      include: {
        tasks: {
          select: {
            status: true,
          },
        },
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
