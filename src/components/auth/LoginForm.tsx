"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { FiLogIn } from "react-icons/fi";

import { extractApiError, showError, showSuccess } from "@/components/ui/notify";

export default function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("admin@alopro.com");
  const [password, setPassword] = useState("Admin@1234");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!response.ok) {
        const errorMessage = await extractApiError(response);
        await showError("Connexion impossible", errorMessage);
        return;
      }

      await showSuccess("Connexion reussie", "Bienvenue sur AloPro.");
      router.push("/dashboard");
      router.refresh();
    } catch {
      await showError("Erreur reseau", "Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      <div className="form-field">
        <label htmlFor="email" className="field-label">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="app-input"
          placeholder="admin@alopro.com"
        />
      </div>

      <div className="form-field">
        <label htmlFor="password" className="field-label">
          Mot de passe
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="app-input"
          placeholder="********"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="app-btn-primary w-full"
      >
        <FiLogIn className="text-sm" />
        {loading ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
}
