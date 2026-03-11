import Link from "next/link";
import { redirect } from "next/navigation";
import { FiArrowLeft, FiBriefcase, FiCalendar, FiCheckCircle, FiFileText, FiList, FiTrendingUp, FiUser, FiUsers } from "react-icons/fi";

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

function projectStatusBadge(status: "pending" | "in_progress" | "completed") {
  if (status === "pending") {
    return <Badge label="pending" variant="pending" />;
  }

  if (status === "in_progress") {
    return <Badge label="in progress" variant="progress" />;
  }

  return <Badge label="completed" variant="done" />;
}

function taskStatusBadge(status: "todo" | "in_progress" | "done") {
  if (status === "todo") {
    return <Badge label="todo" variant="pending" />;
  }

  if (status === "in_progress") {
    return <Badge label="in progress" variant="progress" />;
  }

  return <Badge label="done" variant="done" />;
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
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-[linear-gradient(145deg,#ffffff,#eef4ff)] p-6 shadow-sm">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-blue-100/60 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <Link href="/projects" className="app-btn-soft">
              <FiArrowLeft className="text-sm" />
              Retour projets
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Detail projet</p>
              <h1 className="mt-2 page-title text-slate-900">{project.title}</h1>
              <p className="page-subtitle">Suivi d&apos;execution, validation d&apos;assignation et progression en temps reel.</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {projectStatusBadge(effectiveProjectStatus)}
              <Badge label={`${projectProgressPercent}%`} variant="medium" />
              <Badge
                label={progressDerivedFromTasks ? "progression liee aux taches" : "progression projet manuelle"}
                variant={progressDerivedFromTasks ? "progress" : "medium"}
              />
            </div>
            <p className="text-xs text-slate-500">Cree le {formatDate(project.createdAt)}</p>
          </div>
        </div>
      </section>

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

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
        <article className="app-card p-4">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.1em] text-slate-500">
            <FiTrendingUp />
            Progression
          </p>
          <p className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">{projectProgressPercent}%</p>
          <div className="mt-3 h-2 rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-slate-900" style={{ width: `${projectProgressPercent}%` }} />
          </div>
        </article>

        <article className="app-card p-4">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.1em] text-slate-500">
            <FiList />
            Taches rattachees
          </p>
          <p className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">{totalTasks}</p>
        </article>

        <article className="app-card p-4">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.1em] text-slate-500">
            <FiCheckCircle />
            Taches finalisees
          </p>
          <p className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">{doneTasks}</p>
        </article>

        <article className="app-card p-4">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.1em] text-slate-500">
            <FiCalendar />
            Date limite
          </p>
          <p className="mt-2 text-base font-semibold text-slate-900">{formatDate(project.deadline)}</p>
        </article>

        <article className="app-card p-4">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.1em] text-slate-500">
            <FiBriefcase />
            Commission
          </p>
          <p className="mt-2 text-base font-semibold text-slate-900">{formatCommission(project.commissionCfa)}</p>
        </article>
      </section>

      <section id="project-details" className="grid gap-5 xl:grid-cols-[1.75fr_1fr]">
        <article className="app-card p-5">
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
            <FiFileText />
            Description
          </h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{project.description}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.1em] text-slate-500">
                <FiUser />
                Cree par
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {project.createdBy.firstName} {project.createdBy.lastName}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.1em] text-slate-500">
                <FiUsers />
                Equipe assignee
              </p>
              <p className="mt-1 font-semibold text-slate-900">{assignedMembers.length} personne{assignedMembers.length > 1 ? "s" : ""}</p>
              <p className="mt-1 text-xs text-slate-500">
                {assignedMembers.length > 0
                  ? assignedMembers.map((member) => `${member.firstName} ${member.lastName}`).join(", ")
                  : "Aucune assignation"}
              </p>
            </div>
          </div>
        </article>

        <aside className="space-y-3">
          <div className="app-card p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Validation assignment</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge label={project.receivedAt ? "projet recu" : "reception en attente"} variant={project.receivedAt ? "done" : "pending"} />
              <Badge
                label={project.deadlineValidatedAt ? "date de fin validee" : "date non validee"}
                variant={project.deadlineValidatedAt ? "progress" : "pending"}
              />
            </div>
          </div>

          <div className="app-card p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Compte rendu</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge label={project.reportRequired ? "requis" : "non requis"} variant={project.reportRequired ? "high" : "medium"} />
              <Badge
                label={`demande date: ${project.deadlineChangeStatus}`}
                variant={
                  project.deadlineChangeStatus === "approved"
                    ? "done"
                    : project.deadlineChangeStatus === "rejected"
                      ? "high"
                      : "pending"
                }
              />
            </div>
          </div>

          <div className="app-card p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Origine progression</p>
            <p className="mt-2 text-sm font-medium text-slate-700">
              {progressDerivedFromTasks
                ? "La progression est automatiquement calculee a partir des taches liees."
                : "La progression est mise a jour directement au niveau du projet."}
            </p>
          </div>
        </aside>
      </section>

      <section className="app-card p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Taches de ce projet</h2>
          <Badge label={`${totalTasks} tache${totalTasks > 1 ? "s" : ""}`} variant="medium" />
        </div>

        <div className="mt-4 space-y-3">
          {project.tasks.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune tache rattachee a ce projet.</p>
          ) : (
            project.tasks.map((task) => {
              const taskProgress = Math.max(0, Math.min(100, task.progressPercent));

              return (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="block rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{task.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Assigne: {task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : "-"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {taskStatusBadge(task.status)}
                      <Badge label={`${taskProgress}%`} variant="medium" />
                    </div>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-slate-900" style={{ width: `${taskProgress}%` }} />
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
