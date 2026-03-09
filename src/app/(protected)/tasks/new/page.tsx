import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import { Prisma } from "@prisma/client";

import TasksPanel from "@/components/tasks/TasksPanel";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export default async function NewTaskPage() {
  const user = await requireUser();

  let projectWhere: Prisma.ProjectWhereInput = {};

  if (user.role === "manager") {
    projectWhere = {
      OR: [{ createdById: user.id }, { assignedToId: user.id }],
    };
  }

  if (user.role === "agent") {
    projectWhere = { assignedToId: user.id };
  }

  const [projects, agents] = await Promise.all([
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
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title text-slate-900">Nouvelle tache</h1>
          <p className="page-subtitle">
            Creez une tache et assignez-la a un agent selon votre role.
          </p>
        </div>
        <Link href="/tasks" className="app-btn-soft">
          <FiArrowLeft className="text-sm" />
          Retour a la liste
        </Link>
      </section>

      <TasksPanel
        tasks={[]}
        role={user.role}
        projects={projects}
        agents={agents}
        view="create"
        redirectAfterCreate="/tasks"
      />
    </div>
  );
}
