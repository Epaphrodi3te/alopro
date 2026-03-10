import { PrismaClient, ProjectStatus } from "@prisma/client";

export function computeProjectProgressFromTasks(tasks: Array<{ progressPercent: number }>) {
  if (tasks.length === 0) {
    return 0;
  }

  const total = tasks.reduce((sum, task) => sum + Math.max(0, Math.min(100, task.progressPercent)), 0);
  return Math.round(total / tasks.length);
}

export function deriveProjectStatusFromProgress(progressPercent: number): ProjectStatus {
  if (progressPercent >= 100) {
    return "completed";
  }

  if (progressPercent > 0) {
    return "in_progress";
  }

  return "pending";
}

export async function syncProjectProgressFromTasks(prisma: PrismaClient, projectId: string) {
  const tasks = await prisma.task.findMany({
    where: { projectId },
    select: { progressPercent: true },
  });

  if (tasks.length === 0) {
    await prisma.project.update({
      where: { id: projectId },
      data: {
        progressPercent: 0,
        status: "pending",
        completedAt: null,
      },
    });

    return;
  }

  const progressPercent = computeProjectProgressFromTasks(tasks);
  const status = deriveProjectStatusFromProgress(progressPercent);

  await prisma.project.update({
    where: { id: projectId },
    data: {
      progressPercent,
      status,
      completedAt: status === "completed" ? new Date() : null,
    },
  });
}
