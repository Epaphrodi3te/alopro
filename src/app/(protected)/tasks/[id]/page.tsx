import Link from "next/link";
import { redirect } from "next/navigation";
import {
  FiArrowLeft,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiFolder,
  FiTarget,
  FiUser,
} from "react-icons/fi";

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

function progressBarColor(percent: number) {
  if (percent >= 100) return "bg-emerald-500";
  if (percent >= 60) return "bg-blue-500";
  if (percent >= 30) return "bg-indigo-500";
  return "bg-amber-500";
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
          memberships: {
            select: {
              userId: true,
            },
          },
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
            assignedMemberIds: task.project.memberships.map((member) => member.userId),
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
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== "done";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/tasks" className="app-btn-soft">
            <FiArrowLeft size={14} />
            Retour
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-slate-900 sm:text-xl">{task.title}</h1>
            <p className="text-xs text-slate-500">
              Cree par {task.createdBy.firstName} {task.createdBy.lastName}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            label={task.status === "todo" ? "A faire" : task.status === "in_progress" ? "En cours" : "Termine"}
            variant={task.status === "todo" ? "pending" : task.status === "in_progress" ? "progress" : "done"}
          />
          <Badge label={task.priority} variant={task.priority} />
          {isOverdue && <span className="rounded-md bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">EN RETARD</span>}
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <article className="app-card p-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <FiTarget size={13} />
            </span>
            Progression
          </div>
          <p className="mt-2 text-xl font-bold text-slate-900">{normalizedProgress}%</p>
          <div className="mt-2 h-1.5 rounded-full bg-slate-200">
            <div className={`h-full rounded-full ${progressBarColor(normalizedProgress)}`} style={{ width: `${normalizedProgress}%` }} />
          </div>
        </article>

        <article className="app-card p-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <FiCalendar size={13} />
            </span>
            Deadline
          </div>
          <p className="mt-2 text-base font-semibold text-slate-900">{formatDate(task.deadline)}</p>
          {task.completedAt && <p className="mt-1 text-xs text-emerald-600">Termine le {formatDate(task.completedAt)}</p>}
        </article>

        <article className="app-card p-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <FiUser size={13} />
            </span>
            Assignee
          </div>
          <p className="mt-2 text-base font-semibold text-slate-900">
            {task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : "Non assigne"}
          </p>
        </article>

        <article className="app-card p-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <FiBriefcase size={13} />
            </span>
            Commission
          </div>
          <p className="mt-2 text-base font-semibold text-slate-900">{formatCommission(task.commissionCfa)}</p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.8fr_1fr]">
        <article className="app-card p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <FiFileText size={16} className="text-slate-400" />
            Description
          </h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">{task.description}</p>
        </article>

        <aside className="space-y-3">
          <div className="app-card p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Validation</p>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Reception</span>
                <Badge label={task.receivedAt ? "Recu" : "En attente"} variant={task.receivedAt ? "done" : "pending"} />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Deadline</span>
                <Badge label={task.deadlineValidatedAt ? "Validee" : "Non validee"} variant={task.deadlineValidatedAt ? "done" : "pending"} />
              </div>
            </div>
          </div>

          <div className="app-card p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Compte rendu</p>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Rapport</span>
                <Badge label={task.reportRequired ? "Requis" : "Non requis"} variant={task.reportRequired ? "high" : "low"} />
              </div>
              {task.deadlineChangeStatus !== "none" && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Report deadline</span>
                  <Badge
                    label={task.deadlineChangeStatus === "approved" ? "Approuve" : task.deadlineChangeStatus === "rejected" ? "Rejete" : "En attente"}
                    variant={task.deadlineChangeStatus === "approved" ? "done" : task.deadlineChangeStatus === "rejected" ? "high" : "pending"}
                  />
                </div>
              )}
            </div>
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

      {task.project && (
        <section className="app-card p-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <FiFolder size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{task.project.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <Badge
                  label={task.project.status === "pending" ? "En attente" : task.project.status === "in_progress" ? "En cours" : "Termine"}
                  variant={task.project.status === "pending" ? "pending" : task.project.status === "in_progress" ? "progress" : "done"}
                />
                {task.project.deadline && (
                  <span className="flex items-center gap-1">
                    <FiClock size={11} />
                    {formatDate(task.project.deadline)}
                  </span>
                )}
              </div>
            </div>
            <Link href={`/projects/${task.project.id}`} className="app-btn-soft text-xs">
              Voir projet
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
