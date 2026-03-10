"use client";

import { FormEvent, useState } from "react";
import { FiKey, FiLock, FiShield } from "react-icons/fi";

import { extractApiError, showError, showSuccess } from "@/components/ui/notify";

const initialForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export default function PasswordSettingsForm() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (form.newPassword !== form.confirmPassword) {
      await showError("Confirmation invalide", "Le nouveau mot de passe et sa confirmation doivent etre identiques.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        await showError("Modification impossible", await extractApiError(response));
        return;
      }

      setForm(initialForm);
      await showSuccess("Mot de passe modifie", "Votre mot de passe a ete mis a jour avec succes.");
    } catch {
      await showError("Erreur reseau", "Impossible de modifier votre mot de passe.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="form-shell p-5 md:p-6">
      <div className="form-shell-header">
        <span className="form-kicker">
          <FiShield className="text-[0.74rem]" />
          SECURITE
        </span>
        <h2 className="form-shell-title">Modifier mon mot de passe</h2>
        <p className="form-shell-subtitle">
          Saisissez votre mot de passe actuel, puis choisissez un nouveau mot de passe et confirmez-le.
        </p>
      </div>

      <form className="form-grid mt-5 md:grid-cols-2" onSubmit={handleSubmit}>
        <div className="form-field md:col-span-2">
          <label htmlFor="current-password" className="field-label">Mot de passe actuel</label>
          <div className="relative">
            <FiKey className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="current-password"
              type="password"
              required
              minLength={6}
              value={form.currentPassword}
              onChange={(event) => setForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
              className="app-input pl-11"
              autoComplete="current-password"
            />
          </div>
        </div>

        <div className="form-field">
          <label htmlFor="new-password" className="field-label">Nouveau mot de passe</label>
          <div className="relative">
            <FiLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="new-password"
              type="password"
              required
              minLength={8}
              value={form.newPassword}
              onChange={(event) => setForm((prev) => ({ ...prev, newPassword: event.target.value }))}
              className="app-input pl-11"
              autoComplete="new-password"
            />
          </div>
          <p className="field-help">Minimum 8 caracteres.</p>
        </div>

        <div className="form-field">
          <label htmlFor="confirm-password" className="field-label">Confirmer le nouveau mot de passe</label>
          <div className="relative">
            <FiLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="confirm-password"
              type="password"
              required
              minLength={8}
              value={form.confirmPassword}
              onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
              className="app-input pl-11"
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="form-note md:col-span-2">
          Choisissez un mot de passe robuste et ne le partagez pas. La session en cours reste active apres la mise a jour.
        </div>

        <button type="submit" disabled={loading} className="app-btn-primary w-full md:col-span-2 md:w-fit">
          <FiShield className="text-sm" />
          {loading ? "Mise a jour..." : "Mettre a jour le mot de passe"}
        </button>
      </form>
    </section>
  );
}
