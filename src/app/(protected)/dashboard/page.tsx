import Link from "next/link";
import { Prisma } from "@prisma/client";
import {
  FiArrowRight,
  FiBriefcase,
  FiCalendar,
  FiCheckSquare,
  FiClipboard,
  FiFolder,
  FiMail,
  FiPlus,
  FiTarget,
  FiUser,
  FiUserCheck,
} from "react-icons/fi";

import StatCard from "@/components/cards/StatCard";
import { requireUser } from "@/lib/auth";
import { getProjectVisibilityWhereForUser } from "@/lib/project-visibility";
import { getTaskVisibilityWhereForUser } from "@/lib/task-visibility";
import prisma from "@/lib/prisma";

function statusChip(label: string, tone: "slate" | "sky" | "emerald" | "amber" = "slate") {
  const toneClass =
    tone === "sky"
      ? "border-sky-200 bg-sky-50 text-sky-700"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : tone === "amber"
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-slate-300 bg-slate-50 text-slate-700";

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${toneClass}`}>
      {label}
    </span>
  );
}

function projectStatusBadge(status: "pending" | "in_progress" | "completed") {
  if (status === "pending") {
    return statusChip("pending", "amber");
  }

  if (status === "in_progress") {
    return statusChip("in progress", "sky");
  }

  return statusChip("completed", "emerald");
}

function taskStatusBadge(status: "todo" | "in_progress" | "done") {
  if (status === "todo") {
    return statusChip("todo", "amber");
  }

  if (status === "in_progress") {
    return statusChip("in progress", "sky");
  }

  return statusChip("done", "emerald");
}

function projectSurface(status: "pending" | "in_progress" | "completed") {
  if (status === "pending") {
    return "border-l-4 border-l-amber-400 bg-[linear-gradient(160deg,#ffffff,#fffaf0)]";
  }

  if (status === "in_progress") {
    return "border-l-4 border-l-sky-400 bg-[linear-gradient(160deg,#ffffff,#f0f9ff)]";
  }

  return "border-l-4 border-l-emerald-400 bg-[linear-gradient(160deg,#ffffff,#f0fdf4)]";
}

function taskSurface(status: "todo" | "in_progress" | "done") {
  if (status === "todo") {
    return "border-l-4 border-l-amber-400 bg-[linear-gradient(155deg,#ffffff,#fffbeb)]";
  }

  if (status === "in_progress") {
    return "border-l-4 border-l-sky-400 bg-[linear-gradient(155deg,#ffffff,#f0f9ff)]";
  }

  return "border-l-4 border-l-emerald-400 bg-[linear-gradient(155deg,#ffffff,#f0fdf4)]";
}

function mergeProjectWhere(base: Prisma.ProjectWhereInput, extra: Prisma.ProjectWhereInput): Prisma.ProjectWhereInput {
  if (Object.keys(base).length === 0) {
    return extra;
  }

  return { AND: [base, extra] };
}

function mergeTaskWhere(base: Prisma.TaskWhereInput, extra: Prisma.TaskWhereInput): Prisma.TaskWhereInput {
  if (Object.keys(base).length === 0) {
    return extra;
  }

  return { AND: [base, extra] };
}

export default async function DashboardPage() {
  const user = await requireUser();

  const projectWhere: Prisma.ProjectWhereInput = getProjectVisibilityWhereForUser({
    id: user.id,
    role: user.role,
  });
  const taskWhere: Prisma.TaskWhereInput = getTaskVisibilityWhereForUser({
    id: user.id,
    role: user.role,
  });

  const now = new Date();
  const inSevenDays = new Date(now);
  inSevenDays.setDate(now.getDate() + 7);

  const [projectCount, taskCount, messageCount, imminentProjects, imminentTasks, userCount, dueSoonProjects, overdueTasks] = await Promise.all([
    prisma.project.count({ where: projectWhere }),
    prisma.task.count({ where: taskWhere }),
    prisma.message.count({
      where: {
        OR: [{ senderId: user.id }, { receiverId: user.id }],
      },
    }),
    prisma.project.findMany({
      where: mergeProjectWhere(projectWhere, {
        deadline: { not: null },
        status: { not: "completed" },
      }),
      orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
      take: 3,
      include: {
        tasks: {
          select: {
            status: true,
          },
        },
        assignedTo: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
    prisma.task.findMany({
      where: mergeTaskWhere(taskWhere, {
        deadline: { not: null },
        status: { not: "done" },
      }),
      orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
      take: 3,
      include: {
        project: {
          select: {
            title: true,
          },
        },
        assignedTo: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
    user.role === "admin" ? prisma.user.count() : Promise.resolve(0),
    prisma.project.count({
      where: mergeProjectWhere(projectWhere, {
        deadline: { gte: now, lte: inSevenDays },
        status: { not: "completed" },
      }),
    }),
    prisma.task.count({
      where: mergeTaskWhere(taskWhere, {
        deadline: { lt: now },
        status: { not: "done" },
      }),
    }),
  ]);

  const quickActions = [
    { href: "/projects/new", label: "Nouveau projet" },
    { href: "/tasks/new", label: "Nouvelle tache" },
    ...(user.role === "admin" ? [{ href: "/users/new", label: "Nouvel utilisateur" }] : []),
  ];

  const roleLabel =
    user.role === "admin" ? "Espace administration" : user.role === "manager" ? "Espace management" : "Espace agent";

  return (
    <div className="space-y-7">
      <section className="relative overflow-hidden rounded-3xl border border-sky-100 bg-[linear-gradient(145deg,#ffffff,#eef6ff_76%)] p-4 shadow-sm sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-sky-100 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-[-3rem] h-52 w-52 rounded-full bg-indigo-100/70 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 sm:block">{roleLabel}</p>
            <h1 className="mt-2 hidden page-title text-slate-900 sm:block">Dashboard</h1>
            <p className="hidden page-subtitle sm:block">
              Pilotez vos priorites avec une vue claire des projets, taches et messages.
            </p>
            <div className="mt-4 hidden flex-wrap gap-2 sm:flex">
              <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                Projets proches de l&apos;echeance (7 jours): {dueSoonProjects}
              </span>
              <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                Taches en retard: {overdueTasks}
              </span>
            </div>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href} className="app-btn-outline flex-1 sm:flex-none">
                <FiPlus className="text-sm" />
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Projets visibles" value={projectCount} icon={FiBriefcase} accent="indigo" />
        <StatCard label="Taches visibles" value={taskCount} icon={FiClipboard} accent="emerald" />
        <StatCard label="Messages" value={messageCount} icon={FiMail} accent="amber" />
        {user.role === "admin" && <StatCard label="Utilisateurs" value={userCount} icon={FiUserCheck} accent="violet" />}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="app-card p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
                <FiFolder className="text-base" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Focus portefeuille</p>
                <h2 className="text-lg font-semibold text-slate-900">Projets imminents</h2>
              </div>
            </div>
            <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-700">
              {imminentProjects.length}
            </span>
          </div>
          <div className="relative mt-4 space-y-3">
            {imminentProjects.length === 0 && <p className="text-sm text-slate-500">Aucun projet imminent.</p>}
            {imminentProjects.map((project) => {
              const totalTasks = project.tasks.length;
              const doneTasks = project.tasks.filter((task) => task.status === "done").length;
              const progressPercent = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

              return (
                <div key={project.id} className={`rounded-xl border border-slate-200 p-3.5 shadow-sm ${projectSurface(project.status)}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{project.title}</p>
                    {projectStatusBadge(project.status)}
                  </div>
                  <p className="mt-1 text-sm text-slate-600 line-clamp-2">{project.description}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <FiCalendar className="text-[11px]" />
                      Echeance: {project.deadline ? new Date(project.deadline).toLocaleDateString() : "-"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <FiUser className="text-[11px]" />
                      Assigne a: {project.assignedTo ? `${project.assignedTo.firstName} ${project.assignedTo.lastName}` : "-"}
                    </span>
                  </div>
                  <div className="mt-3 rounded-lg border border-slate-200/80 bg-white/75 px-3 py-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <FiTarget className="text-[11px]" />
                        Progression
                      </span>
                      <span>{progressPercent}%</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <Link href={`/projects/${project.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900">
                      Voir details
                      <FiArrowRight className="text-xs" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="app-card p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600">
                <FiCheckSquare className="text-base" />
              </span>
              <h2 className="text-lg font-semibold text-slate-900">Taches imminentes</h2>
            </div>
            <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-700">
              {imminentTasks.length}
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {imminentTasks.length === 0 && <p className="text-sm text-slate-500">Aucune tache imminente.</p>}
            {imminentTasks.map((task) => (
              <div key={task.id} className={`rounded-xl border border-slate-200 p-3.5 ${taskSurface(task.status)}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">{task.title}</p>
                  {taskStatusBadge(task.status)}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <FiFolder className="text-[11px]" />
                    Projet: {task.project ? task.project.title : "Sans projet"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FiUser className="text-[11px]" />
                    Assignee a: {task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : "-"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FiCalendar className="text-[11px]" />
                    Deadline: {task.deadline ? new Date(task.deadline).toLocaleDateString() : "-"}
                  </span>
                </div>
                <div className="mt-3">
                  <Link href={`/tasks/${task.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900">
                    Voir details
                    <FiArrowRight className="text-xs" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
