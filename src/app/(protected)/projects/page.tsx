import Link from "next/link";
import { FiPlus } from "react-icons/fi";
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
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title text-slate-900">Projets</h1>
          <p className="page-subtitle">
            Tous les projets sont affiches par date limite de fin, du plus proche au plus lointain.
          </p>
        </div>
        <Link href="/projects/new" className="app-btn-primary">
          <FiPlus className="text-sm" />
          Nouveau
        </Link>
      </section>

      <ProjectsPanel
        projects={projects}
        role={user.role}
        currentUserId={user.id}
        assignees={assignees}
        view="list"
      />
    </div>
  );
}
