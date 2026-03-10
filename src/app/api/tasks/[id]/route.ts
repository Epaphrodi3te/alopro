import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";

import { apiError, parseDate } from "@/lib/api";
import { TASK_PRIORITY_OPTIONS, TASK_STATUS_OPTIONS } from "@/lib/constants";
import { requireApiUser } from "@/lib/auth";
import { canAssignTask, canDeleteTask, canEditTask } from "@/lib/permissions";
import { syncProjectProgressFromTasks } from "@/lib/project-progress";
import { canUserViewTask } from "@/lib/task-visibility";
import prisma from "@/lib/prisma";

const updateTaskSchema = z.object({
  title: z.string().trim().min(2).optional(),
  description: z.string().trim().min(3).optional(),
  priority: z.enum(TASK_PRIORITY_OPTIONS).optional(),
  status: z.enum(TASK_STATUS_OPTIONS).optional(),
  deadline: z.string().optional().or(z.literal("")),
  assignedToId: z.string().cuid().optional().nullable().or(z.literal("")),
  commissionCfa: z.union([z.number().int().min(0), z.string().trim().regex(/^\d+$/), z.literal(""), z.null()]).optional(),
  received: z.boolean().optional(),
  deadlineValidated: z.boolean().optional(),
  progressPercent: z.coerce.number().int().min(0).max(100).optional(),
  reportRequired: z.boolean().optional(),
  completionReport: z.string().trim().max(4000).optional().or(z.literal("")),
  markCompleted: z.boolean().optional(),
  requestDeadlineDate: z.string().optional().or(z.literal("")),
  requestDeadlineReason: z.string().trim().min(3).max(1000).optional().or(z.literal("")),
  reviewDeadlineChange: z.enum(["approved", "rejected"]).optional(),
});

function parseCommissionCfa(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return undefined;
  }

  return parsed;
}

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
          memberships: {
            select: {
              userId: true,
            },
          },
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
              assignedMemberIds: task.project.memberships.map((member) => member.userId),
              createdByRole: task.project.createdBy.role,
            }
          : null,
      },
    )
  ) {
    return apiError("Tache non accessible.", 403);
  }

  const managedByCurrentManager =
<<<<<<< HEAD
    task.project !== null &&
    (task.project.createdById === current.id || task.project.assignedToId === current.id);
=======
    !!task.project &&
    (task.project.createdById === current.id ||
      task.project.assignedToId === current.id ||
      task.project.memberships.some((member) => member.userId === current.id));
