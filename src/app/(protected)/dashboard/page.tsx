import { Prisma } from "@prisma/client";
import { FiCheckSquare, FiFolder, FiMessageSquare, FiUsers } from "react-icons/fi";

import StatCard from "@/components/cards/StatCard";
import Badge from "@/components/ui/Badge";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

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

export default async function DashboardPage() {
  const user = await requireUser();

  let projectWhere: Prisma.ProjectWhereInput = {};
  let taskWhere: Prisma.TaskWhereInput = {};

  if (user.role === "manager") {
    projectWhere = {
      OR: [{ createdById: user.id }, { assignedToId: user.id }],
    };

    taskWhere = {
      OR: [
        { createdById: user.id },
        { assignedToId: user.id },
        { project: { createdById: user.id } },
        { project: { assignedToId: user.id } },
      ],
    };
  }

  if (user.role === "agent") {
    projectWhere = { assignedToId: user.id };
    taskWhere = { assignedToId: user.id };
  }

  const [projectCount, taskCount, messageCount, recentProjects, recentTasks, userCount] = await Promise.all([
    prisma.project.count({ where: projectWhere }),
    prisma.task.count({ where: taskWhere }),
    prisma.message.count({
      where: {
        OR: [{ senderId: user.id }, { receiverId: user.id }],
      },
    }),
    prisma.project.findMany({
      where: projectWhere,
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        assignedTo: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
    prisma.task.findMany({
      where: taskWhere,
      orderBy: { createdAt: "desc" },
      take: 5,
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
  ]);

  return (
    <div className="space-y-7">
      <section>
        <h1 className="page-title text-slate-900">Dashboard</h1>
        <p className="page-subtitle">
          Vue d&apos;ensemble de votre activite en temps reel.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Projets visibles" value={projectCount} accent="blue" icon={FiFolder} />
        <StatCard label="Taches visibles" value={taskCount} accent="emerald" icon={FiCheckSquare} />
        <StatCard label="Messages" value={messageCount} accent="amber" icon={FiMessageSquare} />
        {user.role === "admin" && <StatCard label="Utilisateurs" value={userCount} accent="slate" icon={FiUsers} />}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="app-card p-5">
          <h2 className="text-lg font-semibold text-slate-900">Projets recents</h2>
          <div className="mt-4 space-y-3">
            {recentProjects.length === 0 && <p className="text-sm text-slate-500">Aucun projet pour le moment.</p>}
            {recentProjects.map((project) => (
              <div key={project.id} className="rounded-xl border border-slate-200/90 bg-slate-50/45 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">{project.title}</p>
                  {projectStatusBadge(project.status)}
                </div>
                <p className="mt-1 text-sm text-slate-600 line-clamp-2">{project.description}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Assigne a: {project.assignedTo ? `${project.assignedTo.firstName} ${project.assignedTo.lastName}` : "-"}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="app-card p-5">
          <h2 className="text-lg font-semibold text-slate-900">Taches recentes</h2>
          <div className="mt-4 space-y-3">
            {recentTasks.length === 0 && <p className="text-sm text-slate-500">Aucune tache pour le moment.</p>}
            {recentTasks.map((task) => (
              <div key={task.id} className="rounded-xl border border-slate-200/90 bg-slate-50/45 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">{task.title}</p>
                  {taskStatusBadge(task.status)}
                </div>
                <p className="mt-1 text-sm text-slate-600">Projet: {task.project ? task.project.title : "Sans projet"}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Assignee a: {task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : "-"}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
