import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";

import ProjectsPanel from "@/components/projects/ProjectsPanel";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export default async function NewProjectPage() {
  const user = await requireUser();

  const assignees =
    user.role === "admin"
      ? await prisma.user.findMany({
          where: { role: { in: ["manager", "agent"] } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
          orderBy: { createdAt: "desc" },
        })
      : [];

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="page-title text-slate-900">Nouveau projet</h1>
          <p className="page-subtitle">
            Remplissez le formulaire, puis validez pour ajouter le projet.
          </p>
        </div>
        <Link href="/projects" className="app-btn-soft">
          <FiArrowLeft className="text-sm" />
          Retour a la liste
        </Link>
      </section>

      <ProjectsPanel
        projects={[]}
        role={user.role}
        currentUserId={user.id}
        assignees={assignees}
        view="create"
        redirectAfterCreate="/projects"
      />
    </div>
  );
}
