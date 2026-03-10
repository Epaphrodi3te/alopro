import Link from "next/link";
import { FiFolder, FiPlus } from "react-icons/fi";
import { Prisma } from "@prisma/client";

import ProjectsPanel from "@/components/projects/ProjectsPanel";
import { requireUser } from "@/lib/auth";
import { getProjectVisibilityWhereForUser } from "@/lib/project-visibility";
import prisma from "@/lib/prisma";

export default async function ProjectsPage() {
  const user = await requireUser();

  const where: Prisma.ProjectWhereInput = getProjectVisibilityWhereForUser({
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
      where,
      orderBy: { createdAt: "desc" },
      include: {
        tasks: {
          select: {
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
        memberships: {
          select: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
        },
        _count: {
          select: { tasks: true },
        },
      },
    }),
    assigneeWhere
      ? prisma.user.findMany({
          where: assigneeWhere,
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
          <p className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-sky-700">
            <FiFolder className="text-[12px]" />
            Gestion projets
          </p>
          <h1 className="page-title text-slate-900">Projets</h1>
          <p className="page-subtitle">
            Vue epuree: seul le nom du projet est affiche ici. Utilisez Voir details pour consulter le reste.
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
        assignees={assignees}
        view="list"
      />
    </div>
  );
}
