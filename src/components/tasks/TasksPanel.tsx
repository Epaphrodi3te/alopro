"use client";

import { FormEvent, useMemo, useState } from "react";
import { Role } from "@prisma/client";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

import DataTable from "@/components/tables/DataTable";
import Badge from "@/components/ui/Badge";
import { extractApiError, showError, showSuccess } from "@/components/ui/notify";
import { TaskItem, UserLight } from "@/lib/types";

type ProjectOption = {
  id: string;
  title: string;
};

type TasksPanelProps = {
  tasks: TaskItem[];
  role: Role;
  projects: ProjectOption[];
  agents: UserLight[];
};

const initialForm = {
  title: "",
  description: "",
  projectId: "",
  priority: "medium",
  status: "todo",
  deadline: "",
  assignedToId: "",
};

function statusBadge(status: "todo" | "in_progress" | "done") {
  if (status === "todo") {
    return <Badge label="todo" variant="pending" />;
  }

  if (status === "in_progress") {
    return <Badge label="in progress" variant="progress" />;
  }

  return <Badge label="done" variant="done" />;
}

function priorityBadge(priority: "low" | "medium" | "high") {
  if (priority === "high") {
    return <Badge label="high" variant="high" />;
  }

  if (priority === "medium") {
    return <Badge label="medium" variant="medium" />;
  }

  return <Badge label="low" variant="low" />;
}

