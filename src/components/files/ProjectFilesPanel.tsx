"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { FiCalendar, FiDownload, FiFileText, FiFolder, FiTrash2, FiUser } from "react-icons/fi";

import { ProjectFileItem } from "@/lib/types";
import { extractApiError, showError, showSuccess } from "@/components/ui/notify";

type ProjectFilesPanelProps = {
  files: ProjectFileItem[];
};

function formatSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function ProjectFilesPanel({ files }: ProjectFilesPanelProps) {
  const router = useRouter();

  const deleteFile = async (fileId: string) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Supprimer fichier",
      text: "Ce fichier sera supprime definitivement.",
      showCancelButton: true,
      confirmButtonText: "Supprimer",
      cancelButtonText: "Annuler",
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/project-files/${fileId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        await showError("Suppression impossible", await extractApiError(response));
        return;
      }

      await showSuccess("Fichier supprime");
      router.refresh();
    } catch {
      await showError("Erreur reseau", "Impossible de supprimer le fichier.");
    }
  };

  return (
    <section className="space-y-3">
      {files.length === 0 && (
        <article className="app-card p-6 text-center text-sm text-slate-500">
          Aucun fichier soumis pour le moment.
        </article>
      )}

      {files.map((file) => (
        <article key={file.id} className="app-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                <FiFileText />
                Fichier
              </p>
              <p className="mt-2 truncate text-sm font-semibold text-slate-900">{file.displayName}</p>
              <p className="mt-1 truncate text-xs text-slate-500">Original: {file.originalName}</p>
            </div>

            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <a href={`/api/project-files/${file.id}/download`} className="app-btn-outline inline-flex items-center gap-1.5 text-xs sm:text-sm">
                <FiDownload className="text-sm" />
                Telecharger
              </a>
              <button type="button" onClick={() => deleteFile(file.id)} className="app-btn-danger text-xs sm:text-sm">
                <FiTrash2 className="text-sm" />
                Supprimer
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                <FiFolder />
                Projet
              </p>
              <Link href={`/projects/${file.project.id}`} className="mt-1 block text-sm font-semibold text-slate-800 hover:text-slate-950">
                {file.project.title}
              </Link>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                <FiUser />
                Soumis par
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {file.uploadedBy.firstName} {file.uploadedBy.lastName}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                Taille
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">{formatSize(file.sizeBytes)}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                <FiCalendar />
                Date
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-800 sm:text-sm">{new Date(file.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
