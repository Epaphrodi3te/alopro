import Link from "next/link";
import { redirect } from "next/navigation";
import { FiArrowLeft, FiBriefcase, FiCalendar, FiClock, FiFileText, FiFolder, FiTarget, FiUser } from "react-icons/fi";

import TaskAssignmentWorkflowCard from "@/components/tasks/TaskAssignmentWorkflowCard";
import Badge from "@/components/ui/Badge";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { canUserViewTask } from "@/lib/task-visibility";

type TaskDetailsPageProps = {
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

function taskStatusBadge(status: "todo" | "in_progress" | "done") {
  if (status === "todo") {
    return <Badge label="todo" variant="pending" />;
  }

  if (status === "in_progress") {
    return <Badge label="in progress" variant="progress" />;
  }

  return <Badge label="done" variant="done" />;
}

export default async function TaskDetailsPage({ params }: TaskDetailsPageProps) {
  const current = await requireUser();
  const { id } = await params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      project: {
        select: {
          id: true,
          title: true,
          status: true,
          deadline: true,
          createdById: true,
          assignedToId: true,
          createdBy: {
            select: {
              role: true,
            },
          },
        },
      },
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
    },
  });

  if (!task) {
    redirect("/tasks");
  }

  const canViewTask = canUserViewTask(
    { id: current.id, role: current.role },
    {
      createdById: task.createdById,
      assignedToId: task.assignedToId,
      project: task.project
        ? {
            createdById: task.project.createdById,
            assignedToId: task.project.assignedToId,
            createdByRole: task.project.createdBy.role,
          }
        : null,
    },
  );

  if (!canViewTask) {
    redirect("/tasks");
  }

  const deadlineLabel = formatDate(task.deadline);
  const isAssignee = task.assignedToId === current.id;
  const canReviewDeadlineChange = current.role === "admin" || task.createdById === current.id;
  const deadlineChangeRequestedDateLabel = task.deadlineChangeRequestedDate ? formatDate(task.deadlineChangeRequestedDate) : "";
  const completedAtLabel = task.completedAt ? formatDate(task.completedAt) : "";
  const normalizedProgress = Math.max(0, Math.min(100, task.progressPercent));

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-[linear-gradient(145deg,#ffffff,#edf7ff)] p-6 shadow-sm">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-100/60 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <Link href="/tasks" className="app-btn-soft">
              <FiArrowLeft className="text-sm" />
              Retour taches
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Detail tache</p>
              <h1 className="mt-2 page-title text-slate-900">{task.title}</h1>
              <p className="page-subtitle">Suivi d&apos;execution, validation d&apos;assignation et compte rendu final.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {taskStatusBadge(task.status)}
            <Badge label={task.priority} variant={task.priority} />
            <Badge label={`${normalizedProgress}%`} variant="medium" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="app-card p-4">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.1em] text-slate-500">
            <FiTarget />
            Progression
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{normalizedProgress}%</p>
          <div className="mt-3 h-2 rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-slate-900" style={{ width: `${normalizedProgress}%` }} />
          </div>
        </article>

        <article className="app-card p-4">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.1em] text-slate-500">
            <FiCalendar />
            Date limite
          </p>
          <p className="mt-2 text-base font-semibold text-slate-900">{formatDate(task.deadline)}</p>
        </article>

        <article className="app-card p-4">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.1em] text-slate-500">
            <FiUser />
            Assignee
          </p>
          <p className="mt-2 text-base font-semibold text-slate-900">
            {task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : "Aucune assignation"}
          </p>
        </article>

        <article className="app-card p-4">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.1em] text-slate-500">
            <FiBriefcase />
            Commission
          </p>
          <p className="mt-2 text-base font-semibold text-slate-900">{formatCommission(task.commissionCfa)}</p>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.8fr_1fr]">
        <article className="app-card p-5">
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
            <FiFileText />
            Description
          </h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{task.description}</p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.1em] text-slate-500">
                <FiUser />
                Cree par
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                {task.createdBy.firstName} {task.createdBy.lastName}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.1em] text-slate-500">
                <FiClock />
                Terminee le
              </p>
              <p className="mt-1 font-semibold text-slate-900">{formatDate(task.completedAt)}</p>
            </div>
          </div>
        </article>

        <aside className="space-y-3">
          <div className="app-card p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Validation assignment</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge label={task.receivedAt ? "tache recue" : "reception en attente"} variant={task.receivedAt ? "done" : "pending"} />
              <Badge
                label={task.deadlineValidatedAt ? "date de fin validee" : "date non validee"}
                variant={task.deadlineValidatedAt ? "progress" : "pending"}
              />
            </div>
          </div>

          <div className="app-card p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Compte rendu</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge label={task.reportRequired ? "requis" : "non requis"} variant={task.reportRequired ? "high" : "medium"} />
              <Badge
                label={`demande date: ${task.deadlineChangeStatus}`}
                variant={
                  task.deadlineChangeStatus === "approved"
                    ? "done"
                    : task.deadlineChangeStatus === "rejected"
                      ? "high"
                      : "pending"
                }
              />
            </div>
          </div>

          <div className="app-card p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Etat progression</p>
            <div className="mt-2 h-2 rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-slate-900" style={{ width: `${normalizedProgress}%` }} />
            </div>
            <p className="mt-2 text-sm font-medium text-slate-700">{normalizedProgress}% realise</p>
          </div>
        </aside>
      </section>

      <TaskAssignmentWorkflowCard
        taskId={task.id}
        assignedToId={task.assignedToId}
        isAssignee={isAssignee}
        canReviewDeadlineChange={canReviewDeadlineChange}
        reportRequired={task.reportRequired}
        initialCompletionReport={task.completionReport}
        initialCompletedAtLabel={completedAtLabel}
        initialDeadlineChangeStatus={task.deadlineChangeStatus}
        initialDeadlineChangeRequestedDateLabel={deadlineChangeRequestedDateLabel}
        initialDeadlineChangeReason={task.deadlineChangeReason}
        initialReceived={Boolean(task.receivedAt)}
        initialDeadlineValidated={Boolean(task.deadlineValidatedAt)}
        initialProgressPercent={normalizedProgress}
        deadlineLabel={deadlineLabel}
      />

      <section className="app-card p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Projet rattache</h2>
          <FiFolder className="text-slate-500" />
        </div>
        {task.project ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <p className="font-semibold text-slate-900">{task.project.title}</p>
            <div className="mt-2">
              <Badge
                label={task.project.status === "in_progress" ? "in progress" : task.project.status}
                variant={task.project.status === "pending" ? "pending" : task.project.status === "in_progress" ? "progress" : "done"}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>Deadline projet: {formatDate(task.project.deadline)}</span>
              <Link href={`/projects/${task.project.id}`} className="font-semibold text-slate-700 hover:text-slate-900">
                Voir details projet
              </Link>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">Cette tache est actuellement sans projet.</p>
        )}
      </section>
    </div>
  );
}
