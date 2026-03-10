import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { apiError } from "@/lib/api";
import { requireApiUser } from "@/lib/auth";
import { getProjectVisibilityWhereForUser } from "@/lib/project-visibility";
import prisma from "@/lib/prisma";
import { getTaskVisibilityWhereForUser } from "@/lib/task-visibility";

function mergeTaskWhere(base: Prisma.TaskWhereInput, extra: Prisma.TaskWhereInput): Prisma.TaskWhereInput {
  if (Object.keys(base).length === 0) {
    return extra;
  }

  return { AND: [base, extra] };
}

export async function GET(request: NextRequest) {
  const user = await requireApiUser(request);
  if (!user) {
    return apiError("Unauthorized", 401);
  }

  const projectWhere: Prisma.ProjectWhereInput = getProjectVisibilityWhereForUser({
    id: user.id,
    role: user.role,
  });
  const taskWhere: Prisma.TaskWhereInput = getTaskVisibilityWhereForUser({
    id: user.id,
    role: user.role,
  });

  const projects = await prisma.project.findMany({
    where: projectWhere,
    orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
    },
  });

  const projectIds = projects.map((project) => project.id);
  const tasks =
    projectIds.length === 0
      ? []
      : await prisma.task.findMany({
          where: mergeTaskWhere(taskWhere, {
            projectId: {
              in: projectIds,
            },
          }),
          orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
          select: {
            id: true,
            title: true,
            projectId: true,
            progressPercent: true,
            status: true,
          },
        });

  const tasksByProjectId = new Map<string, typeof tasks>();

  for (const task of tasks) {
    if (!task.projectId) {
      continue;
    }

    const bucket = tasksByProjectId.get(task.projectId);
    if (bucket) {
      bucket.push(task);
    } else {
      tasksByProjectId.set(task.projectId, [task]);
    }
  }

  const tree = projects.map((project) => ({
    id: project.id,
    title: project.title,
    tasks: tasksByProjectId.get(project.id) ?? [],
  }));

  return NextResponse.json({ projects: tree });
}
