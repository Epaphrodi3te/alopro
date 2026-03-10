import { redirect } from "next/navigation";
import { FiArchive } from "react-icons/fi";

import ProjectFilesPanel from "@/components/files/ProjectFilesPanel";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export default async function FilesPage() {
  const user = await requireUser();

  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  const files = await prisma.projectFile.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      project: {
        select: {
          id: true,
          title: true,
        },
      },
      uploadedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
  });

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-slate-700">
            <FiArchive className="text-[12px]" />
            Administration fichiers
          </p>
          <h1 className="page-title text-slate-900">Fichiers</h1>
          <p className="page-subtitle">
            Consultez tous les fichiers soumis depuis les projets et supprimez-les si necessaire.
          </p>
        </div>
      </section>

      <ProjectFilesPanel files={files} />
    </div>
  );
}
