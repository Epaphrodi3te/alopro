"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

import DataTable from "@/components/tables/DataTable";
import Badge from "@/components/ui/Badge";
import { extractApiError, showError, showSuccess } from "@/components/ui/notify";
import { BasicUser } from "@/lib/types";

type UsersPanelProps = {
  users: BasicUser[];
  currentUserId: string;
};

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  role: "agent",
};

export default function UsersPanel({ users, currentUserId }: UsersPanelProps) {
  const router = useRouter();

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt))),
    [users],
  );

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        await showError("Creation impossible", await extractApiError(response));
        return;
      }

      setForm(initialForm);
      await showSuccess("Utilisateur cree");
      router.refresh();
    } catch {
      await showError("Erreur reseau", "Impossible de creer l'utilisateur.");
    } finally {
      setLoading(false);
    }
  };

  const editUser = async (user: BasicUser) => {
    const result = await Swal.fire({
      title: "Modifier utilisateur",
      html: `
        <input id="swal-firstName" class="swal2-input" placeholder="Prenom" value="${user.firstName}">
        <input id="swal-lastName" class="swal2-input" placeholder="Nom" value="${user.lastName}">
        <input id="swal-email" class="swal2-input" placeholder="Email" value="${user.email}">
        <input id="swal-phone" class="swal2-input" placeholder="Telephone" value="${user.phone ?? ""}">
        <input id="swal-password" type="password" class="swal2-input" placeholder="Nouveau mot de passe (optionnel)">
        <select id="swal-role" class="swal2-input">
          <option value="admin" ${user.role === "admin" ? "selected" : ""}>admin</option>
          <option value="manager" ${user.role === "manager" ? "selected" : ""}>manager</option>
          <option value="agent" ${user.role === "agent" ? "selected" : ""}>agent</option>
        </select>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Mettre a jour",
      preConfirm: () => {
        const firstName = (document.getElementById("swal-firstName") as HTMLInputElement)?.value;
        const lastName = (document.getElementById("swal-lastName") as HTMLInputElement)?.value;
        const email = (document.getElementById("swal-email") as HTMLInputElement)?.value;
        const phone = (document.getElementById("swal-phone") as HTMLInputElement)?.value;
        const password = (document.getElementById("swal-password") as HTMLInputElement)?.value;
        const role = (document.getElementById("swal-role") as HTMLSelectElement)?.value;

        if (!firstName || !lastName || !email || !role) {
          Swal.showValidationMessage("Prenom, nom, email et role sont obligatoires.");
          return;
        }

        return {
          firstName,
          lastName,
          email,
          phone,
          password,
          role,
        };
      },
    });

    if (!result.isConfirmed || !result.value) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${user.id}`, {
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

      await showSuccess("Utilisateur modifie");
      router.refresh();
    } catch {
      await showError("Erreur reseau", "Impossible de modifier l'utilisateur.");
    }
  };

  const deleteUser = async (user: BasicUser) => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Supprimer utilisateur",
      text: `Confirmer la suppression de ${user.firstName} ${user.lastName} ?`,
      showCancelButton: true,
      confirmButtonText: "Supprimer",
      cancelButtonText: "Annuler",
      confirmButtonColor: "#b91c1c",
    });

    if (!confirm.isConfirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        await showError("Suppression impossible", await extractApiError(response));
        return;
      }

      await showSuccess("Utilisateur supprime");
      router.refresh();
    } catch {
      await showError("Erreur reseau", "Impossible de supprimer l'utilisateur.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Creer un utilisateur</h2>

        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleCreate}>
          <input
            required
            value={form.firstName}
            onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
            placeholder="Prenom"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            required
            value={form.lastName}
            onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
            placeholder="Nom"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            required
            type="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            placeholder="Email"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={form.phone}
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
            placeholder="Telephone"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            required
            type="password"
            minLength={8}
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            placeholder="Mot de passe"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <select
            value={form.role}
            onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="admin">admin</option>
            <option value="manager">manager</option>
            <option value="agent">agent</option>
          </select>

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:bg-slate-500"
          >
            {loading ? "Creation..." : "Creer"}
          </button>
        </form>
      </section>

      <section>
        <DataTable
          columns={["Nom", "Email", "Role", "Telephone", "Date", "Actions"]}
          emptyLabel="Aucun utilisateur trouve."
          hasRows={sortedUsers.length > 0}
        >
          {sortedUsers.map((user) => (
            <tr key={user.id} className="border-t border-slate-200">
              <td className="px-4 py-3 font-semibold text-slate-900">{user.firstName} {user.lastName}</td>
              <td className="px-4 py-3">{user.email}</td>
              <td className="px-4 py-3">
                <Badge
                  label={user.role}
                  variant={user.role === "admin" ? "admin" : user.role === "manager" ? "manager" : "agent"}
                />
              </td>
              <td className="px-4 py-3">{user.phone ?? "-"}</td>
              <td className="px-4 py-3">{new Date(user.createdAt).toLocaleDateString()}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => editUser(user)}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteUser(user)}
                    disabled={user.id === currentUserId}
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
