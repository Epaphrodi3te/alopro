import { Prisma, Role } from "@prisma/client";

type ScopedUser = {
  id: string;
  role: Role;
};

type TaskAccessContext = {
  createdById: string;
  assignedToId: string | null;
  project: {
    createdById: string;
    assignedToId: string | null;
    assignedMemberIds: string[];
    createdByRole: Role;
  } | null;
};

export function getTaskVisibilityWhereForUser(user: ScopedUser): Prisma.TaskWhereInput {
  if (user.role === "admin") {
    // Admin does not see tasks attached to projects created by agents.
    return {
      OR: [
        { projectId: null },
        {
          project: {
            createdBy: {
              role: {
                not: "agent",
              },
            },
          },
        },
      ],
    };
  }

  if (user.role === "manager") {
    return {
      OR: [
        { createdById: user.id },
        { assignedToId: user.id },
        { project: { createdById: user.id } },
        { project: { assignedToId: user.id } },
        { project: { memberships: { some: { userId: user.id } } } },
      ],
    };
  }

  if (user.role === "agent") {
    return {
      OR: [
        { createdById: user.id },
        { assignedToId: user.id },
        { project: { createdById: user.id } },
        { project: { memberships: { some: { userId: user.id } } } },
      ],
    };
  }

  return {};
}

export function canUserViewTask(user: ScopedUser, task: TaskAccessContext) {
  if (user.role === "admin") {
    if (!task.project) {
      return true;
    }

    return task.project.createdByRole !== "agent";
  }

  if (user.role === "manager") {
    const managesProject =
      !!task.project &&
      (task.project.createdById === user.id ||
        task.project.assignedToId === user.id ||
        task.project.assignedMemberIds.includes(user.id));

    return task.createdById === user.id || task.assignedToId === user.id || managesProject;
  }

  return (
    task.createdById === user.id ||
    task.assignedToId === user.id ||
    task.project?.createdById === user.id ||
    Boolean(task.project?.assignedMemberIds.includes(user.id))
  );
}
