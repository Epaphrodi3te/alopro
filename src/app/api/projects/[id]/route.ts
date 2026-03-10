import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";

import { apiError, parseDate } from "@/lib/api";
import { PROJECT_STATUS_OPTIONS } from "@/lib/constants";
import { requireApiUser } from "@/lib/auth";
import { canAssignProject, canDeleteProject, canEditProject } from "@/lib/permissions";
import { canUserViewProject } from "@/lib/project-visibility";
import prisma from "@/lib/prisma";

const updateProjectSchema = z.object({
  title: z.string().trim().min(2).optional(),
  description: z.string().trim().min(3).optional(),
  deadline: z.string().optional().or(z.literal("")),
  status: z.enum(PROJECT_STATUS_OPTIONS).optional(),
  assignedToId: z.string().cuid().optional().nullable().or(z.literal("")),
});

function canAssignProjectToRole(actorRole: Role, assigneeRole: Role) {
  if (actorRole === "admin") {
    return assigneeRole === "manager" || assigneeRole === "agent";
  }

  if (actorRole === "manager") {
    return assigneeRole === "agent";
  }

  return false;
}

type Params = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: NextRequest, { params }: Params) {
  const current = await requireApiUser(request);
  if (!current) {
    return apiError("Unauthorized", 401);
  }

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: {
          role: true,
        },
      },
    },
  });
  if (!project) {
    return apiError("Projet introuvable.", 404);
  }

  if (
    !canUserViewProject(
      { id: current.id, role: current.role },
      {
        createdById: project.createdById,
        assignedToId: project.assignedToId,
        createdByRole: project.createdBy.role,
      },
    )
  ) {
    return apiError("Projet non accessible.", 403);
  }

  if (!canEditProject(current, project)) {
    return apiError("Forbidden", 403);
  }

  try {
    const json = await request.json();
    const parsed = updateProjectSchema.safeParse(json);

    if (!parsed.success) {
      return apiError("Donnees de projet invalides.", 400);
    }

    const data: {
      title?: string;
      description?: string;
      deadline?: Date | null;
      status?: (typeof PROJECT_STATUS_OPTIONS)[number];
      assignedToId?: string | null;
    } = {};

    if (parsed.data.title) {
      data.title = parsed.data.title;
    }

    if (parsed.data.description) {
      data.description = parsed.data.description;
    }

    if (parsed.data.deadline !== undefined) {
      data.deadline = parseDate(parsed.data.deadline);
    }

    if (parsed.data.status) {
      data.status = parsed.data.status;
    }

    if (parsed.data.assignedToId !== undefined) {
      if (!canAssignProject(current.role)) {
        return apiError("Vous ne pouvez pas assigner un projet.", 403);
      }

      if (!parsed.data.assignedToId) {
        data.assignedToId = null;
      } else {
        const assignee = await prisma.user.findUnique({
          where: { id: parsed.data.assignedToId },
          select: { id: true, role: true },
        });

        if (!assignee) {
          return apiError("Utilisateur a assigner introuvable.", 404);
        }

        if (!canAssignProjectToRole(current.role, assignee.role)) {
          return apiError("Role d'assignation non autorise pour ce projet.", 400);
        }

        data.assignedToId = assignee.id;
      }
    }

    const updated = await prisma.project.update({
      where: { id },
      data,
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

    return NextResponse.json({ message: "Projet modifie.", project: updated });
  } catch {
    return apiError("Erreur serveur.", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const current = await requireApiUser(request);
  if (!current) {
    return apiError("Unauthorized", 401);
  }

  if (!canDeleteProject(current.role)) {
    return apiError("Seul l'admin peut supprimer un projet.", 403);
  }

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: {
          role: true,
        },
      },
    },
  });
  if (!project) {
    return apiError("Projet introuvable.", 404);
  }

  if (
    !canUserViewProject(
      { id: current.id, role: current.role },
      {
        createdById: project.createdById,
        assignedToId: project.assignedToId,
        createdByRole: project.createdBy.role,
      },
    )
  ) {
    return apiError("Projet non accessible.", 403);
  }

  await prisma.project.delete({ where: { id } });

  return NextResponse.json({ message: "Projet supprime." });
}
