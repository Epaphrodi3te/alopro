import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { apiError, parseDate } from "@/lib/api";
import { TASK_PRIORITY_OPTIONS, TASK_STATUS_OPTIONS } from "@/lib/constants";
import { requireApiUser } from "@/lib/auth";
import { canAssignTask, canDeleteTask, canEditTask } from "@/lib/permissions";
import prisma from "@/lib/prisma";

const updateTaskSchema = z.object({
  title: z.string().trim().min(2).optional(),
  description: z.string().trim().min(3).optional(),
  priority: z.enum(TASK_PRIORITY_OPTIONS).optional(),
  status: z.enum(TASK_STATUS_OPTIONS).optional(),
  deadline: z.string().optional().or(z.literal("")),
  assignedToId: z.string().cuid().optional().nullable().or(z.literal("")),
});

type Params = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: NextRequest, { params }: Params) {
  const current = await requireApiUser(request);
  if (!current) {
    return apiError("Unauthorized", 401);
  }

  const { id } = await params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      project: {
        select: {
          id: true,
          createdById: true,
          assignedToId: true,
        },
      },
    },
  });

  if (!task) {
    return apiError("Tache introuvable.", 404);
  }

  const managedByCurrentManager =
    !!task.project && (task.project.createdById === current.id || task.project.assignedToId === current.id);

  if (!canEditTask(current, task, managedByCurrentManager)) {
    return apiError("Forbidden", 403);
  }

  try {
    const json = await request.json();
    const parsed = updateTaskSchema.safeParse(json);

    if (!parsed.success) {
      return apiError("Donnees de tache invalides.", 400);
    }

    const data: {
      title?: string;
      description?: string;
      priority?: (typeof TASK_PRIORITY_OPTIONS)[number];
      status?: (typeof TASK_STATUS_OPTIONS)[number];
      deadline?: Date | null;
      assignedToId?: string | null;
    } = {};

    if (parsed.data.title) {
      data.title = parsed.data.title;
    }

    if (parsed.data.description) {
      data.description = parsed.data.description;
    }

    if (parsed.data.priority) {
      data.priority = parsed.data.priority;
    }

    if (parsed.data.status) {
      data.status = parsed.data.status;
    }

    if (parsed.data.deadline !== undefined) {
      data.deadline = parseDate(parsed.data.deadline);
    }

    if (parsed.data.assignedToId !== undefined) {
      if (!canAssignTask(current.role)) {
        return apiError("Vous ne pouvez pas assigner une tache.", 403);
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

        if (assignee.role !== "agent") {
          return apiError("Une tache doit etre assignee a un agent.", 400);
        }

        data.assignedToId = assignee.id;
      }
    }

    const updated = await prisma.task.update({
      where: { id },
      data,
      include: {
        project: {
          select: {
            id: true,
            title: true,
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
      },
    });

    return NextResponse.json({ message: "Tache modifiee.", task: updated });
  } catch {
    return apiError("Erreur serveur.", 500);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const current = await requireApiUser(request);
  if (!current) {
    return apiError("Unauthorized", 401);
  }

  if (!canDeleteTask(current.role)) {
    return apiError("Seul l'admin peut supprimer une tache.", 403);
  }

  const { id } = await params;

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    return apiError("Tache introuvable.", 404);
  }

  await prisma.task.delete({ where: { id } });

  return NextResponse.json({ message: "Tache supprimee." });
}
