import Link from "next/link";
import { Prisma } from "@prisma/client";
import {
  FiArrowRight,
  FiBarChart2,
  FiBriefcase,
  FiCalendar,
  FiCheckSquare,
  FiClock,
  FiClipboard,
  FiFlag,
  FiFolder,
  FiLayers,
  FiMail,
  FiPlus,
  FiTrendingUp,
  FiUser,
  FiUserCheck,
  FiUsers,
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
          : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold capitalize ${toneClass}`}>
      {label}
    </span>
  );
}

function projectStatusBadge(status: "pending" | "in_progress" | "completed") {
  if (status === "pending") return statusChip("en attente", "amber");
  if (status === "in_progress") return statusChip("en cours", "sky");
  return statusChip("termine", "emerald");
}

function taskStatusBadge(status: "todo" | "in_progress" | "done") {
  if (status === "todo") return statusChip("a faire", "amber");
  if (status === "in_progress") return statusChip("en cours", "sky");
  return statusChip("termine", "emerald");
}

function mergeProjectWhere(base: Prisma.ProjectWhereInput, extra: Prisma.ProjectWhereInput): Prisma.ProjectWhereInput {
  if (Object.keys(base).length === 0) return extra;
  return { AND: [base, extra] };
}

function mergeTaskWhere(base: Prisma.TaskWhereInput, extra: Prisma.TaskWhereInput): Prisma.TaskWhereInput {
  if (Object.keys(base).length === 0) return extra;
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
        tasks: { select: { status: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
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
        project: { select: { title: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
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
    { href: "/projects/new", label: "Projet" },
    { href: "/tasks/new", label: "Tache" },
    ...(user.role === "admin" ? [{ href: "/users/new", label: "Utilisateur" }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Quick actions + alerts */}
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href} className="app-btn-outline text-xs">
              <FiPlus size={14} />
              {action.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {dueSoonProjects > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
              <FiCalendar size={12} />
              {dueSoonProjects} projet{dueSoonProjects > 1 ? "s" : ""} echeance 7j
            </span>
          )}
          {overdueTasks > 0 && (
            <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700">
              <FiCheckSquare size={12} />
              {overdueTasks} tache{overdueTasks > 1 ? "s" : ""} en retard
            </span>
          )}
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Projets" value={projectCount} icon={FiBriefcase} accent="indigo" />
        <StatCard label="Taches" value={taskCount} icon={FiClipboard} accent="emerald" />
        <StatCard label="Messages" value={messageCount} icon={FiMail} accent="amber" />
        {user.role === "admin" && <StatCard label="Utilisateurs" value={userCount} icon={FiUserCheck} accent="violet" />}
      </section>

      {/* Projects & Tasks */}
      <section className="grid gap-5 lg:grid-cols-2">
        {/* Imminent projects */}
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <FiFolder size={16} />
              </span>
              <h2 className="text-sm font-semibold text-slate-900">Projets imminents</h2>
            </div>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {imminentProjects.length}
            </span>
          </div>

          <div className="mt-4 space-y-2.5">
            {imminentProjects.length === 0 && <p className="py-4 text-center text-sm text-slate-400">Aucun projet imminent.</p>}
            {imminentProjects.map((project) => {
              const totalTasks = project.tasks.length;
              const doneTasks = project.tasks.filter((task) => task.status === "done").length;
              const progressPercent = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);

              return (
                <div key={project.id} className="rounded-lg border border-slate-200 p-3.5 transition-colors hover:border-indigo-200">
                  {/* Title + status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
                        <FiBriefcase size={14} />
                      </span>
                      <p className="text-sm font-semibold text-slate-900">{project.title}</p>
                    </div>
                    {projectStatusBadge(project.status)}
                  </div>

                  {/* Meta info with icons */}
                  <div className="ml-[2.375rem] mt-2 space-y-1.5">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                        <FiClock size={12} className="text-amber-500" />
                        {project.deadline ? new Date(project.deadline).toLocaleDateString() : "Pas de deadline"}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                        <FiUser size={12} className="text-blue-500" />
                        {project.assignedTo ? `${project.assignedTo.firstName} ${project.assignedTo.lastName}` : "Non assigne"}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                        <FiLayers size={12} className="text-violet-500" />
                        {totalTasks} tache{totalTasks > 1 ? "s" : ""} ({doneTasks} terminee{doneTasks > 1 ? "s" : ""})
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="flex items-center gap-2.5">
                      <FiTrendingUp size={12} className="shrink-0 text-emerald-500" />
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full transition-all ${progressPercent >= 75 ? "bg-emerald-500" : progressPercent >= 40 ? "bg-blue-500" : "bg-indigo-500"}`}
                          style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
                        />
                      </div>
                      <span className="min-w-[2rem] text-right text-xs font-semibold text-slate-600">{progressPercent}%</span>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="ml-[2.375rem] mt-2.5">
                    <Link href={`/projects/${project.id}`} className="inline-flex items-center gap-1 rounded-md text-xs font-medium text-indigo-600 hover:text-indigo-800">
                      Voir le projet <FiArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        {/* Imminent tasks */}
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <FiCheckSquare size={16} />
              </span>
              <h2 className="text-sm font-semibold text-slate-900">Taches imminentes</h2>
            </div>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              {imminentTasks.length}
            </span>
          </div>

          <div className="mt-4 space-y-2.5">
            {imminentTasks.length === 0 && <p className="py-4 text-center text-sm text-slate-400">Aucune tache imminente.</p>}
            {imminentTasks.map((task) => {
              const isOverdue = task.deadline && new Date(task.deadline) < new Date();

              return (
                <div key={task.id} className="rounded-lg border border-slate-200 p-3.5 transition-colors hover:border-emerald-200">
                  {/* Title + status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <span className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                        task.status === "done" ? "bg-emerald-50 text-emerald-500" : task.status === "in_progress" ? "bg-blue-50 text-blue-500" : "bg-amber-50 text-amber-500"
                      }`}>
                        {task.status === "done" ? <FiCheckSquare size={14} /> : task.status === "in_progress" ? <FiBarChart2 size={14} /> : <FiFlag size={14} />}
                      </span>
                      <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                    </div>
                    {taskStatusBadge(task.status)}
                  </div>

                  {/* Meta info with colored icons */}
                  <div className="ml-[2.375rem] mt-2 space-y-1">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                        <FiFolder size={12} className="text-violet-500" />
                        {task.project ? task.project.title : "Independante"}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                        <FiUsers size={12} className="text-blue-500" />
                        {task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : "Non assignee"}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 text-xs ${isOverdue ? "font-semibold text-rose-600" : "text-slate-500"}`}>
                        <FiClock size={12} className={isOverdue ? "text-rose-500" : "text-amber-500"} />
                        {task.deadline ? new Date(task.deadline).toLocaleDateString() : "Pas de deadline"}
                        {isOverdue && <span className="rounded bg-rose-50 px-1 py-0.5 text-[10px] font-bold text-rose-600">EN RETARD</span>}
                      </span>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="ml-[2.375rem] mt-2.5">
                    <Link href={`/tasks/${task.id}`} className="inline-flex items-center gap-1 rounded-md text-xs font-medium text-emerald-600 hover:text-emerald-800">
                      Voir la tache <FiArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </section>
    </div>
  );
}
