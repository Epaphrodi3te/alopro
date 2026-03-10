import { NextRequest, NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { z } from "zod";

import { apiError, parseDate } from "@/lib/api";
import {
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
} from "@/lib/constants";
import { requireApiUser } from "@/lib/auth";
import { canAssignTask, canCreateTask } from "@/lib/permissions";
import { canUserViewProject } from "@/lib/project-visibility";
import { getTaskVisibilityWhereForUser } from "@/lib/task-visibility";
import prisma from "@/lib/prisma";

const createTaskSchema = z.object({
  title: z.string().trim().min(2),
  description: z.string().trim().min(3),
  projectId: z.string().cuid().optional().or(z.literal("")),
  priority: z.enum(TASK_PRIORITY_OPTIONS).optional(),
  status: z.enum(TASK_STATUS_OPTIONS).optional(),
  deadline: z.string().optional().or(z.literal("")),
  assignedToId: z.string().cuid().optional().or(z.literal("")),
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

export async function GET(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return apiError("Unauthorized", 401);
  }

  const where: Prisma.TaskWhereInput = getTaskVisibilityWhereForUser({
    id: user.id,
    role: user.role,
  });

  const tasks = await prisma.task.findMany({
    where,
    orderBy: { createdAt: "desc" },
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

  return NextResponse.json({ tasks });
}

export async function POST(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return apiError("Unauthorized", 401);
  }

  if (!canCreateTask(user.role)) {
    return apiError("Forbidden", 403);
  }

  try {
    const json = await request.json();
    const parsed = createTaskSchema.safeParse(json);

    if (!parsed.success) {
      return apiError("Donnees de tache invalides.", 400);
    }

    const normalizedProjectId = parsed.data.projectId || null;
    let project:
      | {
          id: string;
          createdById: string;
          assignedToId: string | null;
          createdBy: { role: Role };
        }
      | null = null;

    if (normalizedProjectId) {
      project = await prisma.project.findUnique({
        where: { id: normalizedProjectId },
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
      });

      if (!project) {
        return apiError("Projet introuvable.", 404);
      }

      if (
        !canUserViewProject(
          { id: user.id, role: user.role },
          {
            createdById: project.createdById,
            assignedToId: project.assignedToId,
            createdByRole: project.createdBy.role,
          },
        )
      ) {
        return apiError("Projet non accessible.", 403);
      }
    }

    let assignedToId: string | null = null;

    if (user.role === "agent") {
      // Agents cannot assign tasks to others; self-assignment preserves visibility rules.
      assignedToId = user.id;
    }

    if (parsed.data.assignedToId) {
      if (!canAssignTask(user.role)) {
        return apiError("Vous ne pouvez pas assigner une tache.", 403);
      }

      const assignee = await prisma.user.findUnique({
        where: { id: parsed.data.assignedToId },
        select: { id: true, role: true },
      });

      if (!assignee) {
        return apiError("Utilisateur a assigner introuvable.", 404);
      }

      if (!canAssignTaskToRole(user.role, assignee.role)) {
        return apiError("Role d'assignation non autorise pour cette tache.", 400);
      }

      assignedToId = assignee.id;
    }

    const task = await prisma.task.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        projectId: normalizedProjectId,
        createdById: user.id,
        assignedToId,
        priority: parsed.data.priority ?? "medium",
        status: parsed.data.status ?? "todo",
        deadline: parseDate(parsed.data.deadline),
        receivedAt: null,
        deadlineValidatedAt: null,
        progressPercent: 0,
      },
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

    return NextResponse.json({ message: "Tache creee.", task }, { status: 201 });
  } catch {
    return apiError("Erreur serveur.", 500);
  }
}
