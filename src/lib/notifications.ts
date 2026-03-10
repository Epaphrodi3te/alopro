import { Prisma, Role } from "@prisma/client";

import { getDashboardNotificationCount, NavNotificationCounts } from "@/lib/navigation";
import { getProjectVisibilityWhereForUser } from "@/lib/project-visibility";
import { getTaskVisibilityWhereForUser } from "@/lib/task-visibility";
import prisma from "@/lib/prisma";

type NotificationUser = {
  id: string;
  role: Role;
};

export type NotificationSeenAt = Partial<{
  projects: Date;
  tasks: Date;
  messages: Date;
  users: Date;
  files: Date;
}>;

const EPOCH = new Date(0);

function buildScopeForRole(user: NotificationUser) {
  const projectWhere: Prisma.ProjectWhereInput = getProjectVisibilityWhereForUser({
    id: user.id,
    role: user.role,
  });
  const taskWhere: Prisma.TaskWhereInput = getTaskVisibilityWhereForUser({
    id: user.id,
    role: user.role,
  });

  return { projectWhere, taskWhere };
}

export async function getNotificationCountsForUser(
  user: NotificationUser,
  seenAt: NotificationSeenAt = {},
): Promise<NavNotificationCounts> {
  const { projectWhere, taskWhere } = buildScopeForRole(user);

  const [projectsCount, tasksCount, messagesCount, usersCount, filesCount] = await Promise.all([
    prisma.project.count({
      where: {
        ...projectWhere,
        updatedAt: { gt: seenAt.projects ?? EPOCH },
      },
    }),
    prisma.task.count({
      where: {
        ...taskWhere,
        updatedAt: { gt: seenAt.tasks ?? EPOCH },
      },
    }),
    prisma.message.count({
      where: {
        receiverId: user.id,
        createdAt: { gt: seenAt.messages ?? EPOCH },
      },
    }),
    user.role === "admin"
      ? prisma.user.count({
          where: {
            id: { not: user.id },
            createdAt: { gt: seenAt.users ?? EPOCH },
          },
        })
      : Promise.resolve(0),
    user.role === "admin"
      ? prisma.projectFile.count({
          where: {
            createdAt: { gt: seenAt.files ?? EPOCH },
          },
        })
      : Promise.resolve(0),
  ]);

  const counts: NavNotificationCounts = {
    dashboard: 0,
    projects: projectsCount,
    tasks: tasksCount,
    messages: messagesCount,
  };

  if (user.role === "admin") {
    counts.users = usersCount;
    counts.files = filesCount;
  }

  counts.dashboard = getDashboardNotificationCount(counts);

  return counts;
}
