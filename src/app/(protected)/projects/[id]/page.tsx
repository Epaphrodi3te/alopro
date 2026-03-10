import Link from "next/link";
import { redirect } from "next/navigation";
import { FiArrowLeft, FiCalendar, FiCheckSquare, FiClock, FiFolder, FiUser } from "react-icons/fi";

import Badge from "@/components/ui/Badge";
import { requireUser } from "@/lib/auth";
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

function taskItemSurface(status: "todo" | "in_progress" | "done") {
  if (status === "todo") {
    return "border-l-4 border-l-amber-400 bg-[linear-gradient(155deg,#ffffff,#fffbeb)]";
  }

  if (status === "in_progress") {
    return "border-l-4 border-l-sky-400 bg-[linear-gradient(155deg,#ffffff,#eff6ff)]";
  }

  return "border-l-4 border-l-emerald-400 bg-[linear-gradient(155deg,#ffffff,#ecfdf5)]";
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
      createdByRole: project.createdBy.role,
    },
  );

  if (!canViewProject) {
    redirect("/projects");
  }

  const totalTasks = project.tasks.length;
  const doneTasks = project.tasks.filter((task) => task.status === "done").length;
  const progressPercent = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-sky-100 bg-[linear-gradient(145deg,#ffffff,#ecfeff_78%)] p-6 shadow-sm">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-100 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <Link href="/projects" className="app-btn-soft">
              <FiArrowLeft className="text-sm" />
              Retour projets
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Detail projet</p>
              <h1 className="mt-2 page-title text-slate-900">{project.title}</h1>
              <p className="page-subtitle">Vue detaillee du projet, de son avancement et des taches associees.</p>
            </div>
          </div>
          <div className="space-y-2">
            {projectStatusBadge(project.status)}
            <p className="text-xs text-slate-500">Cree le {formatDate(project.createdAt)}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.9fr_1fr]">
        <article className="rounded-2xl border border-cyan-100 bg-[linear-gradient(160deg,#ffffff,#ecfeff)] p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Description</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">{project.description}</p>
        </article>

        <aside className="space-y-3">
          <div className="rounded-2xl border border-indigo-100 bg-[linear-gradient(160deg,#ffffff,#eef2ff)] p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Taches</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{totalTasks}</p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-[linear-gradient(160deg,#ffffff,#ecfdf5)] p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Taches terminees</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{doneTasks}</p>
          </div>
          <div className="rounded-2xl border border-sky-100 bg-[linear-gradient(160deg,#ffffff,#eff6ff)] p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Progression</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{progressPercent}%</p>
            <div className="mt-3 h-2 rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-slate-800" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </aside>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <article className="rounded-2xl border border-amber-100 bg-[linear-gradient(160deg,#ffffff,#fffbeb)] p-4 shadow-sm">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.1em] text-slate-500">
            <FiCalendar />
            Date limite
          </p>
          <p className="mt-2 font-semibold text-slate-900">{formatDate(project.deadline)}</p>
        </article>
        <article className="rounded-2xl border border-violet-100 bg-[linear-gradient(160deg,#ffffff,#f5f3ff)] p-4 shadow-sm">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.1em] text-slate-500">
            <FiUser />
            Cree par
          </p>
          <p className="mt-2 font-semibold text-slate-900">
            {project.createdBy.firstName} {project.createdBy.lastName}
          </p>
        </article>
        <article className="rounded-2xl border border-teal-100 bg-[linear-gradient(160deg,#ffffff,#f0fdfa)] p-4 shadow-sm">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.1em] text-slate-500">
            <FiClock />
            Assigne a
          </p>
          <p className="mt-2 font-semibold text-slate-900">
            {project.assignedTo ? `${project.assignedTo.firstName} ${project.assignedTo.lastName}` : "Aucune assignation"}
          </p>
        </article>
      </section>

      <section className="app-card p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Taches du projet</h2>
          <FiCheckSquare className="text-slate-500" />
        </div>
        <div className="mt-4 space-y-3">
          {project.tasks.length === 0 && <p className="text-sm text-slate-500">Aucune tache rattachee a ce projet.</p>}
          {project.tasks.map((task) => (
            <div key={task.id} className={`rounded-xl border border-slate-200 p-3.5 ${taskItemSurface(task.status)}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{task.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{task.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {taskStatusBadge(task.status)}
                  <Badge label={task.priority} variant={task.priority} />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>Deadline: {formatDate(task.deadline)}</span>
                <span>
                  Assignee: {task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : "-"}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Badge label={task.receivedAt ? "recue" : "en attente"} variant={task.receivedAt ? "done" : "pending"} />
                  <Badge
                    label={task.deadlineValidatedAt ? "date validee" : "date non validee"}
                    variant={task.deadlineValidatedAt ? "progress" : "pending"}
                  />
                  <Badge label={`${task.progressPercent}%`} variant="medium" />
                </span>
                <Link href={`/tasks/${task.id}`} className="inline-flex items-center gap-1 font-semibold text-slate-700 hover:text-slate-900">
                  <FiFolder className="text-[11px]" />
                  Voir details
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
