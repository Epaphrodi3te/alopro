import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { apiError, parseDate } from "@/lib/api";
import {
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
} from "@/lib/constants";
import { requireApiUser } from "@/lib/auth";
import { canAssignTask, canCreateTask } from "@/lib/permissions";
import prisma from "@/lib/prisma";

const createTaskSchema = z.object({
  title: z.string().trim().min(2),
  description: z.string().trim().min(3),
  projectId: z.string().cuid(),
  priority: z.enum(TASK_PRIORITY_OPTIONS).optional(),
  status: z.enum(TASK_STATUS_OPTIONS).optional(),
  deadline: z.string().optional().or(z.literal("")),
  assignedToId: z.string().cuid().optional().or(z.literal("")),
});

function canManagerAccessProject(userId: string, project: { createdById: string; assignedToId: string | null }) {
  return project.createdById === userId || project.assignedToId === userId;
}

export async function GET(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return apiError("Unauthorized", 401);
  }

  let where: Prisma.TaskWhereInput = {};

  if (user.role === "manager") {
    where = {
      OR: [
        { createdById: user.id },
        { assignedToId: user.id },
        { project: { createdById: user.id } },
        { project: { assignedToId: user.id } },
      ],
    };
  }

  if (user.role === "agent") {
    where = {
      assignedToId: user.id,
    };
  }

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

    const project = await prisma.project.findUnique({
      where: { id: parsed.data.projectId },
      select: {
        id: true,
        createdById: true,
        assignedToId: true,
      },
    });

    if (!project) {
      return apiError("Projet introuvable.", 404);
    }

    if (user.role === "manager" && !canManagerAccessProject(user.id, project)) {
      return apiError("Vous ne pouvez creer une tache que sur vos projets.", 403);
    }

    if (user.role === "agent" && project.assignedToId !== user.id) {
      return apiError("Un agent ne peut creer une tache que sur un projet qui lui est assigne.", 403);
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

      if (assignee.role !== "agent") {
        return apiError("Une tache doit etre assignee a un agent.", 400);
      }

      assignedToId = assignee.id;
    }

    const task = await prisma.task.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        projectId: parsed.data.projectId,
        createdById: user.id,
        assignedToId,
        priority: parsed.data.priority ?? "medium",
        status: parsed.data.status ?? "todo",
        deadline: parseDate(parsed.data.deadline),
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
