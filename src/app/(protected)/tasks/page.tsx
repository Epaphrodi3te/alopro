import Link from "next/link";
import { FiCheckSquare, FiPlus } from "react-icons/fi";
import { Prisma } from "@prisma/client";

import TasksPanel from "@/components/tasks/TasksPanel";
import { requireUser } from "@/lib/auth";
import { getProjectVisibilityWhereForUser } from "@/lib/project-visibility";
import { getTaskVisibilityWhereForUser } from "@/lib/task-visibility";
import prisma from "@/lib/prisma";

export default async function TasksPage() {
  const user = await requireUser();

  const taskWhere: Prisma.TaskWhereInput = getTaskVisibilityWhereForUser({
    id: user.id,
    role: user.role,
  });
  const projectWhere: Prisma.ProjectWhereInput = getProjectVisibilityWhereForUser({
    id: user.id,
    role: user.role,
  });

  let assigneeWhere: Prisma.UserWhereInput | null = null;

  if (user.role === "admin") {
    assigneeWhere = { role: { in: ["manager", "agent"] } };
  }

  if (user.role === "manager") {
    assigneeWhere = { role: "agent" };
  }

  const [tasks, projects, assignees] = await Promise.all([
    prisma.task.findMany({
      where: taskWhere,
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
    }),
    prisma.project.findMany({
      where: projectWhere,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
      },
    }),
    assigneeWhere
      ? prisma.user.findMany({
          where: assigneeWhere,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-emerald-700">
            <FiCheckSquare className="text-[12px]" />
            Gestion taches
          </p>
          <h1 className="page-title text-slate-900">Taches</h1>
          <p className="page-subtitle">
            Liste complete des taches. Cliquez sur Nouveau pour ouvrir le formulaire de creation.
          </p>
        </div>
        <Link href="/tasks/new" className="app-btn-primary">
          <FiPlus className="text-sm" />
          Nouveau
        </Link>
      </section>

      <TasksPanel tasks={tasks} role={user.role} projects={projects} agents={assignees} view="list" />
    </div>
  );
}
