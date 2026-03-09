"use client";

import { FormEvent, useMemo, useState } from "react";
import { Role } from "@prisma/client";
import { useRouter } from "next/navigation";
import { FiEdit2, FiPlusCircle, FiTrash2 } from "react-icons/fi";
import Swal from "sweetalert2";

import DataTable from "@/components/tables/DataTable";
import Badge from "@/components/ui/Badge";
import { extractApiError, showError, showSuccess } from "@/components/ui/notify";
import { escapeHtml } from "@/lib/html";
import { ProjectItem, UserLight } from "@/lib/types";

type ProjectsPanelProps = {
  projects: ProjectItem[];
  role: Role;
  currentUserId: string;
  assignees: UserLight[];
  view?: "all" | "list" | "create";
  redirectAfterCreate?: string;
};

const initialForm = {
  title: "",
  description: "",
  deadline: "",
  status: "pending",
  assignedToId: "",
};

function statusBadge(status: "pending" | "in_progress" | "completed") {
  if (status === "pending") {
    return <Badge label="pending" variant="pending" />;
  }

  if (status === "in_progress") {
    return <Badge label="in progress" variant="progress" />;
  }

  return <Badge label="completed" variant="done" />;
}

export default function ProjectsPanel({
  projects,
  role,
  currentUserId,
  assignees,
  view = "all",
  redirectAfterCreate,
}: ProjectsPanelProps) {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  const showCreate = view !== "list";
  const showList = view !== "create";

  const sortedProjects = useMemo(
    () =>
      [...projects].sort((a, b) => {
        const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY;
        const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY;

        if (aDeadline !== bDeadline) {
          return aDeadline - bDeadline;
        }

        return Number(new Date(b.createdAt)) - Number(new Date(a.createdAt));
      }),
    [projects],
  );

  const canAssignProject = role === "admin";

  const submitCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          assignedToId: canAssignProject ? form.assignedToId : "",
        }),
      });

      if (!response.ok) {
        await showError("Creation impossible", await extractApiError(response));
        return;
      }

      setForm(initialForm);
      await showSuccess("Projet cree");

      if (redirectAfterCreate) {
        router.push(redirectAfterCreate);
      }

      router.refresh();
    } catch {
      await showError("Erreur reseau", "Impossible de creer le projet.");
    } finally {
      setLoading(false);
    }
  };

  const editProject = async (project: ProjectItem) => {
    const canEdit = role === "admin" || (role === "manager" && project.createdById === currentUserId);
    if (!canEdit) {
      await showError("Action refusee", "Vous ne pouvez pas modifier ce projet.");
      return;
    }

    const assigneeOptions = assignees
      .map(
        (user) =>
          `<option value="${user.id}" ${project.assignedTo?.id === user.id ? "selected" : ""}>${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)} (${escapeHtml(user.role)})</option>`,
      )
      .join("");

    const result = await Swal.fire({
      title: "Modifier projet",
      html: `
        <div class="swal-pro-form">
          <div class="swal-pro-row">
            <div class="swal-pro-field">
              <label class="swal-pro-label" for="swal-title">Titre</label>
              <input id="swal-title" class="swal2-input" placeholder="Titre du projet" value="${escapeHtml(project.title)}">
            </div>
            <div class="swal-pro-field">
              <label class="swal-pro-label" for="swal-status">Statut</label>
              <select id="swal-status" class="swal2-select">
                <option value="pending" ${project.status === "pending" ? "selected" : ""}>pending</option>
                <option value="in_progress" ${project.status === "in_progress" ? "selected" : ""}>in_progress</option>
                <option value="completed" ${project.status === "completed" ? "selected" : ""}>completed</option>
              </select>
            </div>
          </div>
          <div class="swal-pro-field">
            <label class="swal-pro-label" for="swal-description">Description</label>
            <textarea id="swal-description" class="swal2-textarea" placeholder="Description">${escapeHtml(project.description)}</textarea>
          </div>
          ${
            canAssignProject
              ? `<div class="swal-pro-field">
                  <label class="swal-pro-label" for="swal-assignee">Assigner a</label>
                  <select id="swal-assignee" class="swal2-select"><option value="">Aucune assignation</option>${assigneeOptions}</select>
                </div>`
              : ""
          }
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Mettre a jour",
      cancelButtonText: "Annuler",
      buttonsStyling: false,
      customClass: {
        popup: "swal-pro-modal",
        title: "swal-pro-title",
        htmlContainer: "swal-pro-html",
        confirmButton: "swal-pro-confirm",
        cancelButton: "swal-pro-cancel",
      },
      preConfirm: () => {
        const title = (document.getElementById("swal-title") as HTMLInputElement)?.value;
        const description = (document.getElementById("swal-description") as HTMLTextAreaElement)?.value;
        const deadline = (document.getElementById("swal-deadline") as HTMLInputElement)?.value;
        const status = (document.getElementById("swal-status") as HTMLSelectElement)?.value;
        const assignedToId = canAssignProject
          ? (document.getElementById("swal-assignee") as HTMLSelectElement)?.value
          : undefined;

        if (!title || !description || !status) {
          Swal.showValidationMessage("Titre, description et statut sont obligatoires.");
          return;
        }

        return {
          title,
          description,
          deadline,
          status,
          assignedToId,
        };
      },
    });

    if (!result.isConfirmed || !result.value) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(result.value),
      });

      if (!response.ok) {
        await showError("Modification impossible", await extractApiError(response));
        return;
      }

      await showSuccess("Projet modifie");
      router.refresh();
    } catch {
      await showError("Erreur reseau", "Impossible de modifier le projet.");
    }
  };

  const deleteProject = async (project: ProjectItem) => {
    if (role !== "admin") {
      await showError("Action refusee", "Seul l'admin peut supprimer un projet.");
      return;
    }

    const confirm = await Swal.fire({
      icon: "warning",
      title: "Supprimer projet",
      text: `Confirmer la suppression du projet "${project.title}" ?`,
      showCancelButton: true,
      confirmButtonText: "Supprimer",
      cancelButtonText: "Annuler",
      confirmButtonColor: "#b91c1c",
    });

    if (!confirm.isConfirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        await showError("Suppression impossible", await extractApiError(response));
        return;
      }

      await showSuccess("Projet supprime");
      router.refresh();
    } catch {
      await showError("Erreur reseau", "Impossible de supprimer le projet.");
    }
  };

  return (
    <div className="space-y-6">
      {showCreate && (
        <section className="app-card p-5">
          <h2 className="text-lg font-bold text-slate-900">Creer un projet</h2>

          <form className="form-grid mt-4 md:grid-cols-2" onSubmit={submitCreate}>
            <div className="form-field">
              <label htmlFor="project-title" className="field-label">Titre du projet</label>
              <input
                id="project-title"
                required
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Ex: Refonte site vitrine"
                className="app-input"
              />
            </div>
            <div className="form-field">
              <label htmlFor="project-status" className="field-label">Statut</label>
              <select
                id="project-status"
                value={form.status}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                className="app-select"
              >
                <option value="pending">pending</option>
                <option value="in_progress">in_progress</option>
                <option value="completed">completed</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="project-deadline" className="field-label">Date limite</label>
              <input
                id="project-deadline"
                type="date"
                value={form.deadline}
                onChange={(event) => setForm((prev) => ({ ...prev, deadline: event.target.value }))}
                className="app-input"
              />
            </div>

            <div className="form-field md:col-span-2">
              <label htmlFor="project-description" className="field-label">Description</label>
              <textarea
                id="project-description"
                required
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Objectifs, contexte et livrables..."
                className="app-textarea"
                rows={3}
              />
            </div>

            {canAssignProject && (
              <div className="form-field">
                <label htmlFor="project-assignee" className="field-label">Assigner a</label>
                <select
                  id="project-assignee"
                  value={form.assignedToId}
                  onChange={(event) => setForm((prev) => ({ ...prev, assignedToId: event.target.value }))}
                  className="app-select"
                >
                  <option value="">Aucune assignation</option>
                  {assignees.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="app-btn-primary w-full md:w-fit"
            >
              <FiPlusCircle className="text-sm" />
              {loading ? "Creation..." : "Creer"}
            </button>
          </form>
        </section>
      )}

      {showList && (
        <section>
          <DataTable
            columns={["Titre", "Date limite", "Statut", "Cree par", "Assigne a", "Taches", "Date", "Actions"]}
            emptyLabel="Aucun projet trouve."
            hasRows={sortedProjects.length > 0}
          >
            {sortedProjects.map((project) => {
              const canEdit = role === "admin" || (role === "manager" && project.createdById === currentUserId);
              const canDelete = role === "admin";

              return (
                <tr key={project.id} className="border-t border-slate-200">
                  <td data-label="Titre" className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{project.title}</p>
                    <p className="max-w-xs text-xs text-slate-500">{project.description}</p>
                  </td>
                  <td data-label="Date limite" className="px-4 py-3">
                    {project.deadline ? new Date(project.deadline).toLocaleDateString() : "-"}
                  </td>
                  <td data-label="Statut" className="px-4 py-3">{statusBadge(project.status)}</td>
                  <td data-label="Cree par" className="px-4 py-3">
                    {project.createdBy.firstName} {project.createdBy.lastName}
                  </td>
                  <td data-label="Assigne a" className="px-4 py-3">
                    {project.assignedTo
                      ? `${project.assignedTo.firstName} ${project.assignedTo.lastName}`
                      : "-"}
                  </td>
                  <td data-label="Taches" className="px-4 py-3">{project._count.tasks}</td>
                  <td data-label="Date" className="px-4 py-3">{new Date(project.createdAt).toLocaleDateString()}</td>
                  <td data-label="Actions" className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => editProject(project)}
                        disabled={!canEdit}
                        className="app-btn-soft"
                      >
                        <FiEdit2 className="text-xs" />
                        Modifier
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteProject(project)}
                        disabled={!canDelete}
                        className="app-btn-danger"
                      >
                        <FiTrash2 className="text-xs" />
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </DataTable>
        </section>
      )}
    </div>
  );
}
