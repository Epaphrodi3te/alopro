"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { FiCheckSquare, FiEdit2, FiEye, FiSave, FiX } from "react-icons/fi";

import { extractApiError, showError, showSuccess } from "@/components/ui/notify";

type QuickTaskItem = {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  progressPercent: number;
  assignedToName: string | null;
};

type ProjectQuickHeaderCardProps = {
  projectId: string;
  projectTitle: string;
  canEdit: boolean;
  initialTitle: string;
  initialDescription: string;
  initialCommissionCfa: number | null;
  initialDeadline: string;
  initialStatus: "pending" | "in_progress" | "completed";
  tasks: QuickTaskItem[];
};

function taskStatusLabel(status: QuickTaskItem["status"]) {
  if (status === "in_progress") {
    return "En cours";
  }

  if (status === "done") {
    return "Terminee";
  }

  return "A faire";
}

function taskStatusSurface(status: QuickTaskItem["status"]) {
  if (status === "in_progress") {
    return "bg-sky-50 text-sky-700 border-sky-100";
  }

  if (status === "done") {
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
  }

  return "bg-amber-50 text-amber-700 border-amber-100";
}

export default function ProjectQuickHeaderCard({
  projectId,
  projectTitle,
  canEdit,
  initialTitle,
  initialDescription,
  initialCommissionCfa,
  initialDeadline,
  initialStatus,
  tasks,
}: ProjectQuickHeaderCardProps) {
  const router = useRouter();
  const hasLinkedTasks = tasks.length > 0;
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: initialTitle,
    description: initialDescription,
    commissionCfa: initialCommissionCfa === null ? "" : String(initialCommissionCfa),
    deadline: initialDeadline,
    status: initialStatus,
  });

  const submitEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          hasLinkedTasks
            ? {
                title: form.title,
                description: form.description,
                commissionCfa: form.commissionCfa,
                deadline: form.deadline,
              }
            : {
                title: form.title,
                description: form.description,
                commissionCfa: form.commissionCfa,
                deadline: form.deadline,
                status: form.status,
              },
        ),
      });

      if (!response.ok) {
        await showError("Modification impossible", await extractApiError(response));
        return;
      }

      await showSuccess("Projet modifie");
      setEditOpen(false);
      router.refresh();
    } catch {
      await showError("Erreur reseau", "Impossible de modifier le projet.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="app-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Projet selectionne</p>
          <h2 className="mt-1.5 text-xl font-bold text-slate-900">{projectTitle}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <button type="button" onClick={() => setEditOpen((previous) => !previous)} className="app-btn-soft">
              {editOpen ? <FiX className="text-sm" /> : <FiEdit2 className="text-sm" />}
              {editOpen ? "Annuler" : "Modifier"}
            </button>
          )}
          <Link href="#project-details" className="app-btn-primary">
            <FiEye className="text-sm" />
            Voir detaille
          </Link>
        </div>
      </div>

      {canEdit && editOpen && (
        <form onSubmit={submitEdit} className="form-grid mt-4 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2">
          <div className="form-field">
            <label htmlFor="project-edit-title" className="field-label">Nom du projet</label>
            <input
              id="project-edit-title"
              value={form.title}
              onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))}
              className="app-input"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="project-edit-status" className="field-label">Statut</label>
            <select
              id="project-edit-status"
              value={form.status}
              disabled={hasLinkedTasks}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  status: event.target.value as "pending" | "in_progress" | "completed",
                }))
              }
              className="app-select"
            >
              <option value="pending">pending</option>
              <option value="in_progress">in_progress</option>
              <option value="completed">completed</option>
            </select>
            {hasLinkedTasks && (
              <p className="field-help">Statut pilote automatiquement par la progression des taches liees.</p>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="project-edit-commission" className="field-label">Commission (FCFA)</label>
            <input
              id="project-edit-commission"
              type="number"
              min={0}
              value={form.commissionCfa}
              onChange={(event) => setForm((previous) => ({ ...previous, commissionCfa: event.target.value }))}
              className="app-input"
            />
          </div>

          <div className="form-field">
            <label htmlFor="project-edit-deadline" className="field-label">Date limite</label>
            <input
              id="project-edit-deadline"
              type="date"
              value={form.deadline}
              onChange={(event) => setForm((previous) => ({ ...previous, deadline: event.target.value }))}
              className="app-input"
            />
          </div>

          <div className="form-field md:col-span-2">
            <label htmlFor="project-edit-description" className="field-label">Description</label>
            <textarea
              id="project-edit-description"
              value={form.description}
              onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
              className="app-textarea"
              rows={3}
              required
            />
          </div>

          <button type="submit" disabled={saving} className="app-btn-primary w-full md:w-fit">
            <FiSave className="text-sm" />
            {saving ? "Enregistrement..." : "Enregistrer"}
          </button>
        </form>
      )}

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3.5">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <p className="text-sm font-semibold text-slate-800">Taches de ce projet</p>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
            <FiCheckSquare className="text-[11px]" />
            {tasks.length}
          </span>
        </div>

        <div className="mt-3 space-y-2.5">
          {tasks.length === 0 && <p className="px-2 py-2 text-sm text-slate-500">Aucune tache rattachee a ce projet.</p>}

          {tasks.map((task) => (
            <Link
              key={task.id}
              href={`/tasks/${task.id}`}
              className="block rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 transition hover:border-slate-300 hover:bg-white"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
                  {Math.max(0, Math.min(100, task.progressPercent))}%
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className={`rounded-full border px-2 py-0.5 font-semibold ${taskStatusSurface(task.status)}`}>
                  {taskStatusLabel(task.status)}
                </span>
                <span>Assigne: {task.assignedToName ?? "-"}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
