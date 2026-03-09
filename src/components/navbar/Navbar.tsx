"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Swal from "sweetalert2";

import { getRoleLabel } from "@/lib/navigation";
import { Role } from "@prisma/client";

type NavbarProps = {
  role: Role;
  firstName: string;
};

export default function Navbar({ role, firstName }: NavbarProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });

      await Swal.fire({
        icon: "success",
        title: "Deconnexion",
        text: "Session terminee avec succes.",
        timer: 1200,
        showConfirmButton: false,
      });

      router.push("/login");
      router.refresh();
    } catch {
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: "Impossible de se deconnecter.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4 md:px-7">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Espace {getRoleLabel(role)}</p>
        <h2 className="text-xl font-semibold text-slate-900">Bonjour, {firstName}</h2>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-500"
      >
        {loading ? "Deconnexion..." : "Se deconnecter"}
      </button>
    </header>
  );
}
