"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FiDownload, FiFileText, FiUploadCloud } from "react-icons/fi";

import { extractApiError, showError, showSuccess } from "@/components/ui/notify";

type ProjectFileSummary = {
  id: string;
  displayName: string;
  sizeBytes: number;
  createdAtLabel: string;
  uploadedByName: string;
};

type ProjectFileSubmissionCardProps = {
  projectId: string;
  canSubmit: boolean;
  files: ProjectFileSummary[];
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

export default function ProjectFileSubmissionCard({ projectId, canSubmit, files }: ProjectFileSubmissionCardProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const submitFile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      await showError("Action refusee", "Vous ne pouvez pas soumettre de fichier sur ce projet.");
      return;
    }

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      await showError("Fichier manquant", "Selectionnez un fichier avant de valider.");
      return;
    }

    setUploading(true);

    try {
      const payload = new FormData();
      payload.append("projectId", projectId);
      payload.append("file", file);

      const response = await fetch("/api/project-files", {
        method: "POST",
        body: payload,
      });

      if (!response.ok) {
        await showError("Envoi impossible", await extractApiError(response));
        return;
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await showSuccess("Fichier soumis");
      router.refresh();
    } catch {
      await showError("Erreur reseau", "Impossible de soumettre le fichier.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="app-card p-5">
      <h2 className="text-lg font-semibold text-slate-900">Fichiers du projet</h2>
      <p className="mt-1 text-sm text-slate-500">Soumettez un fichier rattache a ce projet. L&apos;admin le verra dans l&apos;onglet Fichiers.</p>

      {canSubmit ? (
        <form onSubmit={submitFile} className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-3">
          <div className="min-w-[240px] flex-1">
            <label htmlFor="project-file-input" className="field-label">Selectionner un fichier</label>
            <input
              ref={fileInputRef}
              id="project-file-input"
              type="file"
              className="app-input mt-1"
            />
          </div>
          <button type="submit" disabled={uploading} className="app-btn-primary">
            <FiUploadCloud className="text-sm" />
            {uploading ? "Envoi..." : "Soumettre"}
          </button>
        </form>
      ) : (
        <p className="mt-3 text-sm text-slate-500">Seuls le createur, les personnes assignees et l&apos;admin peuvent soumettre un fichier.</p>
      )}

      <div className="mt-4 space-y-2">
        {files.length === 0 && <p className="text-sm text-slate-500">Aucun fichier soumis pour ce projet.</p>}

        {files.map((file) => (
          <article key={file.id} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <FiFileText />
                  {file.displayName}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {file.uploadedByName} - {file.createdAtLabel} - {formatSize(file.sizeBytes)}
                </p>
              </div>
              <a href={`/api/project-files/${file.id}/download`} className="app-btn-outline inline-flex items-center gap-1.5">
                <FiDownload className="text-sm" />
                Telecharger
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
