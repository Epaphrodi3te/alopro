"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Swal from "sweetalert2";
import { usePathname } from "next/navigation";
import { FiChevronLeft, FiChevronRight, FiLogOut, FiMenu, FiShield } from "react-icons/fi";

import BrandMark from "@/components/brand/BrandMark";
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
    <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/90 bg-white/88 px-4 py-4 backdrop-blur md:px-7">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onToggleMobileSidebar}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 md:hidden"
          aria-label="Ouvrir le menu"
        >
          <FiMenu />
        </button>
        <button
          type="button"
          onClick={onToggleDesktopSidebar}
          className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 md:inline-flex"
          aria-label="Replier le menu"
        >
          {desktopCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
        </button>
        <div className="hidden min-[480px]:block md:hidden">
          <BrandMark compact subtitle="Workspace" />
        </div>
      </div>

      <div className="mr-auto min-w-0">
        <p className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.13em] text-slate-600 sm:inline-flex">
          <FiShield className="text-xs" />
          Espace {getRoleLabel(role)}
        </p>
        <h2 className="mt-2 truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl md:text-2xl">
          {section}
          <span className="hidden sm:inline">
            {" "}
            <span className="text-slate-400">|</span> Bonjour, {firstName}
          </span>
        </h2>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        disabled={loading}
        className="app-btn-primary text-xs sm:text-sm"
        aria-label="Se deconnecter"
      >
        <FiLogOut className="text-sm" />
        <span className="hidden sm:inline">{loading ? "Deconnexion..." : "Se deconnecter"}</span>
      </button>
    </header>
  );
}
