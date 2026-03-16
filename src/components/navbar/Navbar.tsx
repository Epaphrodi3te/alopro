"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Swal from "sweetalert2";
import { usePathname } from "next/navigation";
import { FiChevronLeft, FiChevronRight, FiLogOut, FiMenu } from "react-icons/fi";

import { getRoleLabel } from "@/lib/navigation";
import { Role } from "@prisma/client";

type NavbarProps = {
  role: Role;
  firstName: string;
  desktopCollapsed: boolean;
  onToggleDesktopSidebar: () => void;
  onToggleMobileSidebar: () => void;
};

const sectionByPath: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/users": "Utilisateurs",
  "/projects": "Projets",
  "/tasks": "Taches",
  "/messages": "Messages",
  "/files": "Fichiers",
  "/settings": "Parametres",
};

function getSection(pathname: string) {
  const match = Object.keys(sectionByPath).find((item) => pathname === item || pathname.startsWith(`${item}/`));
  return sectionByPath[match ?? "/dashboard"];
}

export default function Navbar({
  role,
  firstName,
  desktopCollapsed,
  onToggleDesktopSidebar,
  onToggleMobileSidebar,
}: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const section = getSection(pathname);
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await Swal.fire({
        icon: "success",
        title: "Deconnexion",
        text: "Session terminee.",
        timer: 1200,
        showConfirmButton: false,
      });
      router.push("/login");
      router.refresh();
    } catch {
      Swal.fire({ icon: "error", title: "Erreur", text: "Impossible de se deconnecter." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm md:px-6">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 md:hidden"
          aria-label="Ouvrir le menu"
        >
          <FiMenu size={16} />
        </button>
        <button
          type="button"
          onClick={onToggleDesktopSidebar}
          className="hidden h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 md:inline-flex"
          aria-label="Replier le menu"
        >
          {desktopCollapsed ? <FiChevronRight size={16} /> : <FiChevronLeft size={16} />}
        </button>
      </div>

      <div className="mr-auto min-w-0">
        <div className="flex items-center gap-2">
          <h2 className="truncate text-base font-semibold text-slate-900 md:text-lg">{section}</h2>
          <span className="hidden rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 sm:inline-block">
            {getRoleLabel(role)}
          </span>
        </div>
        <p className="hidden text-xs text-slate-500 sm:block">Bonjour, {firstName}</p>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className="app-btn-soft text-xs"
        aria-label="Se deconnecter"
      >
        <FiLogOut size={14} />
        <span className="hidden sm:inline">{loading ? "..." : "Deconnexion"}</span>
      </button>
    </header>
  );
}
