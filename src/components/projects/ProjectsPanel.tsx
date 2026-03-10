"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Role } from "@prisma/client";
import { useRouter } from "next/navigation";
import { FiCalendar, FiEye, FiFolder, FiPlusCircle, FiTrendingUp, FiUser } from "react-icons/fi";

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
  deadline: "",
  status: "pending",
  assignedToId: "",
};

function formatDate(value: Date | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString();
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

  const canAssignProject = role === "admin" || role === "manager";

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
        <section className="space-y-3">
          {sortedProjects.length === 0 && (
            <article className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
              Aucun projet trouve.
            </article>
          )}

          {sortedProjects.map((project) => {
            const totalTasks = project.tasks?.length ?? project._count.tasks ?? 0;
            const doneTasks = project.tasks
              ? project.tasks.filter((task) => task.status === "done").length
              : project.status === "completed" && totalTasks > 0
                ? totalTasks
                : 0;
            const progressPercent = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

            return (
              <article
                key={project.id}
                className="group rounded-2xl border border-slate-200 bg-[linear-gradient(165deg,#ffffff,#f8fafc_85%)] p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-indigo-700">
                      <FiFolder />
                      Projet
                    </div>
                    <p className="mt-2 truncate text-base font-semibold text-slate-900">{project.title}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link href={`/projects/${project.id}`} className="app-btn-primary">
                      <FiEye className="text-xs" />
                      Voir details
                    </Link>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-white/90 px-3 py-2">
                    <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                      <FiUser />
                      Assigne a
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {project.assignedTo ? `${project.assignedTo.firstName} ${project.assignedTo.lastName}` : "-"}
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
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
