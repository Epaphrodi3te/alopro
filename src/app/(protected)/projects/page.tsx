import { Prisma } from "@prisma/client";

import ProjectsPanel from "@/components/projects/ProjectsPanel";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export default async function ProjectsPage() {
  const user = await requireUser();

  let where: Prisma.ProjectWhereInput = {};

  if (user.role === "manager") {
    where = {
      OR: [{ createdById: user.id }, { assignedToId: user.id }],
    };
  }

  if (user.role === "agent") {
    where = {
      assignedToId: user.id,
    };
  }

  const [projects, assignees] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
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
        _count: {
          select: { tasks: true },
        },
      },
    }),
    user.role === "admin"
      ? prisma.user.findMany({
          where: { role: { in: ["manager", "agent"] } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-2xl font-bold text-slate-900">Projets</h1>
        <p className="mt-1 text-sm text-slate-600">
          Gestion des projets avec controle par role et assignation securisee.
        </p>
      </section>

      <ProjectsPanel projects={projects} role={user.role} currentUserId={user.id} assignees={assignees} />
    </div>
  );
}
