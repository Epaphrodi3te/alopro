import { Project, Role, Task } from "@prisma/client";

import type { AuthUser } from "@/lib/auth";

export function isAdmin(user: Pick<AuthUser, "role"> | null) {
  return user?.role === "admin";
}

export function isManager(user: Pick<AuthUser, "role"> | null) {
  return user?.role === "manager";
}

export function isAgent(user: Pick<AuthUser, "role"> | null) {
  return user?.role === "agent";
}

export function canManageUsers(role: Role) {
  return role === "admin";
}

export function canCreateProject(role: Role) {
  return role === "admin" || role === "manager" || role === "agent";
}

export function canEditProject(user: Pick<AuthUser, "id" | "role">, project: Pick<Project, "createdById">) {
  if (user.role === "admin") {
    return true;
  }

  if (user.role === "manager") {
    return project.createdById === user.id;
  }

  return false;
}

export function canDeleteProject(role: Role) {
  return role === "admin";
}

export function canAssignProject(role: Role) {
  return role === "admin" || role === "manager";
}

export function canCreateTask(role: Role) {
  return role === "admin" || role === "manager" || role === "agent";
}

export function canAssignTask(role: Role) {
  return role === "admin" || role === "manager";
}

export function canEditTask(
  user: Pick<AuthUser, "id" | "role">,
  task: Pick<Task, "createdById" | "assignedToId">,
  managedByCurrentManager: boolean,
) {
  if (user.role === "admin") {
    return true;
  }

  if (user.role === "manager") {
    return managedByCurrentManager || task.createdById === user.id || task.assignedToId === user.id;
  }

  return task.assignedToId === user.id;
}

export function canDeleteTask(role: Role) {
  return role === "admin";
}

export function canSendDirectEmail(role: Role) {
  return role === "admin" || role === "manager";
}
