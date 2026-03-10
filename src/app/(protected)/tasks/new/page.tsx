import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import { Prisma } from "@prisma/client";

import TasksPanel from "@/components/tasks/TasksPanel";
import { requireUser } from "@/lib/auth";
import { getProjectVisibilityWhereForUser } from "@/lib/project-visibility";
import prisma from "@/lib/prisma";

export default async function NewTaskPage() {
  const user = await requireUser();

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

  const [projects, assignees] = await Promise.all([
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
          <h1 className="page-title text-slate-900">Nouvelle tache</h1>
          <p className="page-subtitle">
            Creez une tache et assignez-la a un agent ou a un manager selon vos permissions.
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
        agents={assignees}
        view="create"
        redirectAfterCreate="/tasks"
      />
    </div>
  );
}
