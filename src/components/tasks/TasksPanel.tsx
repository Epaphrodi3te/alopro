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
import { TaskItem, UserLight } from "@/lib/types";

type ProjectOption = {
  id: string;
  title: string;
};

type TasksPanelProps = {
  tasks: TaskItem[];
  role: Role;
  projects: ProjectOption[];
  agents: UserLight[];
  view?: "all" | "list" | "create";
  redirectAfterCreate?: string;
};

const initialForm = {
  title: "",
  description: "",
  projectId: "",
  priority: "medium",
  status: "todo",
  deadline: "",
  assignedToId: "",
};

function statusBadge(status: "todo" | "in_progress" | "done") {
  if (status === "todo") {
    return <Badge label="todo" variant="pending" />;
  }

  if (status === "in_progress") {
    return <Badge label="in progress" variant="progress" />;
  }

  return <Badge label="done" variant="done" />;
}

function priorityBadge(priority: "low" | "medium" | "high") {
  if (priority === "high") {
    return <Badge label="high" variant="high" />;
  }

  if (priority === "medium") {
    return <Badge label="medium" variant="medium" />;
  }

  return <Badge label="low" variant="low" />;
}

export default function TasksPanel({
  tasks,
  role,
  projects,
  agents,
  view = "all",
  redirectAfterCreate,
}: TasksPanelProps) {
  const router = useRouter();

  const [form, setForm] = useState({
    ...initialForm,
    projectId: projects[0]?.id ?? "",
  });
  const [loading, setLoading] = useState(false);

  const showCreate = view !== "list";
  const showList = view !== "create";

  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt))),
    [tasks],
  );

  const canAssignTask = role === "admin" || role === "manager";

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          assignedToId: canAssignTask ? form.assignedToId : "",
        }),
      });

      if (!response.ok) {
        await showError("Creation impossible", await extractApiError(response));
        return;
      }

      setForm((prev) => ({
        ...initialForm,
        projectId: projects[0]?.id ?? "",
      }));
      await showSuccess("Tache creee");

      if (redirectAfterCreate) {
        router.push(redirectAfterCreate);
      }

      router.refresh();
    } catch {
      await showError("Erreur reseau", "Impossible de creer la tache.");
    } finally {
      setLoading(false);
    }
  };

  const editTask = async (task: TaskItem) => {
    const agentOptions = agents
      .map(
        (user) =>
          `<option value="${user.id}" ${task.assignedTo?.id === user.id ? "selected" : ""}>${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}</option>`,
      )
      .join("");

    const result = await Swal.fire({
      title: "Modifier tache",
      html: `
        <div class="swal-pro-form">
          <div class="swal-pro-field">
            <label class="swal-pro-label" for="swal-title">Titre</label>
            <input id="swal-title" class="swal2-input" placeholder="Titre de la tache" value="${escapeHtml(task.title)}">
          </div>
          <div class="swal-pro-field">
            <label class="swal-pro-label" for="swal-description">Description</label>
            <textarea id="swal-description" class="swal2-textarea" placeholder="Description">${escapeHtml(task.description)}</textarea>
          </div>
          <div class="swal-pro-row">
            <div class="swal-pro-field">
              <label class="swal-pro-label" for="swal-priority">Priorite</label>
              <select id="swal-priority" class="swal2-select">
                <option value="low" ${task.priority === "low" ? "selected" : ""}>low</option>
                <option value="medium" ${task.priority === "medium" ? "selected" : ""}>medium</option>
                <option value="high" ${task.priority === "high" ? "selected" : ""}>high</option>
              </select>
            </div>
            <div class="swal-pro-field">
              <label class="swal-pro-label" for="swal-status">Statut</label>
              <select id="swal-status" class="swal2-select">
                <option value="todo" ${task.status === "todo" ? "selected" : ""}>todo</option>
                <option value="in_progress" ${task.status === "in_progress" ? "selected" : ""}>in_progress</option>
                <option value="done" ${task.status === "done" ? "selected" : ""}>done</option>
              </select>
            </div>
          </div>
          <div class="swal-pro-row">
            <div class="swal-pro-field">
              <label class="swal-pro-label" for="swal-deadline">Deadline</label>
              <input id="swal-deadline" type="date" class="swal2-input" value="${
                task.deadline ? new Date(task.deadline).toISOString().slice(0, 10) : ""
              }">
            </div>
            ${
              canAssignTask
                ? `<div class="swal-pro-field">
                    <label class="swal-pro-label" for="swal-assignee">Assigner a</label>
                    <select id="swal-assignee" class="swal2-select"><option value="">Aucune assignation</option>${agentOptions}</select>
                  </div>`
                : ""
            }
          </div>
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
        const priority = (document.getElementById("swal-priority") as HTMLSelectElement)?.value;
        const status = (document.getElementById("swal-status") as HTMLSelectElement)?.value;
        const deadline = (document.getElementById("swal-deadline") as HTMLInputElement)?.value;
        const assignedToId = canAssignTask
          ? (document.getElementById("swal-assignee") as HTMLSelectElement)?.value
          : undefined;

        if (!title || !description || !priority || !status) {
          Swal.showValidationMessage("Titre, description, priorite et statut sont obligatoires.");
          return;
        }

        return {
          title,
          description,
          priority,
          status,
          deadline,
          assignedToId,
        };
      },
    });

    if (!result.isConfirmed || !result.value) {
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
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

      await showSuccess("Tache modifiee");
      router.refresh();
    } catch {
      await showError("Erreur reseau", "Impossible de modifier la tache.");
    }
  };

  const deleteTask = async (task: TaskItem) => {
    if (role !== "admin") {
      await showError("Action refusee", "Seul l'admin peut supprimer une tache.");
      return;
    }

    const confirm = await Swal.fire({
      icon: "warning",
      title: "Supprimer tache",
      text: `Confirmer la suppression de la tache "${task.title}" ?`,
      showCancelButton: true,
      confirmButtonText: "Supprimer",
      cancelButtonText: "Annuler",
      confirmButtonColor: "#b91c1c",
    });

    if (!confirm.isConfirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        await showError("Suppression impossible", await extractApiError(response));
        return;
      }

      await showSuccess("Tache supprimee");
      router.refresh();
    } catch {
      await showError("Erreur reseau", "Impossible de supprimer la tache.");
    }
  };

  return (
    <div className="space-y-6">
      {showCreate && (
        <section className="app-card p-5">
          <h2 className="text-lg font-bold text-slate-900">Creer une tache</h2>

          <form className="form-grid mt-4 md:grid-cols-2" onSubmit={handleCreate}>
            <div className="form-field">
              <label htmlFor="task-title" className="field-label">Titre de la tache</label>
              <input
                id="task-title"
                required
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Ex: Integrer API de paiement"
                className="app-input"
              />
            </div>
            <div className="form-field">
              <label htmlFor="task-project" className="field-label">Projet</label>
              <select
                id="task-project"
                value={form.projectId}
                onChange={(event) => setForm((prev) => ({ ...prev, projectId: event.target.value }))}
                className="app-select"
              >
                <option value="">Sans projet</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field md:col-span-2">
              <label htmlFor="task-description" className="field-label">Description</label>
              <textarea
                id="task-description"
                required
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Contexte et criteres de succes..."
                className="app-textarea"
                rows={3}
              />
            </div>

            <div className="form-field">
              <label htmlFor="task-priority" className="field-label">Priorite</label>
              <select
                id="task-priority"
                value={form.priority}
                onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}
                className="app-select"
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="task-status" className="field-label">Statut</label>
              <select
                id="task-status"
                value={form.status}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                className="app-select"
              >
                <option value="todo">todo</option>
                <option value="in_progress">in_progress</option>
                <option value="done">done</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="task-deadline" className="field-label">Deadline</label>
              <input
                id="task-deadline"
                type="date"
                value={form.deadline}
                onChange={(event) => setForm((prev) => ({ ...prev, deadline: event.target.value }))}
                className="app-input"
              />
            </div>

            {canAssignTask && (
              <div className="form-field">
                <label htmlFor="task-assignee" className="field-label">Assigner a</label>
                <select
                  id="task-assignee"
                  value={form.assignedToId}
                  onChange={(event) => setForm((prev) => ({ ...prev, assignedToId: event.target.value }))}
                  className="app-select"
                >
                  <option value="">Aucune assignation</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.firstName} {agent.lastName}
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
            columns={[
              "Tache",
              "Projet",
              "Priorite",
              "Statut",
              "Assignee",
              "Deadline",
              "Date",
              "Actions",
            ]}
            emptyLabel="Aucune tache trouvee."
            hasRows={sortedTasks.length > 0}
          >
            {sortedTasks.map((task) => (
              <tr key={task.id} className="border-t border-slate-200">
                <td data-label="Tache" className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{task.title}</p>
                  <p className="max-w-xs text-xs text-slate-500">{task.description}</p>
                </td>
                <td data-label="Projet" className="px-4 py-3">{task.project?.title ?? "Sans projet"}</td>
                <td data-label="Priorite" className="px-4 py-3">{priorityBadge(task.priority)}</td>
                <td data-label="Statut" className="px-4 py-3">{statusBadge(task.status)}</td>
                <td data-label="Assignee" className="px-4 py-3">
                  {task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : "-"}
                </td>
                <td data-label="Deadline" className="px-4 py-3">
                  {task.deadline ? new Date(task.deadline).toLocaleDateString() : "-"}
                </td>
                <td data-label="Date" className="px-4 py-3">{new Date(task.createdAt).toLocaleDateString()}</td>
                <td data-label="Actions" className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => editTask(task)}
                      className="app-btn-soft"
                    >
                      <FiEdit2 className="text-xs" />
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteTask(task)}
                      disabled={role !== "admin"}
                      className="app-btn-danger"
                    >
                      <FiTrash2 className="text-xs" />
                      Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        </section>
      )}
    </div>
  );
}