export default function TasksPanel({ tasks, role, projects, agents }: TasksPanelProps) {
  const router = useRouter();

  const [form, setForm] = useState({
    ...initialForm,
    projectId: projects[0]?.id ?? "",
  });
  const [loading, setLoading] = useState(false);

  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt))),
    [tasks],
  );

  const canAssignTask = role === "admin" || role === "manager";

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.projectId) {
      await showError("Projet requis", "Selectionnez d'abord un projet.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          assignedToId: canAssignTask ? form.assignedToId : "",
        }),
      });

      if (!response.ok) {
        await showError("Creation impossible", await extractApiError(response));
        return;
      }

      setForm((prev) => ({
        ...initialForm,
        projectId: prev.projectId,
      }));
      await showSuccess("Tache creee");
      router.refresh();
    } catch {
      await showError("Erreur reseau", "Impossible de creer la tache.");
    } finally {
      setLoading(false);
    }
  };

  const editTask = async (task: TaskItem) => {
    const agentOptions = agents
      .map(
        (user) =>
          `<option value="${user.id}" ${task.assignedTo?.id === user.id ? "selected" : ""}>${user.firstName} ${user.lastName}</option>`,
      )
      .join("");

    const result = await Swal.fire({
      title: "Modifier tache",
      html: `
        <input id="swal-title" class="swal2-input" placeholder="Titre" value="${task.title}">
        <textarea id="swal-description" class="swal2-textarea" placeholder="Description">${task.description}</textarea>
        <select id="swal-priority" class="swal2-input">
          <option value="low" ${task.priority === "low" ? "selected" : ""}>low</option>
          <option value="medium" ${task.priority === "medium" ? "selected" : ""}>medium</option>
          <option value="high" ${task.priority === "high" ? "selected" : ""}>high</option>
        </select>
        <select id="swal-status" class="swal2-input">
          <option value="todo" ${task.status === "todo" ? "selected" : ""}>todo</option>
          <option value="in_progress" ${task.status === "in_progress" ? "selected" : ""}>in_progress</option>
          <option value="done" ${task.status === "done" ? "selected" : ""}>done</option>
        </select>
        <input id="swal-deadline" type="date" class="swal2-input" value="${
          task.deadline ? new Date(task.deadline).toISOString().slice(0, 10) : ""
        }">
        ${
          canAssignTask
            ? `<select id="swal-assignee" class="swal2-input"><option value="">Aucune assignation</option>${agentOptions}</select>`
            : ""
        }
      `,
      showCancelButton: true,
      confirmButtonText: "Mettre a jour",
      preConfirm: () => {
        const title = (document.getElementById("swal-title") as HTMLInputElement)?.value;
        const description = (document.getElementById("swal-description") as HTMLTextAreaElement)?.value;
        const priority = (document.getElementById("swal-priority") as HTMLSelectElement)?.value;
        const status = (document.getElementById("swal-status") as HTMLSelectElement)?.value;
        const deadline = (document.getElementById("swal-deadline") as HTMLInputElement)?.value;
        const assignedToId = canAssignTask
          ? (document.getElementById("swal-assignee") as HTMLSelectElement)?.value
          : undefined;

        if (!title || !description || !priority || !status) {
          Swal.showValidationMessage("Titre, description, priorite et statut sont obligatoires.");
          return;
        }

        return {
          title,
          description,
          priority,
          status,
          deadline,
          assignedToId,
        };
      },
    });

    if (!result.isConfirmed || !result.value) {
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(result.value),
      });

      if (!response.ok) {
        await showError("Modification impossible", await extractApiError(response));
        return;
      }

      await showSuccess("Tache modifiee");
      router.refresh();
    } catch {
      await showError("Erreur reseau", "Impossible de modifier la tache.");
    }
  };

  const deleteTask = async (task: TaskItem) => {
    if (role !== "admin") {
      await showError("Action refusee", "Seul l'admin peut supprimer une tache.");
      return;
    }

    const confirm = await Swal.fire({
      icon: "warning",
      title: "Supprimer tache",
      text: `Confirmer la suppression de la tache "${task.title}" ?`,
      showCancelButton: true,
      confirmButtonText: "Supprimer",
      cancelButtonText: "Annuler",
      confirmButtonColor: "#b91c1c",
    });

    if (!confirm.isConfirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        await showError("Suppression impossible", await extractApiError(response));
        return;
      }

      await showSuccess("Tache supprimee");
      router.refresh();
    } catch {
      await showError("Erreur reseau", "Impossible de supprimer la tache.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Creer une tache</h2>

        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleCreate}>
          <input
            required
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Titre"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            required
            value={form.projectId}
            onChange={(event) => setForm((prev) => ({ ...prev, projectId: event.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {projects.length === 0 && <option value="">Aucun projet</option>}
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>

          <textarea
            required
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            placeholder="Description"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
            rows={3}
          />

          <select
            value={form.priority}
            onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>

          <select
            value={form.status}
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="todo">todo</option>
            <option value="in_progress">in_progress</option>
            <option value="done">done</option>
          </select>

          <input
            type="date"
            value={form.deadline}
            onChange={(event) => setForm((prev) => ({ ...prev, deadline: event.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />

          {canAssignTask && (
            <select
              value={form.assignedToId}
              onChange={(event) => setForm((prev) => ({ ...prev, assignedToId: event.target.value }))}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Aucune assignation</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.firstName} {agent.lastName}
                </option>
              ))}
            </select>
          )}

          <button
            type="submit"
            disabled={loading || projects.length === 0}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-500"
          >
            {loading ? "Creation..." : "Creer"}
          </button>
        </form>
      </section>

      <section>
        <DataTable
          columns={[
            "Tache",
            "Projet",
            "Priorite",
            "Statut",
            "Assignee",
            "Deadline",
            "Date",
            "Actions",
          ]}
          emptyLabel="Aucune tache trouvee."
          hasRows={sortedTasks.length > 0}
        >
          {sortedTasks.map((task) => (
            <tr key={task.id} className="border-t border-slate-200">
              <td className="px-4 py-3">
                <p className="font-semibold text-slate-900">{task.title}</p>
                <p className="max-w-xs text-xs text-slate-500">{task.description}</p>
              </td>
              <td className="px-4 py-3">{task.project.title}</td>
              <td className="px-4 py-3">{priorityBadge(task.priority)}</td>
              <td className="px-4 py-3">{statusBadge(task.status)}</td>
              <td className="px-4 py-3">
                {task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : "-"}
              </td>
              <td className="px-4 py-3">
                {task.deadline ? new Date(task.deadline).toLocaleDateString() : "-"}
              </td>
              <td className="px-4 py-3">{new Date(task.createdAt).toLocaleDateString()}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => editTask(task)}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTask(task)}
                    disabled={role !== "admin"}
                    className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
                  >
                    Supprimer
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      </section>
    </div>
  );
}
