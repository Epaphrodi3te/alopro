import { Prisma, Role } from "@prisma/client";

import { NavNotificationCounts } from "@/lib/navigation";
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
}>;

const EPOCH = new Date(0);

function buildScopeForRole(user: NotificationUser) {
  let projectWhere: Prisma.ProjectWhereInput = {};
  let taskWhere: Prisma.TaskWhereInput = {};

  if (user.role === "manager") {
    projectWhere = {
      OR: [{ createdById: user.id }, { assignedToId: user.id }],
    };

    taskWhere = {
      OR: [
        { createdById: user.id },
        { assignedToId: user.id },
        { project: { createdById: user.id } },
        { project: { assignedToId: user.id } },
      ],
    };
  }

  if (user.role === "agent") {
    projectWhere = { assignedToId: user.id };
    taskWhere = { assignedToId: user.id };
  }

  return { projectWhere, taskWhere };
}

export async function getNotificationCountsForUser(
  user: NotificationUser,
  seenAt: NotificationSeenAt = {},
): Promise<NavNotificationCounts> {
  const { projectWhere, taskWhere } = buildScopeForRole(user);

  const [projectsCount, tasksCount, messagesCount, usersCount] = await Promise.all([
    prisma.project.count({
      where: {
        ...projectWhere,
        createdAt: { gt: seenAt.projects ?? EPOCH },
      },
    }),
    prisma.task.count({
      where: {
        ...taskWhere,
        createdAt: { gt: seenAt.tasks ?? EPOCH },
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
  ]);

  const counts: NavNotificationCounts = {
    dashboard: tasksCount + messagesCount,
    projects: projectsCount,
    tasks: tasksCount,
    messages: messagesCount,
  };

  if (user.role === "admin") {
    counts.users = usersCount;
  }

  return counts;
}
