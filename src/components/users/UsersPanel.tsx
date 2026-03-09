"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FiEdit2, FiEye, FiPlusCircle, FiShield, FiTrash2, FiUserPlus } from "react-icons/fi";
import Swal from "sweetalert2";

import DataTable from "@/components/tables/DataTable";
import Badge from "@/components/ui/Badge";
import { extractApiError, showError, showSuccess } from "@/components/ui/notify";
import { escapeHtml } from "@/lib/html";
import { BasicUser } from "@/lib/types";

type UsersPanelProps = {
  users: BasicUser[];
  currentUserId: string;
  view?: "all" | "list" | "create";
  redirectAfterCreate?: string;
};

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  role: "agent",
};

export default function UsersPanel({
  users,
  currentUserId,
  view = "all",
  redirectAfterCreate,
}: UsersPanelProps) {
  const router = useRouter();

  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  const showCreate = view !== "list";
  const showList = view !== "create";

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

      if (redirectAfterCreate) {
        router.push(redirectAfterCreate);
      }

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
        <div class="swal-user-shell">
          <div class="swal-user-head">
            <span class="swal-user-avatar">${escapeHtml(`${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase())}</span>
            <div class="swal-user-meta">
              <p class="swal-user-name">${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}</p>
              <p class="swal-user-role">${escapeHtml(user.role)}</p>
            </div>
          </div>
        </div>
        <div class="swal-pro-form">
          <div class="swal-pro-row">
            <div class="swal-pro-field">
              <label class="swal-pro-label" for="swal-firstName">Prenom</label>
              <input id="swal-firstName" class="swal2-input" placeholder="Prenom" value="${escapeHtml(user.firstName)}">
            </div>
            <div class="swal-pro-field">
              <label class="swal-pro-label" for="swal-lastName">Nom</label>
              <input id="swal-lastName" class="swal2-input" placeholder="Nom" value="${escapeHtml(user.lastName)}">
            </div>
          </div>
          <div class="swal-pro-row">
            <div class="swal-pro-field">
              <label class="swal-pro-label" for="swal-email">Email</label>
              <input id="swal-email" class="swal2-input" placeholder="Email" value="${escapeHtml(user.email)}">
            </div>
            <div class="swal-pro-field">
              <label class="swal-pro-label" for="swal-phone">Telephone</label>
              <input id="swal-phone" class="swal2-input" placeholder="Telephone" value="${escapeHtml(user.phone ?? "")}">
            </div>
          </div>
          <div class="swal-pro-row">
            <div class="swal-pro-field">
              <label class="swal-pro-label" for="swal-role">Role</label>
              <select id="swal-role" class="swal2-select">
                <option value="admin" ${user.role === "admin" ? "selected" : ""}>admin</option>
                <option value="manager" ${user.role === "manager" ? "selected" : ""}>manager</option>
                <option value="agent" ${user.role === "agent" ? "selected" : ""}>agent</option>
              </select>
            </div>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Mettre a jour",
      cancelButtonText: "Annuler",
      buttonsStyling: false,
      customClass: {
        popup: "swal-pro-modal",
        title: "swal-pro-title",
        htmlContainer: "swal-pro-html",
        confirmButton: "swal-pro-confirm",
        cancelButton: "swal-pro-cancel",
      },
      preConfirm: () => {
        const firstName = (document.getElementById("swal-firstName") as HTMLInputElement)?.value?.trim();
        const lastName = (document.getElementById("swal-lastName") as HTMLInputElement)?.value?.trim();
        const email = (document.getElementById("swal-email") as HTMLInputElement)?.value?.trim();
        const phone = (document.getElementById("swal-phone") as HTMLInputElement)?.value?.trim();
        const role = (document.getElementById("swal-role") as HTMLSelectElement)?.value;

        if (!firstName || !lastName || !email || !role) {
          Swal.showValidationMessage("Prenom, nom, email et role sont obligatoires.");
          return;
        }

        const payload: {
          firstName: string;
          lastName: string;
          email: string;
          phone: string;
          role: string;
        } = {
          firstName,
          lastName,
          email,
          phone: phone ?? "",
          role,
        };

        return payload;
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

  const viewUserDetails = async (user: BasicUser) => {
    await Swal.fire({
      title: "Details utilisateur",
      html: `
        <div style="text-align:left;padding:0 6px;">
          <p><strong>Nom:</strong> ${escapeHtml(user.firstName)} ${escapeHtml(user.lastName)}</p>
          <p><strong>Role:</strong> ${escapeHtml(user.role)}</p>
          <p><strong>Email:</strong> ${escapeHtml(user.email)}</p>
          <p><strong>Telephone:</strong> ${escapeHtml(user.phone ?? "-")}</p>
          <p><strong>Date de creation:</strong> ${new Date(user.createdAt).toLocaleDateString()}</p>
        </div>
      `,
      confirmButtonText: "Fermer",
    });
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
      {showCreate && (
        <section className="form-shell p-5 md:p-6">
          <div className="form-shell-header">
            <span className="form-kicker">
              <FiShield className="text-[0.74rem]" />
              ADMIN
            </span>
            <h2 className="form-shell-title">Creation de compte utilisateur</h2>
            <p className="form-shell-subtitle">
              Ajoutez un nouveau collaborateur avec ses informations de base, son role et un mot de passe provisoire.
            </p>
            <div className="form-meta">
              <span className="form-pill">admin: gestion complete</span>
              <span className="form-pill">manager: suivi operationnel</span>
              <span className="form-pill">agent: execution quotidienne</span>
            </div>
          </div>

          <form className="form-grid mt-5 md:grid-cols-2" onSubmit={handleCreate}>
            <div className="form-field">
              <label htmlFor="user-first-name" className="field-label">Prenom</label>
              <input
                id="user-first-name"
                required
                value={form.firstName}
                onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
                placeholder="Ex: Fatou"
                className="app-input"
                autoComplete="given-name"
              />
              <p className="field-help">Le prenom de la personne.</p>
            </div>
            <div className="form-field">
              <label htmlFor="user-last-name" className="field-label">Nom</label>
              <input
                id="user-last-name"
                required
                value={form.lastName}
                onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
                placeholder="Ex: Adeyemi"
                className="app-input"
                autoComplete="family-name"
              />
              <p className="field-help">Le nom de famille officiel.</p>
            </div>
            <div className="form-field">
              <label htmlFor="user-email" className="field-label">Email</label>
              <input
                id="user-email"
                required
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="email@entreprise.com"
                className="app-input"
                autoComplete="email"
              />
              <p className="field-help">Utilise pour la connexion et les notifications.</p>
            </div>
            <div className="form-field">
              <label htmlFor="user-phone" className="field-label">Telephone</label>
              <input
                id="user-phone"
                value={form.phone}
                onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder="+229 00 00 00 00"
                className="app-input"
                autoComplete="tel"
              />
              <p className="field-help">Optionnel, utile pour le support interne.</p>
            </div>
            <div className="form-field">
              <label htmlFor="user-password" className="field-label">Mot de passe</label>
              <input
                id="user-password"
                required
                type="password"
                minLength={8}
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="Minimum 8 caracteres"
                className="app-input"
                autoComplete="new-password"
              />
              <p className="field-help">Minimum 8 caracteres.</p>
            </div>
            <div className="form-field">
              <label htmlFor="user-role" className="field-label">Role</label>
              <select
                id="user-role"
                value={form.role}
                onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
                className="app-select"
              >
                <option value="admin">admin - acces total</option>
                <option value="manager">manager - pilotage equipes</option>
                <option value="agent">agent - execution taches</option>
              </select>
              <p className="field-help">Definit les permissions sur la plateforme.</p>
            </div>

            <div className="form-note md:col-span-2">
              Le compte sera cree immediatement. Transmettez ensuite le mot de passe de facon securisee a
              l'utilisateur.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="app-btn-primary w-full md:col-span-2 md:w-fit"
            >
              {loading ? <FiPlusCircle className="text-sm" /> : <FiUserPlus className="text-sm" />}
              {loading ? "Creation..." : "Creer le compte"}
            </button>
          </form>
        </section>
      )}

      {showList && (
        <section>
          <DataTable
            columns={["Nom", "Role", "Actions"]}
            emptyLabel="Aucun utilisateur trouve."
            hasRows={sortedUsers.length > 0}
          >
            {sortedUsers.map((user) => (
              <tr key={user.id} className="border-t border-slate-200">
                <td data-label="Nom" className="px-4 py-3 font-semibold text-slate-900">{user.firstName} {user.lastName}</td>
                <td data-label="Role" className="px-4 py-3">
                  <Badge
                    label={user.role}
                    variant={user.role === "admin" ? "admin" : user.role === "manager" ? "manager" : "agent"}
                  />
                </td>
                <td data-label="Actions" className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => viewUserDetails(user)}
                      className="app-btn-soft"
                    >
                      <FiEye className="text-xs" />
                      Voir details
                    </button>
                    <button
                      type="button"
                      onClick={() => editUser(user)}
                      className="app-btn-soft"
                    >
                      <FiEdit2 className="text-xs" />
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteUser(user)}
                      disabled={user.id === currentUserId}
                      className="app-btn-danger"
                    >
                      <FiTrash2 className="text-xs" />
                      Supprimer
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        </section>
      )}
    </div>
  );
}
