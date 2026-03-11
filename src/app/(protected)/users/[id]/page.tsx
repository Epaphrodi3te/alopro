import Link from "next/link";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { FiArrowLeft, FiCalendar, FiCheckSquare, FiFolder, FiMail, FiPhone, FiUser } from "react-icons/fi";

import Badge from "@/components/ui/Badge";
import { requireUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

type UserDetailsPageProps = {
  params: Promise<{ id: string }>;
};

function roleVariant(role: Role): "admin" | "manager" | "agent" {
  if (role === "admin") {
    return "admin";
  }

  if (role === "manager") {
    return "manager";
  }

  return "agent";
}

function taskStatusVariant(status: "todo" | "in_progress" | "done"): "pending" | "progress" | "done" {
  if (status === "todo") {
    return "pending";
  }

  if (status === "in_progress") {
    return "progress";
  }

  return "done";
}

function taskPriorityVariant(priority: "low" | "medium" | "high"): "low" | "medium" | "high" {
  return priority;
}

function formatDate(value: Date | null) {
  if (!value) {
    return "-";
  }

  return value.toLocaleDateString();
}

export default async function UserDetailsPage({ params }: UserDetailsPageProps) {
  const current = await requireUser();

  if (current.role !== "admin") {
    redirect("/dashboard");
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      _count: {
        select: {
          createdProjects: true,
          assignedProjects: true,
          createdTasks: true,
          assignedTasks: true,
          sentMessages: true,
          receivedMessages: true,
        },
      },
      createdProjects: {
        orderBy: { createdAt: "desc" },
        take: 4,
        select: {
          id: true,
          title: true,
          status: true,
          deadline: true,
        },
      },
      assignedTasks: {
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          deadline: true,
          receivedAt: true,
          deadlineValidatedAt: true,
          progressPercent: true,
          project: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    redirect("/users");
  }

  const fullName = `${user.firstName} ${user.lastName}`;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-[linear-gradient(160deg,#ffffff,#f8fafc)] p-6 shadow-sm">
        <div className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-slate-100 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <Link href="/users" className="app-btn-soft">
              <FiArrowLeft className="text-sm" />
              Retour utilisateurs
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Profil utilisateur</p>
              <h1 className="mt-2 page-title text-slate-900">{fullName}</h1>
              <p className="page-subtitle">Fiche complete du compte avec ses activites et ses derniers elements.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Role</p>
            <div className="mt-1">
              <Badge label={user.role} variant={roleVariant(user.role)} />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.9fr_1fr]">
        <article className="app-card p-5">
          <h2 className="text-lg font-semibold text-slate-900">Informations principales</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Nom complet</p>
              <p className="mt-1 font-semibold text-slate-900">{fullName}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Email</p>
              <p className="mt-1 font-semibold text-slate-900">{user.email}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Telephone</p>
              <p className="mt-1 font-semibold text-slate-900">{user.phone ?? "-"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Date creation</p>
              <p className="mt-1 font-semibold text-slate-900">{formatDate(user.createdAt)}</p>
            </div>
          </div>
        </article>

        <aside className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="app-card p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Projets crees</p>
            <p className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">{user._count.createdProjects}</p>
          </div>
          <div className="app-card p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Projets assignes</p>
            <p className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">{user._count.assignedProjects}</p>
          </div>
          <div className="app-card p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Taches assignees</p>
            <p className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">{user._count.assignedTasks}</p>
          </div>
          <div className="app-card p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Messages recus</p>
            <p className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">{user._count.receivedMessages}</p>
          </div>
        </aside>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <article className="app-card p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Derniers projets crees</h2>
            <FiFolder className="text-slate-500" />
          </div>
          <div className="mt-4 space-y-3">
            {user.createdProjects.length === 0 && <p className="text-sm text-slate-500">Aucun projet cree.</p>}
            {user.createdProjects.map((project) => (
              <div key={project.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900">{project.title}</p>
                  <Badge
                    label={project.status === "in_progress" ? "in progress" : project.status}
                    variant={project.status === "pending" ? "pending" : project.status === "in_progress" ? "progress" : "done"}
                  />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <FiCalendar />
                    Echeance: {formatDate(project.deadline)}
                  </span>
                  <Link href={`/projects/${project.id}`} className="font-semibold text-slate-700 hover:text-slate-900">
                    Voir details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="app-card p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Dernieres taches assignees</h2>
            <FiCheckSquare className="text-slate-500" />
          </div>
          <div className="mt-4 space-y-3">
            {user.assignedTasks.length === 0 && <p className="text-sm text-slate-500">Aucune tache assignee.</p>}
            {user.assignedTasks.map((task) => (
              <div key={task.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="font-semibold text-slate-900">{task.title}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge
                    label={task.status === "in_progress" ? "in progress" : task.status}
                    variant={taskStatusVariant(task.status)}
                  />
                  <Badge label={task.priority} variant={taskPriorityVariant(task.priority)} />
                  <Badge label={`${task.progressPercent}%`} variant="medium" />
                </div>
                <div className="mt-2 space-y-1 text-xs text-slate-500">
                  <p>Projet: {task.project ? task.project.title : "Sans projet"}</p>
                  <p>Echeance: {formatDate(task.deadline)}</p>
                  <p>Recue: {task.receivedAt ? "Oui" : "Non"} | Date validee: {task.deadlineValidatedAt ? "Oui" : "Non"}</p>
                </div>
                <div className="mt-2">
                  <Link href={`/tasks/${task.id}`} className="font-semibold text-slate-700 hover:text-slate-900">
                    Voir details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="app-card p-5">
        <h2 className="text-base font-semibold text-slate-900">Contacts</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.09em] text-slate-500">
              <FiMail />
              Email
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{user.email}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.09em] text-slate-500">
              <FiPhone />
              Telephone
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{user.phone ?? "-"}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.09em] text-slate-500">
              <FiUser />
              Statut compte
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">Actif</p>
          </div>
        </div>
      </section>
    </div>
  );
}
