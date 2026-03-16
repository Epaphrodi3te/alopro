import Link from "next/link";
import { redirect } from "next/navigation";
import {
  FiArrowLeft,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiList,
  FiTrendingUp,
  FiUser,
  FiUsers,
} from "react-icons/fi";

import ProjectAssignmentWorkflowCard from "@/components/projects/ProjectAssignmentWorkflowCard";
import ProjectFileSubmissionCard from "@/components/projects/ProjectFileSubmissionCard";
import ProjectQuickHeaderCard from "@/components/projects/ProjectQuickHeaderCard";
import Badge from "@/components/ui/Badge";
import { requireUser } from "@/lib/auth";
import { canEditProject } from "@/lib/permissions";
import { canUserViewProject } from "@/lib/project-visibility";
import prisma from "@/lib/prisma";

type ProjectDetailsPageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(value: Date | null) {
  if (!value) {
    return "-";
  }

  return value.toLocaleDateString();
}

function formatCommission(value: number | null) {
  if (value === null || value === undefined) {
    return "Aucune";
  }

  return `${new Intl.NumberFormat("fr-FR").format(value)} FCFA`;
}

function progressBarColor(percent: number) {
  if (percent >= 100) return "bg-emerald-500";
  if (percent >= 60) return "bg-blue-500";
  if (percent >= 30) return "bg-indigo-500";
  return "bg-amber-500";
}

