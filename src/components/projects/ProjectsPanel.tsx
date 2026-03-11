"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Role } from "@prisma/client";
import { useRouter } from "next/navigation";
import { FiCalendar, FiEye, FiFilter, FiFolder, FiMoreVertical, FiPlusCircle, FiSearch, FiTrash2, FiTrendingUp, FiUser } from "react-icons/fi";
import Swal from "sweetalert2";

import { extractApiError, showError, showSuccess } from "@/components/ui/notify";
import { ProjectItem, UserLight } from "@/lib/types";

type ProjectsPanelProps = {
  projects: ProjectItem[];
  role: Role;
  assignees: UserLight[];
  view?: "all" | "list" | "create";
  redirectAfterCreate?: string;
};

const initialForm = {
  title: "",
  description: "",
  commissionCfa: "",
  deadline: "",
  status: "pending",
  assignedMemberIds: [] as string[],
  reportRequired: false,
};

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

export default function ProjectsPanel({
  projects,
  role,
  assignees,
  view = "all",
  redirectAfterCreate,
}: ProjectsPanelProps) {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "in_progress" | "completed">("all");
  const [assignmentFilter, setAssignmentFilter] = useState<"all" | "assigned" | "unassigned">("all");
  const [contentFilter, setContentFilter] = useState<"all" | "with_tasks" | "without_tasks">("all");
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
  const filteredProjects = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return sortedProjects.filter((project) => {
      if (statusFilter !== "all" && project.status !== statusFilter) {
        return false;
      }

      const assignedMembers = project.memberships?.map((membership) => membership.user) ?? [];
      const isAssigned = assignedMembers.length > 0 || Boolean(project.assignedToId);
      if (assignmentFilter === "assigned" && !isAssigned) {
        return false;
      }

      if (assignmentFilter === "unassigned" && isAssigned) {
        return false;
      }

      const tasksCount = project._count?.tasks ?? 0;
      if (contentFilter === "with_tasks" && tasksCount === 0) {
        return false;
      }

      if (contentFilter === "without_tasks" && tasksCount > 0) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const assigneesLabel = assignedMembers.map((member) => `${member.firstName} ${member.lastName}`).join(" ");
      const fallbackAssignee = project.assignedTo ? `${project.assignedTo.firstName} ${project.assignedTo.lastName}` : "";
      const haystack = [project.title, project.description, assigneesLabel, fallbackAssignee].join(" ").toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [assignmentFilter, contentFilter, searchQuery, sortedProjects, statusFilter]);

  const canAssignProject = role === "admin" || role === "manager";
  const canRequireReport = role === "admin";
  const canDeleteProject = role === "admin";

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
          assignedMemberIds: canAssignProject ? form.assignedMemberIds : [],
          reportRequired: canRequireReport ? form.reportRequired : false,
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

  const deleteProject = async (projectId: string) => {
    if (!canDeleteProject) {
      await showError("Action refusee", "Seul l'admin peut supprimer un projet.");
      return;
    }

    const result = await Swal.fire({
      icon: "warning",
      title: "Supprimer projet",
      text: "Le projet et ses donnees associees seront supprimes.",
      showCancelButton: true,
      confirmButtonText: "Supprimer",
      cancelButtonText: "Annuler",
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
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

  const openFiltersModal = async () => {
    const result = await Swal.fire({
      title: "Filtres projets",
      html: `
        <div class="swal-pro-form">
          <div class="swal-pro-field">
            <label class="swal-pro-label" for="swal-project-status-filter">Statut</label>
            <select id="swal-project-status-filter" class="swal2-select">
              <option value="all" ${statusFilter === "all" ? "selected" : ""}>Tous</option>
              <option value="pending" ${statusFilter === "pending" ? "selected" : ""}>pending</option>
              <option value="in_progress" ${statusFilter === "in_progress" ? "selected" : ""}>in_progress</option>
              <option value="completed" ${statusFilter === "completed" ? "selected" : ""}>completed</option>
            </select>
          </div>
          <div class="swal-pro-field">
            <label class="swal-pro-label" for="swal-project-assignment-filter">Assignation</label>
            <select id="swal-project-assignment-filter" class="swal2-select">
              <option value="all" ${assignmentFilter === "all" ? "selected" : ""}>Toutes</option>
              <option value="assigned" ${assignmentFilter === "assigned" ? "selected" : ""}>Assignes</option>
              <option value="unassigned" ${assignmentFilter === "unassigned" ? "selected" : ""}>Non assignes</option>
            </select>
          </div>
          <div class="swal-pro-field">
            <label class="swal-pro-label" for="swal-project-content-filter">Contenu</label>
            <select id="swal-project-content-filter" class="swal2-select">
              <option value="all" ${contentFilter === "all" ? "selected" : ""}>Tous</option>
              <option value="with_tasks" ${contentFilter === "with_tasks" ? "selected" : ""}>Avec taches</option>
              <option value="without_tasks" ${contentFilter === "without_tasks" ? "selected" : ""}>Sans tache</option>
            </select>
          </div>
        </div>
      `,
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: "Appliquer",
      denyButtonText: "Reinitialiser",
      cancelButtonText: "Annuler",
      buttonsStyling: false,
      customClass: {
        popup: "swal-pro-modal",
        title: "swal-pro-title",
        htmlContainer: "swal-pro-html",
        confirmButton: "swal-pro-confirm",
        denyButton: "swal-pro-cancel",
        cancelButton: "swal-pro-cancel",
      },
      preConfirm: () => {
        const nextStatusFilter = (document.getElementById("swal-project-status-filter") as HTMLSelectElement | null)?.value;
        const nextAssignmentFilter = (document.getElementById("swal-project-assignment-filter") as HTMLSelectElement | null)?.value;
        const nextContentFilter = (document.getElementById("swal-project-content-filter") as HTMLSelectElement | null)?.value;

        if (!nextStatusFilter || !nextAssignmentFilter || !nextContentFilter) {
          Swal.showValidationMessage("Selectionnez tous les filtres.");
          return;
        }

        return {
          status: nextStatusFilter as typeof statusFilter,
          assignment: nextAssignmentFilter as typeof assignmentFilter,
          content: nextContentFilter as typeof contentFilter,
        };
      },
    });

    if (result.isDenied) {
      setStatusFilter("all");
      setAssignmentFilter("all");
      setContentFilter("all");
      return;
    }

    if (!result.isConfirmed || !result.value) {
      return;
    }

    setStatusFilter(result.value.status);
    setAssignmentFilter(result.value.assignment);
    setContentFilter(result.value.content);
  };

  const activeFiltersCount =
    Number(statusFilter !== "all") +
    Number(assignmentFilter !== "all") +
    Number(contentFilter !== "all");

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
            <div className="form-field">
              <label htmlFor="project-commission" className="field-label">Commission (FCFA)</label>
              <input
                id="project-commission"
                type="number"
                min={0}
                value={form.commissionCfa}
                onChange={(event) => setForm((prev) => ({ ...prev, commissionCfa: event.target.value }))}
                placeholder="Ex: 25000"
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
              <div className="form-field md:col-span-2">
                <label className="field-label">Affecter a plusieurs personnes</label>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {assignees.map((user) => {
                      const checked = form.assignedMemberIds.includes(user.id);

                      return (
                        <label
                          key={user.id}
                          className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm ${
                            checked ? "border-indigo-200 bg-indigo-50 text-indigo-800" : "border-slate-200 bg-white text-slate-700"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) =>
                              setForm((prev) => ({
                                ...prev,
                                assignedMemberIds: event.target.checked
                                  ? [...prev.assignedMemberIds, user.id]
                                  : prev.assignedMemberIds.filter((id) => id !== user.id),
                              }))
                            }
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          <span>
                            {user.firstName} {user.lastName} ({user.role})
                          </span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Selectionnez une ou plusieurs personnes. Une tache reste assignee a une seule personne.
                  </p>
                </div>
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
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <label htmlFor="projects-search" className="field-label">Recherche rapide</label>
                <div className="relative mt-1">
                  <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="projects-search"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Nom du projet, description, assigne..."
                    className="app-input app-input-with-icon"
                  />
                </div>
              </div>
              <div className="shrink-0">
                <label className="field-label">Filtres</label>
                <button
                  type="button"
                  onClick={openFiltersModal}
                  className="app-btn-outline mt-1 h-11 px-3"
                  aria-label="Ouvrir les filtres des projets"
                >
                  <FiFilter className="text-base" />
                  {activeFiltersCount > 0 && (
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              {filteredProjects.length} resultat{filteredProjects.length > 1 ? "s" : ""} affiche{filteredProjects.length > 1 ? "s" : ""}
            </p>
          </article>

          {sortedProjects.length === 0 && (
            <article className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
              Aucun projet trouve.
            </article>
          )}

          {sortedProjects.length > 0 && filteredProjects.length === 0 && (
            <article className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
              Aucun projet ne correspond aux filtres actuels.
            </article>
          )}

          {filteredProjects.map((project) => {
            const progressPercent = Math.max(0, Math.min(100, project.progressPercent ?? 0));
            const assignedMembers = project.memberships?.map((membership) => membership.user) ?? [];
            const assignedMembersLabel =
              assignedMembers.length > 0
                ? assignedMembers.slice(0, 3).map((member) => `${member.firstName} ${member.lastName}`).join(", ")
                : project.assignedTo
                  ? `${project.assignedTo.firstName} ${project.assignedTo.lastName}`
                  : "-";
            const additionalMembersCount = Math.max(0, assignedMembers.length - 3);

            return (
              <article
                key={project.id}
                className="group rounded-2xl border border-slate-200 bg-[linear-gradient(165deg,#ffffff,#f8fafc_85%)] p-3.5 shadow-sm transition hover:border-indigo-200 hover:shadow-md sm:p-4"
              >
                <div className="sm:hidden mobile-mini-card">
                  <div className="mobile-mini-main">
                    <span className="mobile-mini-avatar mobile-mini-avatar-project">
                      <FiFolder className="text-[12px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="mobile-mini-title truncate">{project.title}</p>
                      <div className="mobile-mini-chips">
                        <span className="mobile-mini-chip">
                          <FiUser className="text-[11px]" />
                          {assignedMembers.length > 0 ? `${assignedMembers.length} assigne(s)` : project.assignedTo ? "1 assigne" : "Non assigne"}
                        </span>
                        <span className="mobile-mini-chip mobile-mini-chip-progress">
                          <FiTrendingUp className="text-[11px]" />
                          {progressPercent}%
                        </span>
                        <span className="mobile-mini-chip">
                          <FiCalendar className="text-[11px]" />
                          {formatDate(project.deadline)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <details className="mobile-kebab">
                    <summary className="mobile-kebab-summary">
                      <FiMoreVertical className="text-sm" />
                    </summary>
                    <div className="mobile-kebab-menu">
                      <Link href={`/projects/${project.id}`} className="mobile-kebab-item">
                        <FiEye className="text-xs" />
                        Voir details
                      </Link>
                      {canDeleteProject && (
                        <button type="button" onClick={() => deleteProject(project.id)} className="mobile-kebab-item mobile-kebab-item-danger">
                          <FiTrash2 className="text-xs" />
                          Supprimer
                        </button>
                      )}
                    </div>
                  </details>
                </div>

                <div className="hidden sm:flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-indigo-700">
                      <FiFolder />
                      Projet
                    </div>
                    <p className="mt-2 truncate text-base font-semibold text-slate-900">{project.title}</p>
                  </div>

                  <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                    <Link href={`/projects/${project.id}`} className="app-btn-primary text-xs sm:text-sm">
                      <FiEye className="text-xs" />
                      Voir details
                    </Link>
                    {canDeleteProject && (
                      <button type="button" onClick={() => deleteProject(project.id)} className="app-btn-danger text-xs sm:text-sm">
                        <FiTrash2 className="text-xs" />
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-3 hidden grid-cols-2 gap-2 sm:grid sm:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2">
                    <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                      <FiUser />
                      Personnes assignees
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {assignedMembers.length > 0 ? `${assignedMembers.length}` : project.assignedTo ? "1" : "0"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {assignedMembersLabel}
                      {additionalMembersCount > 0 ? ` +${additionalMembersCount}` : ""}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2">
                    <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                      <FiCalendar />
                      Date fin
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{formatDate(project.deadline)}</p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2">
                    <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                      <FiTrendingUp />
                      Progression
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{progressPercent}%</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                      Commission
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{formatCommission(project.commissionCfa)}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
