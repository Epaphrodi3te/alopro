"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Role } from "@prisma/client";

import { getMenuByRole, getRoleLabel } from "@/lib/navigation";

type SidebarProps = {
  role: Role;
  firstName: string;
  lastName: string;
};

export default function Sidebar({ role, firstName, lastName }: SidebarProps) {
  const pathname = usePathname();
  const menu = getMenuByRole(role);

  return (
    <aside className="w-full border-b border-slate-200 bg-white md:h-screen md:w-72 md:border-r md:border-b-0">
      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-900 to-slate-700 px-6 py-5 text-white">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-200">AloPro</p>
        <h1 className="mt-1 text-lg font-semibold">Gestion Projets & Taches</h1>
      </div>

      <div className="px-6 py-5">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Connecte</p>
        <p className="mt-1 text-sm font-semibold text-slate-900">{firstName} {lastName}</p>
        <p className="text-sm text-slate-600">Role: {getRoleLabel(role)}</p>
      </div>

      <nav className="px-3 pb-6 md:pb-8">
        {menu.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mb-1 block rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-slate-900 text-white shadow"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
