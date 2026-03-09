"use client";

import { FormEvent, useMemo, useState } from "react";
import { Role } from "@prisma/client";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

import DataTable from "@/components/tables/DataTable";
import Badge from "@/components/ui/Badge";
import { extractApiError, showError, showSuccess } from "@/components/ui/notify";
import { ProjectItem, UserLight } from "@/lib/types";

type ProjectsPanelProps = {
  projects: ProjectItem[];
  role: Role;
  currentUserId: string;
  assignees: UserLight[];
};

const initialForm = {
  title: "",
  description: "",
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

export default function ProjectsPanel({ projects, role, currentUserId, assignees }: ProjectsPanelProps) {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt))),
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
          `<option value="${user.id}" ${project.assignedTo?.id === user.id ? "selected" : ""}>${user.firstName} ${user.lastName} (${user.role})</option>`,
      )
      .join("");

    const result = await Swal.fire({
      title: "Modifier projet",
      html: `
        <input id="swal-title" class="swal2-input" placeholder="Titre" value="${project.title}">
        <textarea id="swal-description" class="swal2-textarea" placeholder="Description">${project.description}</textarea>
        <select id="swal-status" class="swal2-input">
          <option value="pending" ${project.status === "pending" ? "selected" : ""}>pending</option>
          <option value="in_progress" ${project.status === "in_progress" ? "selected" : ""}>in_progress</option>
          <option value="completed" ${project.status === "completed" ? "selected" : ""}>completed</option>
        </select>
        ${
          canAssignProject
            ? `<select id="swal-assignee" class="swal2-input"><option value="">Aucune assignation</option>${assigneeOptions}</select>`
            : ""
        }
      `,
      showCancelButton: true,
      confirmButtonText: "Mettre a jour",
      preConfirm: () => {
        const title = (document.getElementById("swal-title") as HTMLInputElement)?.value;
        const description = (document.getElementById("swal-description") as HTMLTextAreaElement)?.value;
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
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Creer un projet</h2>

        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={submitCreate}>
          <input
            required
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Titre"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={form.status}
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="pending">pending</option>
            <option value="in_progress">in_progress</option>
            <option value="completed">completed</option>
          </select>

          <textarea
            required
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            placeholder="Description"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
            rows={3}
          />

          {canAssignProject && (
            <select
              value={form.assignedToId}
              onChange={(event) => setForm((prev) => ({ ...prev, assignedToId: event.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Aucune assignation</option>
              {assignees.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName} ({user.role})
                </option>
              ))}
            </select>
          )}

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:bg-slate-500"
          >
            {loading ? "Creation..." : "Creer"}
          </button>
        </form>
      </section>

      <section>
        <DataTable
          columns={["Titre", "Statut", "Cree par", "Assigne a", "Taches", "Date", "Actions"]}
          emptyLabel="Aucun projet trouve."
          hasRows={sortedProjects.length > 0}
        >
          {sortedProjects.map((project) => {
            const canEdit = role === "admin" || (role === "manager" && project.createdById === currentUserId);
            const canDelete = role === "admin";

            return (
              <tr key={project.id} className="border-t border-slate-200">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{project.title}</p>
                  <p className="max-w-xs text-xs text-slate-500">{project.description}</p>
                </td>
                <td className="px-4 py-3">{statusBadge(project.status)}</td>
                <td className="px-4 py-3">
                  {project.createdBy.firstName} {project.createdBy.lastName}
                </td>
                <td className="px-4 py-3">
                  {project.assignedTo
                    ? `${project.assignedTo.firstName} ${project.assignedTo.lastName}`
                    : "-"}
                </td>
                <td className="px-4 py-3">{project._count.tasks}</td>
                <td className="px-4 py-3">{new Date(project.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => editProject(project)}
                      disabled={!canEdit}
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteProject(project)}
                      disabled={!canDelete}
                      className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
                    >
                      Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </DataTable>
      </section>
    </div>
  );
}
