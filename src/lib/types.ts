import { Department, ProjectStatus, Role, TaskPriority, TaskStatus } from "@prisma/client";

export type BasicUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: Role;
  department: Department;
  createdAt: Date;
};

export type UserLight = {
  id: string;
  firstName: string;
  lastName: string;
  role: Role;
  department?: Department;
};

export type ProjectItem = {
  id: string;
  title: string;
  description: string;
  deadline: Date | null;
  status: ProjectStatus;
  createdAt: Date;
  createdById?: string;
  assignedToId?: string | null;
  createdBy: UserLight;
  assignedTo: UserLight | null;
  _count: {
    tasks: number;
  };
};

export type TaskItem = {
  id: string;
  title: string;
  description: string;
  projectId?: string | null;
  createdById?: string;
  assignedToId?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: Date | null;
  createdAt: Date;
  project: {
    id: string;
    title: string;
    status: ProjectStatus;
  } | null;
  createdBy: UserLight;
  assignedTo: UserLight | null;
};

export type MessageItem = {
  id: string;
  content: string;
  createdAt: Date;
  senderId?: string;
  receiverId?: string;
  sender: UserLight;
  receiver: UserLight;
};
