"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 transition focus:ring"
          placeholder="admin@alopro.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
          Mot de passe
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-slate-300 transition focus:ring"
          placeholder="********"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-500"
      >
        {loading ? "Connexion..." : "Se connecter"}
      </button>
    </form>
  );
}
