import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";

import { apiError, parseDate } from "@/lib/api";
import { TASK_PRIORITY_OPTIONS, TASK_STATUS_OPTIONS } from "@/lib/constants";
import { requireApiUser } from "@/lib/auth";
import { canAssignTask, canDeleteTask, canEditTask } from "@/lib/permissions";
import { canUserViewTask } from "@/lib/task-visibility";
import prisma from "@/lib/prisma";

const updateTaskSchema = z.object({
  title: z.string().trim().min(2).optional(),
  description: z.string().trim().min(3).optional(),
  priority: z.enum(TASK_PRIORITY_OPTIONS).optional(),
  status: z.enum(TASK_STATUS_OPTIONS).optional(),
  deadline: z.string().optional().or(z.literal("")),
  assignedToId: z.string().cuid().optional().nullable().or(z.literal("")),
  received: z.boolean().optional(),
  deadlineValidated: z.boolean().optional(),
  progressPercent: z.coerce.number().int().min(0).max(100).optional(),
});

function canAssignTaskToRole(actorRole: Role, assigneeRole: Role) {
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

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      project: {
        select: {
          id: true,
          createdById: true,
          assignedToId: true,
          createdBy: {
            select: {
              role: true,
            },
          },
        },
      },
    },
  });

  if (!task) {
    return apiError("Tache introuvable.", 404);
  }

  if (
    !canUserViewTask(
      { id: current.id, role: current.role },
      {
        createdById: task.createdById,
        assignedToId: task.assignedToId,
        project: task.project
          ? {
              createdById: task.project.createdById,
              assignedToId: task.project.assignedToId,
              createdByRole: task.project.createdBy.role,
            }
          : null,
      },
    )
  ) {
    return apiError("Tache non accessible.", 403);
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
      receivedAt?: Date | null;
      deadlineValidatedAt?: Date | null;
      progressPercent?: number;
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

        if (!canAssignTaskToRole(current.role, assignee.role)) {
          return apiError("Role d'assignation non autorise pour cette tache.", 400);
        }

        data.assignedToId = assignee.id;
      }

      if (data.assignedToId !== task.assignedToId) {
        data.receivedAt = null;
        data.deadlineValidatedAt = null;
        data.progressPercent = 0;
      }
    }

    const wantsWorkflowUpdate =
      parsed.data.received !== undefined ||
      parsed.data.deadlineValidated !== undefined ||
      parsed.data.progressPercent !== undefined;

    if (wantsWorkflowUpdate && current.role !== "admin" && task.assignedToId !== current.id) {
      return apiError("Seul l'utilisateur assigne peut confirmer la reception et la progression.", 403);
    }

    if (wantsWorkflowUpdate) {
      const now = new Date();
      const effectiveReceivedAt =
        parsed.data.received === undefined ? task.receivedAt : parsed.data.received ? task.receivedAt ?? now : null;
      const effectiveDeadlineValidatedAt =
        parsed.data.deadlineValidated === undefined
          ? task.deadlineValidatedAt
          : parsed.data.deadlineValidated
            ? task.deadlineValidatedAt ?? now
            : null;

      if (parsed.data.received !== undefined) {
        data.receivedAt = effectiveReceivedAt;
      }

      if (parsed.data.deadlineValidated !== undefined) {
        if (parsed.data.deadlineValidated && !effectiveReceivedAt) {
          return apiError("La tache doit etre marquee comme recue avant de valider la date de fin.", 400);
        }

        data.deadlineValidatedAt = effectiveDeadlineValidatedAt;

        if (!parsed.data.deadlineValidated && parsed.data.progressPercent === undefined) {
          data.progressPercent = 0;
        }
      }

      if (parsed.data.received === false) {
        data.deadlineValidatedAt = null;
        data.progressPercent = 0;
      }

      if (parsed.data.progressPercent !== undefined) {
        if (parsed.data.progressPercent > 0 && !effectiveDeadlineValidatedAt) {
          return apiError("Validez d'abord la date de fin avant de declarer une progression.", 400);
        }

        data.progressPercent = parsed.data.progressPercent;
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

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      project: {
        select: {
          createdById: true,
          assignedToId: true,
          createdBy: {
            select: {
              role: true,
            },
          },
        },
      },
    },
  });
  if (!task) {
    return apiError("Tache introuvable.", 404);
  }

  if (
    !canUserViewTask(
      { id: current.id, role: current.role },
      {
        createdById: task.createdById,
        assignedToId: task.assignedToId,
        project: task.project
          ? {
              createdById: task.project.createdById,
              assignedToId: task.project.assignedToId,
              createdByRole: task.project.createdBy.role,
            }
          : null,
      },
    )
  ) {
    return apiError("Tache non accessible.", 403);
  }

  await prisma.task.delete({ where: { id } });

  return NextResponse.json({ message: "Tache supprimee." });
}
