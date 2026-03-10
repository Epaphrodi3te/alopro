import { Prisma, Role } from "@prisma/client";

type ScopedUser = {
  id: string;
  role: Role;
};

type ProjectAccessContext = {
  createdById: string;
  assignedToId: string | null;
  createdByRole: Role;
};

export function getProjectVisibilityWhereForUser(user: ScopedUser): Prisma.ProjectWhereInput {
  if (user.role === "admin") {
    // Admin does not see projects created by agents.
    return {
      createdBy: {
        role: {
          not: "agent",
        },
      },
    };
  }

  if (user.role === "manager") {
    return {
      OR: [{ createdById: user.id }, { assignedToId: user.id }],
    };
  }

  if (user.role === "agent") {
    return { assignedToId: user.id };
  }

  return {};
}

export function canUserViewProject(user: ScopedUser, project: ProjectAccessContext) {
  if (user.role === "admin") {
    return project.createdByRole !== "agent";
  }

  if (user.role === "manager") {
    return project.createdById === user.id || project.assignedToId === user.id;
  }

  return project.assignedToId === user.id;
}
