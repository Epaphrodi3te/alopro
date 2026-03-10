import Link from "next/link";
import { redirect } from "next/navigation";
import { FiArrowLeft, FiCalendar, FiClock, FiFlag, FiFolder, FiUser } from "react-icons/fi";

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

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-[linear-gradient(145deg,#ffffff,#eaf2ff_78%)] p-6 shadow-sm">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-200/70 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-[-5rem] h-44 w-44 rounded-full bg-sky-100/70 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <Link href="/tasks" className="app-btn-soft">
              <FiArrowLeft className="text-sm" />
              Retour taches
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Detail tache</p>
              <h1 className="mt-2 page-title text-slate-900">{task.title}</h1>
              <p className="page-subtitle">Consultez les informations completes, le contexte et le suivi de cette tache.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {taskStatusBadge(task.status)}
            <Badge label={task.priority} variant={task.priority} />
            <Badge label={`${task.progressPercent}%`} variant="medium" />
            <Badge label={task.receivedAt ? "recue" : "en attente"} variant={task.receivedAt ? "done" : "pending"} />
            <Badge
              label={task.deadlineValidatedAt ? "date validee" : "date non validee"}
              variant={task.deadlineValidatedAt ? "progress" : "pending"}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.9fr_1fr]">
        <article className="rounded-2xl border border-sky-100 bg-[linear-gradient(160deg,#ffffff,#f0f9ff)] p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Description</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{task.description}</p>
        </article>

        <aside className="space-y-3">
          <div className="rounded-2xl border border-amber-100 bg-[linear-gradient(160deg,#ffffff,#fffbeb)] p-4 shadow-sm">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-slate-500">
              <FiCalendar />
              Deadline
            </p>
            <p className="mt-2 text-xl font-bold text-slate-900">{formatDate(task.deadline)}</p>
          </div>
          <div className="rounded-2xl border border-violet-100 bg-[linear-gradient(160deg,#ffffff,#f5f3ff)] p-4 shadow-sm">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-slate-500">
              <FiUser />
              Cree par
            </p>
            <p className="mt-2 font-semibold text-slate-900">
              {task.createdBy.firstName} {task.createdBy.lastName}
            </p>
          </div>
          <div className="rounded-2xl border border-teal-100 bg-[linear-gradient(160deg,#ffffff,#f0fdfa)] p-4 shadow-sm">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-slate-500">
              <FiClock />
              Assignee a
            </p>
            <p className="mt-2 font-semibold text-slate-900">
              {task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : "Aucune assignation"}
            </p>
          </div>
        </aside>
      </section>

      <TaskAssignmentWorkflowCard
        taskId={task.id}
        assignedToId={task.assignedToId}
        isAssignee={isAssignee}
        initialReceived={Boolean(task.receivedAt)}
        initialDeadlineValidated={Boolean(task.deadlineValidatedAt)}
        initialProgressPercent={task.progressPercent}
        deadlineLabel={deadlineLabel}
      />

      <section className="grid gap-5 lg:grid-cols-3">
        <article className="rounded-2xl border border-rose-100 bg-[linear-gradient(160deg,#ffffff,#fff1f2)] p-4 shadow-sm">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.1em] text-slate-500">
            <FiFlag />
            Priorite
          </p>
          <div className="mt-2">
            <Badge label={task.priority} variant={task.priority} />
          </div>
        </article>
        <article className="rounded-2xl border border-indigo-100 bg-[linear-gradient(160deg,#ffffff,#eef2ff)] p-4 shadow-sm">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.1em] text-slate-500">
            <FiClock />
            Statut
          </p>
          <div className="mt-2">{taskStatusBadge(task.status)}</div>
        </article>
        <article className="rounded-2xl border border-cyan-100 bg-[linear-gradient(160deg,#ffffff,#ecfeff)] p-4 shadow-sm">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.1em] text-slate-500">
            <FiCalendar />
            Creee le
          </p>
          <p className="mt-2 font-semibold text-slate-900">{formatDate(task.createdAt)}</p>
        </article>
      </section>

      <section className="app-card p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Projet rattache</h2>
          <FiFolder className="text-slate-500" />
        </div>
        {task.project ? (
          <div className="mt-4 rounded-xl border border-sky-100 bg-[linear-gradient(160deg,#ffffff,#f0f9ff)] p-4">
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
