"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Role } from "@prisma/client";
import { useRouter } from "next/navigation";
import { FiCalendar, FiEdit2, FiEye, FiFilter, FiFolder, FiPlusCircle, FiSearch, FiTrash2, FiTrendingUp, FiUser } from "react-icons/fi";
import Swal from "sweetalert2";

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
  commissionCfa: "",
  priority: "medium",
  status: "todo",
  deadline: "",
  assignedToId: "",
  reportRequired: false,
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

function formatDate(value: Date | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString();
}

function formatCommission(value: number | null) {
  if (value === null || value === undefined) {
    return "Aucune";
  }

  return `${new Intl.NumberFormat("fr-FR").format(value)} FCFA`;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "todo" | "in_progress" | "done">("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | "low" | "medium" | "high">("all");
  const [projectScopeFilter, setProjectScopeFilter] = useState<"all" | "with_project" | "independent">("all");
  const [loading, setLoading] = useState(false);

  const showCreate = view !== "list";
  const showList = view !== "create";

  const sortedTasks = useMemo(
    () =>
      [...tasks].sort((a, b) => {
        const aDeadline = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY;
        const bDeadline = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY;

        if (aDeadline !== bDeadline) {
          return aDeadline - bDeadline;
        }

        return Number(new Date(b.createdAt)) - Number(new Date(a.createdAt));
      }),
    [tasks],
  );
  const filteredTasks = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return sortedTasks.filter((task) => {
      if (statusFilter !== "all" && task.status !== statusFilter) {
        return false;
      }

      if (priorityFilter !== "all" && task.priority !== priorityFilter) {
        return false;
      }

      const hasProject = Boolean(task.projectId);
      if (projectScopeFilter === "independent" && hasProject) {
        return false;
      }

      if (projectScopeFilter === "with_project" && !hasProject) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchableParts = [
        task.title,
        task.description,
        task.project?.title ?? "",
        task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : "",
      ];
      const haystack = searchableParts.join(" ").toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [priorityFilter, projectScopeFilter, searchQuery, sortedTasks, statusFilter]);

  const canAssignTask = role === "admin" || role === "manager";
  const canRequireReport = role === "admin";

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
          reportRequired: canRequireReport ? form.reportRequired : false,
        }),
      });

      if (!response.ok) {
        await showError("Creation impossible", await extractApiError(response));
        return;
      }

      setForm({
        ...initialForm,
        projectId: projects[0]?.id ?? "",
      });
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
          `<option value="${user.id}" ${task.assignedTo?.id === user.id ? "selected" : ""}>${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)} (${escapeHtml(user.role)})</option>`,
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
            <div class="swal-pro-field">
              <label class="swal-pro-label" for="swal-commission">Commission (FCFA)</label>
              <input id="swal-commission" type="number" min="0" class="swal2-input" value="${task.commissionCfa ?? ""}" placeholder="Ex: 25000">
            </div>
          </div>
          <div class="swal-pro-row">
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
        const commissionCfa = (document.getElementById("swal-commission") as HTMLInputElement)?.value;
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
          commissionCfa,
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
            <div className="form-field">
              <label htmlFor="task-commission" className="field-label">Commission (FCFA)</label>
              <input
                id="task-commission"
                type="number"
                min={0}
                value={form.commissionCfa}
                onChange={(event) => setForm((prev) => ({ ...prev, commissionCfa: event.target.value }))}
                placeholder="Ex: 15000"
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
                      {agent.firstName} {agent.lastName} ({agent.role})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {canRequireReport && (
              <label className="form-field md:col-span-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <input
                  type="checkbox"
                  checked={form.reportRequired}
                  onChange={(event) => setForm((prev) => ({ ...prev, reportRequired: event.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm font-medium text-slate-700">Compte rendu final obligatoire</span>
              </label>
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
        <section className="space-y-3">
          <article className="app-card p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[240px] flex-1">
                <label htmlFor="tasks-search" className="field-label">Recherche rapide</label>
                <div className="relative mt-1">
                  <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="tasks-search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Titre, description, projet, assignee..."
                    className="app-input pl-10"
                  />
                </div>
              </div>

              <div className="min-w-[170px]">
                <label htmlFor="tasks-type-filter" className="field-label">Type de tache</label>
                <select
                  id="tasks-type-filter"
                  value={projectScopeFilter}
                  onChange={(event) => setProjectScopeFilter(event.target.value as typeof projectScopeFilter)}
                  className="app-select mt-1"
                >
                  <option value="all">Toutes</option>
                  <option value="independent">Independantes</option>
                  <option value="with_project">Sous projet</option>
                </select>
              </div>

              <div className="min-w-[150px]">
                <label htmlFor="tasks-status-filter" className="field-label">Statut</label>
                <select
                  id="tasks-status-filter"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                  className="app-select mt-1"
                >
                  <option value="all">Tous</option>
                  <option value="todo">todo</option>
                  <option value="in_progress">in_progress</option>
                  <option value="done">done</option>
                </select>
              </div>

              <div className="min-w-[150px]">
                <label htmlFor="tasks-priority-filter" className="field-label">Priorite</label>
                <select
                  id="tasks-priority-filter"
                  value={priorityFilter}
                  onChange={(event) => setPriorityFilter(event.target.value as typeof priorityFilter)}
                  className="app-select mt-1"
                >
                  <option value="all">Toutes</option>
                  <option value="high">high</option>
                  <option value="medium">medium</option>
                  <option value="low">low</option>
                </select>
              </div>

              {(searchQuery || statusFilter !== "all" || priorityFilter !== "all" || projectScopeFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setPriorityFilter("all");
                    setProjectScopeFilter("all");
                  }}
                  className="app-btn-outline"
                >
                  <FiFilter className="text-sm" />
                  Reinitialiser
                </button>
              )}
            </div>

            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              {filteredTasks.length} resultat{filteredTasks.length > 1 ? "s" : ""} affiche{filteredTasks.length > 1 ? "s" : ""}
            </p>
          </article>

          {sortedTasks.length === 0 && (
            <article className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
              Aucune tache trouvee.
            </article>
          )}

          {sortedTasks.length > 0 && filteredTasks.length === 0 && (
            <article className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
              Aucune tache ne correspond aux filtres actuels.
            </article>
          )}

          {filteredTasks.map((task) => (
            <article
              key={task.id}
              className="group rounded-2xl border border-slate-200 bg-[linear-gradient(165deg,#ffffff,#f8fafc_85%)] p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-indigo-700">
                    <FiFolder />
                    Tache
                  </div>
                  <p className="mt-2 truncate text-base font-semibold text-slate-900">{task.title}</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">Projet: {task.project?.title ?? "Sans projet"}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {statusBadge(task.status)}
                    {priorityBadge(task.priority)}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link href={`/tasks/${task.id}`} className="app-btn-primary">
                    <FiEye className="text-xs" />
                    Voir details
                  </Link>
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
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2">
                  <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    <FiUser />
                    Assigne a
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : "-"}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2">
                  <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    <FiCalendar />
                    Date fin
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{formatDate(task.deadline)}</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2">
                  <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    <FiTrendingUp />
                    Progression
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{task.progressPercent}%</p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${Math.max(0, Math.min(100, task.progressPercent))}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Commission</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">{formatCommission(task.commissionCfa)}</p>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