>>>>>>> 898a663db502c53f02b1fcac6ba23d89d75dadb5

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
      commissionCfa?: number | null;
      receivedAt?: Date | null;
      deadlineValidatedAt?: Date | null;
      progressPercent?: number;
      reportRequired?: boolean;
      completionReport?: string | null;
      completedAt?: Date | null;
      deadlineChangeStatus?: "none" | "pending" | "approved" | "rejected";
      deadlineChangeRequestedDate?: Date | null;
      deadlineChangeReason?: string | null;
      deadlineChangeReviewedAt?: Date | null;
      deadlineChangeReviewedBy?: string | null;
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

    if (parsed.data.reportRequired !== undefined) {
      if (current.role !== "admin") {
        return apiError("Seul l'admin peut imposer un compte rendu.", 403);
      }

      data.reportRequired = parsed.data.reportRequired;
    }

    if (parsed.data.commissionCfa !== undefined) {
      const normalizedCommission = parseCommissionCfa(parsed.data.commissionCfa);
      if (normalizedCommission === undefined) {
        return apiError("Commission invalide.", 400);
      }

      data.commissionCfa = normalizedCommission;
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
        data.completionReport = null;
        data.completedAt = null;
        data.deadlineChangeStatus = "none";
        data.deadlineChangeRequestedDate = null;
        data.deadlineChangeReason = null;
        data.deadlineChangeReviewedAt = null;
        data.deadlineChangeReviewedBy = null;
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

    const wantsDeadlineRequest =
      parsed.data.requestDeadlineDate !== undefined || parsed.data.requestDeadlineReason !== undefined;
    const wantsDeadlineReview = parsed.data.reviewDeadlineChange !== undefined;
    const wantsCompletionUpdate = parsed.data.markCompleted !== undefined || parsed.data.completionReport !== undefined;

    if (wantsDeadlineRequest) {
      if (!task.assignedToId || task.assignedToId !== current.id) {
        return apiError("Seul l'utilisateur assigne peut demander une nouvelle date.", 403);
      }

      const requestedDate = parseDate(parsed.data.requestDeadlineDate);
      const requestReason = parsed.data.requestDeadlineReason?.trim() ?? "";

      if (!requestedDate || !requestReason) {
        return apiError("Nouvelle date et raison sont obligatoires pour la demande.", 400);
      }

      data.deadlineChangeRequestedDate = requestedDate;
      data.deadlineChangeReason = requestReason;
      data.deadlineChangeStatus = "pending";
      data.deadlineChangeReviewedAt = null;
      data.deadlineChangeReviewedBy = null;
    }

    if (wantsDeadlineReview) {
      if (current.role !== "admin" && task.createdById !== current.id) {
        return apiError("Seul l'admin ou le createur peut approuver/refuser la nouvelle date.", 403);
      }

      if (task.deadlineChangeStatus !== "pending" || !task.deadlineChangeRequestedDate) {
        return apiError("Aucune demande de nouvelle date en attente.", 400);
      }

      if (parsed.data.reviewDeadlineChange === "approved") {
        data.deadline = task.deadlineChangeRequestedDate;
      }

      data.deadlineChangeStatus = parsed.data.reviewDeadlineChange;
      data.deadlineChangeReviewedAt = new Date();
      data.deadlineChangeReviewedBy = current.id;
    }

    if (wantsCompletionUpdate) {
      if (current.role !== "admin" && task.assignedToId !== current.id) {
        return apiError("Seul l'utilisateur assigne peut finaliser avec compte rendu.", 403);
      }

      const effectiveProgress = data.progressPercent ?? task.progressPercent;
      const completionReport = parsed.data.completionReport?.trim() ?? "";

      if (parsed.data.markCompleted) {
        if (effectiveProgress < 100) {
          return apiError("La progression doit etre a 100% pour marquer la tache comme terminee.", 400);
        }

        if ((data.reportRequired ?? task.reportRequired) && !completionReport && !task.completionReport) {
          return apiError("Un compte rendu est obligatoire pour cette tache.", 400);
        }

        if (completionReport) {
          data.completionReport = completionReport;
        } else if (!task.completionReport && (data.reportRequired ?? task.reportRequired)) {
          data.completionReport = null;
        }

        data.progressPercent = 100;
        data.status = "done";
        data.completedAt = task.completedAt ?? new Date();
      } else if (parsed.data.completionReport !== undefined) {
        if (!task.completedAt && data.completedAt === undefined) {
          return apiError("Marquez d'abord la tache comme terminee avant d'ajouter le compte rendu.", 400);
        }

        data.completionReport = completionReport || null;
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

    if (updated.project?.id) {
      await syncProjectProgressFromTasks(prisma, updated.project.id);
    }

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
          id: true,
          createdById: true,
          assignedToId: true,
          memberships: {
            select: {
              userId: true,
            },
          },
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
              assignedMemberIds: task.project.memberships.map((member) => member.userId),
              createdByRole: task.project.createdBy.role,
            }
          : null,
      },
    )
  ) {
    return apiError("Tache non accessible.", 403);
  }

  await prisma.task.delete({ where: { id } });

  if (task.project?.id) {
    await syncProjectProgressFromTasks(prisma, task.project.id);
  }

  return NextResponse.json({ message: "Tache supprimee." });
}
