"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FiDownload, FiFile, FiFolder, FiUploadCloud } from "react-icons/fi";

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
  const folderInputRef = (node: HTMLInputElement | null) => {
    if (node) {
      node.setAttribute("webkitdirectory", "");
      folderRef.current = node;
    }
  };
  const folderRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");

  const uploadFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      await showError("Aucun fichier", "Selectionnez au moins un fichier.");
      return;
    }

    setUploading(true);
    let uploaded = 0;
    let failed = 0;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.size <= 0) continue;

      setUploadProgress(`${i + 1} / ${fileList.length}`);

      try {
        const payload = new FormData();
        payload.append("projectId", projectId);
        payload.append("file", file);

        const response = await fetch("/api/project-files", {
          method: "POST",
          body: payload,
        });

        if (response.ok) {
          uploaded++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    setUploadProgress("");
    setUploading(false);

    if (fileInputRef.current) fileInputRef.current.value = "";
    if (folderRef.current) folderRef.current.value = "";

    if (failed > 0) {
      await showError("Envoi partiel", `${uploaded} envoye(s), ${failed} echoue(s).`);
    } else {
      await showSuccess(`${uploaded} fichier${uploaded > 1 ? "s" : ""} envoye${uploaded > 1 ? "s" : ""}`);
    }

    router.refresh();
  };

  const handleFileSubmit = () => uploadFiles(fileInputRef.current?.files ?? null);
  const handleFolderSubmit = () => uploadFiles(folderRef.current?.files ?? null);

  return (
    <section className="app-card p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
        <FiFile size={16} className="text-slate-400" />
        Fichiers ({files.length})
      </h2>

      {canSubmit && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <FiUploadCloud size={13} />
              Fichiers
            </label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="app-input mt-2 text-sm"
              disabled={uploading}
            />
            <button
              type="button"
              onClick={handleFileSubmit}
              disabled={uploading}
              className="app-btn-primary mt-2 w-full text-sm"
            >
              {uploading && uploadProgress ? `Envoi ${uploadProgress}...` : "Envoyer"}
            </button>
          </div>

          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <FiFolder size={13} />
              Dossier complet
            </label>
            <input
              ref={folderInputRef}
              type="file"
              multiple
              className="app-input mt-2 text-sm"
              disabled={uploading}
            />
            <button
              type="button"
              onClick={handleFolderSubmit}
              disabled={uploading}
              className="app-btn-primary mt-2 w-full text-sm"
            >
              {uploading && uploadProgress ? `Envoi ${uploadProgress}...` : "Envoyer le dossier"}
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {files.length === 0 && <p className="py-3 text-center text-sm text-slate-400">Aucun fichier.</p>}

        {files.map((file) => (
          <div key={file.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <FiFile size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{file.displayName}</p>
              <p className="text-xs text-slate-400">
                {file.uploadedByName} · {file.createdAtLabel} · {formatSize(file.sizeBytes)}
              </p>
            </div>
            <a href={`/api/project-files/${file.id}/download`} className="app-btn-soft shrink-0 text-xs">
              <FiDownload size={13} />
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
