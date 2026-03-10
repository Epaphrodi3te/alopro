import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";

import { apiError, parseDate } from "@/lib/api";
import { PROJECT_STATUS_OPTIONS } from "@/lib/constants";
import { requireApiUser } from "@/lib/auth";
import { canAssignProject, canDeleteProject, canEditProject } from "@/lib/permissions";
import { computeProjectProgressFromTasks, syncProjectProgressFromTasks } from "@/lib/project-progress";
import { canUserViewProject } from "@/lib/project-visibility";
import prisma from "@/lib/prisma";

const updateProjectSchema = z.object({
  title: z.string().trim().min(2).optional(),
  description: z.string().trim().min(3).optional(),
  deadline: z.string().optional().or(z.literal("")),
  status: z.enum(PROJECT_STATUS_OPTIONS).optional(),
  assignedToId: z.string().cuid().optional().nullable().or(z.literal("")),
  reportRequired: z.boolean().optional(),
  commissionCfa: z.union([z.number().int().min(0), z.string().trim().regex(/^\d+$/), z.literal(""), z.null()]).optional(),
  received: z.boolean().optional(),
  deadlineValidated: z.boolean().optional(),
  progressPercent: z.coerce.number().int().min(0).max(100).optional(),
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
      tasks: {
        select: {
          progressPercent: true,
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

  try {
    const json = await request.json();
    const parsed = updateProjectSchema.safeParse(json);

    if (!parsed.success) {
      return apiError("Donnees de projet invalides.", 400);
    }

    const hasTasks = project.tasks.length > 0;

    const data: {
      title?: string;
      description?: string;
      deadline?: Date | null;
      status?: (typeof PROJECT_STATUS_OPTIONS)[number];
      assignedToId?: string | null;
      reportRequired?: boolean;
      commissionCfa?: number | null;
      receivedAt?: Date | null;
      deadlineValidatedAt?: Date | null;
      progressPercent?: number;
      completionReport?: string | null;
      completedAt?: Date | null;
      deadlineChangeStatus?: "none" | "pending" | "approved" | "rejected";
      deadlineChangeRequestedDate?: Date | null;
      deadlineChangeReason?: string | null;
      deadlineChangeReviewedAt?: Date | null;
      deadlineChangeReviewedBy?: string | null;
    } = {};

    const wantsGeneralEdit =
      parsed.data.title !== undefined ||
      parsed.data.description !== undefined ||
      parsed.data.commissionCfa !== undefined ||
      parsed.data.deadline !== undefined ||
      parsed.data.status !== undefined ||
      parsed.data.assignedToId !== undefined;
    const wantsWorkflowUpdate =
      parsed.data.received !== undefined ||
      parsed.data.deadlineValidated !== undefined ||
      parsed.data.progressPercent !== undefined;
    const wantsProgressUpdate = parsed.data.progressPercent !== undefined;
    const wantsCompletionUpdate = parsed.data.markCompleted !== undefined || parsed.data.completionReport !== undefined;
    const wantsDeadlineRequest =
      parsed.data.requestDeadlineDate !== undefined || parsed.data.requestDeadlineReason !== undefined;
    const wantsDeadlineReview = parsed.data.reviewDeadlineChange !== undefined;

    if (wantsGeneralEdit && !canEditProject(current, project)) {
      return apiError("Forbidden", 403);
    }

    if (hasTasks && parsed.data.status !== undefined) {
      return apiError("Le statut du projet est derive automatiquement de la progression des taches.", 400);
    }

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

      if (data.assignedToId !== project.assignedToId) {
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

    if (wantsWorkflowUpdate && current.role !== "admin" && project.assignedToId !== current.id) {
      return apiError("Seul l'utilisateur assigne peut confirmer la reception et la progression du projet.", 403);
    }

    if (wantsWorkflowUpdate) {
      const now = new Date();
      const effectiveReceivedAt =
        parsed.data.received === undefined ? project.receivedAt : parsed.data.received ? project.receivedAt ?? now : null;
      const effectiveDeadlineValidatedAt =
        parsed.data.deadlineValidated === undefined
          ? project.deadlineValidatedAt
          : parsed.data.deadlineValidated
            ? project.deadlineValidatedAt ?? now
            : null;

      if (parsed.data.received !== undefined) {
        data.receivedAt = effectiveReceivedAt;
      }

      if (parsed.data.deadlineValidated !== undefined) {
        if (parsed.data.deadlineValidated && !effectiveReceivedAt) {
          return apiError("Le projet doit etre marque comme recu avant de valider la date de fin.", 400);
        }

        data.deadlineValidatedAt = effectiveDeadlineValidatedAt;

        if (!parsed.data.deadlineValidated && parsed.data.progressPercent === undefined && !hasTasks) {
          data.progressPercent = 0;
        }
      }

      if (parsed.data.received === false) {
        data.deadlineValidatedAt = null;
        if (!hasTasks) {
          data.progressPercent = 0;
        }
      }

      if (parsed.data.progressPercent !== undefined) {
        if (hasTasks) {
          return apiError("La progression du projet est calculee automatiquement a partir des taches.", 400);
        }

        if (parsed.data.progressPercent > 0 && !effectiveDeadlineValidatedAt) {
          return apiError("Validez d'abord la date de fin avant de declarer une progression.", 400);
        }

        data.progressPercent = parsed.data.progressPercent;
      }
    }

    if (wantsProgressUpdate) {
      if (hasTasks) {
        return apiError("La progression du projet est calculee automatiquement depuis les taches.", 400);
      }

      if (!wantsWorkflowUpdate && current.role !== "admin" && project.assignedToId !== current.id) {
        return apiError("Seul l'utilisateur assigne peut mettre a jour la progression du projet.", 403);
      }

      data.progressPercent = parsed.data.progressPercent;
    }

    if (wantsDeadlineRequest) {
      if (!project.assignedToId || project.assignedToId !== current.id) {
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
      if (current.role !== "admin" && project.createdById !== current.id) {
        return apiError("Seul l'admin ou le createur peut approuver/refuser la nouvelle date.", 403);
      }

      if (project.deadlineChangeStatus !== "pending" || !project.deadlineChangeRequestedDate) {
        return apiError("Aucune demande de nouvelle date en attente.", 400);
      }

      if (parsed.data.reviewDeadlineChange === "approved") {
        data.deadline = project.deadlineChangeRequestedDate;
      }

      data.deadlineChangeStatus = parsed.data.reviewDeadlineChange;
      data.deadlineChangeReviewedAt = new Date();
      data.deadlineChangeReviewedBy = current.id;
    }

    if (wantsCompletionUpdate) {
      if (current.role !== "admin" && project.assignedToId !== current.id) {
        return apiError("Seul l'utilisateur assigne peut finaliser le projet avec compte rendu.", 403);
      }

      const baseProgress = hasTasks ? computeProjectProgressFromTasks(project.tasks) : project.progressPercent;
      const effectiveProgress = hasTasks ? baseProgress : data.progressPercent ?? baseProgress;
      const completionReport = parsed.data.completionReport?.trim() ?? "";

      if (parsed.data.markCompleted) {
        if (effectiveProgress < 100) {
          return apiError("La progression doit etre a 100% pour marquer le projet comme termine.", 400);
        }

        if ((data.reportRequired ?? project.reportRequired) && !completionReport && !project.completionReport) {
          return apiError("Un compte rendu est obligatoire pour ce projet.", 400);
        }

        if (completionReport) {
          data.completionReport = completionReport;
        } else if (!project.completionReport && (data.reportRequired ?? project.reportRequired)) {
          data.completionReport = null;
        }

        if (!hasTasks) {
          data.progressPercent = 100;
        }
        data.status = "completed";
        data.completedAt = project.completedAt ?? new Date();
      } else if (parsed.data.completionReport !== undefined) {
        if (!project.completedAt && data.completedAt === undefined) {
          return apiError("Marquez d'abord le projet comme termine avant d'ajouter le compte rendu.", 400);
        }

        data.completionReport = completionReport || null;
      }
    }

    const updated = await prisma.project.update({
      where: { id },
      data,
      include: {
        tasks: {
          select: {
            status: true,
            progressPercent: true,
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

    if (updated._count.tasks > 0) {
      await syncProjectProgressFromTasks(prisma, updated.id);

      const refreshed = await prisma.project.findUnique({
        where: { id: updated.id },
        include: {
          tasks: {
            select: {
              status: true,
              progressPercent: true,
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

      if (refreshed) {
        return NextResponse.json({ message: "Projet modifie.", project: refreshed });
      }
    }

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