export default async function ProjectDetailsPage({ params }: ProjectDetailsPageProps) {
  const current = await requireUser();
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
      memberships: {
        select: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
      },
      tasks: {
        orderBy: { createdAt: "desc" },
        include: {
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      files: {
        orderBy: { createdAt: "desc" },
        include: {
          uploadedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  });

  if (!project) {
    redirect("/projects");
  }

  const canViewProject = canUserViewProject(
    { id: current.id, role: current.role },
    {
      createdById: project.createdById,
      assignedToId: project.assignedToId,
      assignedMemberIds: project.memberships.map((membership) => membership.user.id),
      createdByRole: project.createdBy.role,
    },
  );

  if (!canViewProject) {
    redirect("/projects");
  }

  const totalTasks = project.tasks.length;
  const averageTaskProgress =
    totalTasks === 0
      ? 0
      : Math.round(project.tasks.reduce((sum, task) => sum + Math.max(0, Math.min(100, task.progressPercent)), 0) / totalTasks);
  const doneTasks = project.tasks.filter((task) => task.status === "done" || task.progressPercent >= 100).length;
  const progressDerivedFromTasks = totalTasks > 0;
  const projectProgressPercent = progressDerivedFromTasks
    ? averageTaskProgress
    : Math.max(0, Math.min(100, project.progressPercent));
  const effectiveProjectStatus: "pending" | "in_progress" | "completed" = progressDerivedFromTasks
    ? projectProgressPercent >= 100
      ? "completed"
      : projectProgressPercent > 0
        ? "in_progress"
        : "pending"
    : project.status;
  const canEditProjectDetails = canEditProject(
    { id: current.id, role: current.role },
    { createdById: project.createdById },
  );
  const assignedMembers =
    project.memberships.length > 0
      ? project.memberships.map((membership) => membership.user)
      : project.assignedTo
        ? [project.assignedTo]
        : [];
  const isAssignee = assignedMembers.some((member) => member.id === current.id) || project.assignedToId === current.id;
  const canReviewDeadlineChange = current.role === "admin" || project.createdById === current.id;
  const canSubmitProjectFile =
    current.role === "admin" || project.createdById === current.id || assignedMembers.some((member) => member.id === current.id);
  const deadlineChangeRequestedDateLabel = project.deadlineChangeRequestedDate ? formatDate(project.deadlineChangeRequestedDate) : "";
  const completedAtLabel = project.completedAt ? formatDate(project.completedAt) : "";
  const projectDeadlineInputValue = project.deadline ? project.deadline.toISOString().slice(0, 10) : "";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/projects" className="app-btn-soft">
            <FiArrowLeft size={14} />
            Retour
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-slate-900 sm:text-xl">{project.title}</h1>
            <p className="text-xs text-slate-500">Cree le {formatDate(project.createdAt)}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            label={effectiveProjectStatus === "pending" ? "En attente" : effectiveProjectStatus === "in_progress" ? "En cours" : "Termine"}
            variant={effectiveProjectStatus === "pending" ? "pending" : effectiveProjectStatus === "in_progress" ? "progress" : "done"}
          />
          <Badge label={`${projectProgressPercent}%`} variant="medium" />
        </div>
      </div>

      <ProjectQuickHeaderCard
        projectId={project.id}
        projectTitle={project.title}
        canEdit={canEditProjectDetails}
        initialTitle={project.title}
        initialDescription={project.description}
        initialCommissionCfa={project.commissionCfa}
        initialDeadline={projectDeadlineInputValue}
        initialStatus={effectiveProjectStatus}
        tasks={project.tasks.map((task) => ({
          id: task.id,
          title: task.title,
          status: task.status,
          progressPercent: task.progressPercent,
          assignedToName: task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : null,
        }))}
      />

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <article className="app-card p-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <FiTrendingUp size={13} />
            </span>
            Progression
          </div>
          <p className="mt-2 text-xl font-bold text-slate-900">{projectProgressPercent}%</p>
          <div className="mt-2 h-1.5 rounded-full bg-slate-200">
            <div className={`h-full rounded-full ${progressBarColor(projectProgressPercent)}`} style={{ width: `${projectProgressPercent}%` }} />
          </div>
        </article>

        <article className="app-card p-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <FiList size={13} />
            </span>
            Taches
          </div>
          <p className="mt-2 text-xl font-bold text-slate-900">
            <span className="text-emerald-600">{doneTasks}</span>
            <span className="text-sm font-medium text-slate-400"> / {totalTasks}</span>
          </p>
        </article>

        <article className="app-card p-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <FiCalendar size={13} />
            </span>
            Deadline
          </div>
          <p className="mt-2 text-base font-semibold text-slate-900">{formatDate(project.deadline)}</p>
        </article>

        <article className="app-card p-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <FiBriefcase size={13} />
            </span>
            Commission
          </div>
          <p className="mt-2 text-base font-semibold text-slate-900">{formatCommission(project.commissionCfa)}</p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.75fr_1fr]">
        <article className="app-card p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <FiFileText size={16} className="text-slate-400" />
            Description
          </h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">{project.description}</p>

          <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-4 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <FiUser size={13} className="text-slate-400" />
              <span className="font-medium">{project.createdBy.firstName} {project.createdBy.lastName}</span>
              <span className="text-xs text-slate-400">createur</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <FiUsers size={13} className="text-slate-400" />
              <span className="font-medium">
                {assignedMembers.length > 0
                  ? assignedMembers.map((m) => `${m.firstName} ${m.lastName}`).join(", ")
                  : "Non assigne"}
              </span>
              <span className="text-xs text-slate-400">equipe</span>
            </div>
          </div>
        </article>

        <aside className="space-y-3">
          <div className="app-card p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Validation</p>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Reception</span>
                <Badge label={project.receivedAt ? "Recu" : "En attente"} variant={project.receivedAt ? "done" : "pending"} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Deadline</span>
                <Badge label={project.deadlineValidatedAt ? "Validee" : "Non validee"} variant={project.deadlineValidatedAt ? "done" : "pending"} />
              </div>
            </div>
          </div>

          <div className="app-card p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Compte rendu</p>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Rapport</span>
                <Badge label={project.reportRequired ? "Requis" : "Non requis"} variant={project.reportRequired ? "high" : "low"} />
              </div>
              {project.deadlineChangeStatus !== "none" && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Report deadline</span>
                  <Badge
                    label={project.deadlineChangeStatus === "approved" ? "Approuve" : project.deadlineChangeStatus === "rejected" ? "Rejete" : "En attente"}
                    variant={project.deadlineChangeStatus === "approved" ? "done" : project.deadlineChangeStatus === "rejected" ? "high" : "pending"}
                  />
                </div>
              )}
            </div>
          </div>
        </aside>
      </section>

      <section className="app-card p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <FiCheckCircle size={16} className="text-slate-400" />
            Taches ({totalTasks})
          </h2>
        </div>

        <div className="mt-4 space-y-2">
          {project.tasks.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">Aucune tache rattachee.</p>
          ) : (
            project.tasks.map((task) => {
              const taskProgress = Math.max(0, Math.min(100, task.progressPercent));
              const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== "done";

              return (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-slate-300"
                >
                  <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    task.status === "done" ? "bg-emerald-50 text-emerald-600" : task.status === "in_progress" ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-400"
                  }`}>
                    {task.status === "done" ? <FiCheckCircle size={14} /> : task.status === "in_progress" ? <FiClock size={14} /> : <FiList size={14} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-slate-900">{task.title}</p>
                      {isOverdue && <span className="shrink-0 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">RETARD</span>}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : "Non assigne"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="hidden w-20 sm:block">
                      <div className="h-1.5 rounded-full bg-slate-200">
                        <div className={`h-full rounded-full ${progressBarColor(taskProgress)}`} style={{ width: `${taskProgress}%` }} />
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">{taskProgress}%</span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </section>

      <ProjectAssignmentWorkflowCard
        projectId={project.id}
        assignedToId={project.assignedToId ?? assignedMembers[0]?.id ?? null}
        isAssignee={isAssignee}
        canReviewDeadlineChange={canReviewDeadlineChange}
        reportRequired={project.reportRequired}
        initialProgressPercent={projectProgressPercent}
        initialCompletionReport={project.completionReport}
        initialCompletedAtLabel={completedAtLabel}
        initialDeadlineChangeStatus={project.deadlineChangeStatus}
        initialDeadlineChangeRequestedDateLabel={deadlineChangeRequestedDateLabel}
        initialDeadlineChangeReason={project.deadlineChangeReason}
        initialReceived={Boolean(project.receivedAt)}
        initialDeadlineValidated={Boolean(project.deadlineValidatedAt)}
        deadlineLabel={formatDate(project.deadline)}
        progressDerivedFromTasks={progressDerivedFromTasks}
        linkedTasksCount={totalTasks}
      />

      <ProjectFileSubmissionCard
        projectId={project.id}
        canSubmit={canSubmitProjectFile}
        files={project.files.map((file) => ({
          id: file.id,
          displayName: file.displayName,
          sizeBytes: file.sizeBytes,
          createdAtLabel: formatDate(file.createdAt),
          uploadedByName: `${file.uploadedBy.firstName} ${file.uploadedBy.lastName}`,
        }))}
      />
    </div>
  );
}
