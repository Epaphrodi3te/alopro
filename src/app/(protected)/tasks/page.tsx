import { Prisma } from "@prisma/client";

import TasksPanel from "@/components/tasks/TasksPanel";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export default async function TasksPage() {
  const user = await requireUser();

  let taskWhere: Prisma.TaskWhereInput = {};
  let projectWhere: Prisma.ProjectWhereInput = {};

  if (user.role === "manager") {
    taskWhere = {
      OR: [
        { createdById: user.id },
        { assignedToId: user.id },
        { project: { createdById: user.id } },
        { project: { assignedToId: user.id } },
      ],
    };

    projectWhere = {
      OR: [{ createdById: user.id }, { assignedToId: user.id }],
    };
  }

  if (user.role === "agent") {
    taskWhere = { assignedToId: user.id };
    projectWhere = { assignedToId: user.id };
  }

  const [tasks, projects, agents] = await Promise.all([
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
    user.role === "admin" || user.role === "manager"
      ? prisma.user.findMany({
          where: { role: "agent" },
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
      <section>
        <h1 className="page-title text-slate-900">Taches</h1>
        <p className="page-subtitle">
          Creation, suivi, assignation et execution des taches selon votre role.
        </p>
      </section>

      <TasksPanel tasks={tasks} role={user.role} projects={projects} agents={agents} />
    </div>
  );
}
