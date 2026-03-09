"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Role } from "@prisma/client";
import { IconType } from "react-icons";
import { FiCheckSquare, FiFolder, FiGrid, FiMessageCircle, FiSettings, FiUsers, FiX } from "react-icons/fi";

import { getMenuByRole, getRoleLabel, NavNotificationCounts } from "@/lib/navigation";

type SidebarProps = {
  role: Role;
  firstName: string;
  lastName: string;
  notificationCounts: NavNotificationCounts;
  mobileOpen: boolean;
  desktopCollapsed: boolean;
  onCloseMobile: () => void;
};

export default function Sidebar({
  role,
  firstName,
  lastName,
  notificationCounts,
  mobileOpen,
  desktopCollapsed,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const menu = getMenuByRole(role);
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  const iconByPath: Record<string, IconType> = {
    "/dashboard": FiGrid,
    "/users": FiUsers,
    "/projects": FiFolder,
    "/tasks": FiCheckSquare,
    "/messages": FiMessageCircle,
    "/settings": FiSettings,
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-[290px] flex-col border-r border-slate-200/85 bg-white/96 shadow-2xl backdrop-blur transition-transform duration-200 md:sticky md:top-0 md:z-10 md:h-screen md:shadow-none ${
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      } ${desktopCollapsed ? "md:w-24" : "md:w-72"}`}
    >
      <div className="border-b border-slate-200/90 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-5 py-5 text-white">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">AloPro</p>
            <h1 className={`mt-1 text-lg font-semibold ${desktopCollapsed ? "md:hidden" : ""}`}>Workspace</h1>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="inline-flex rounded-lg border border-white/20 p-1.5 text-white md:hidden"
            aria-label="Fermer le menu"
          >
            <FiX />
          </button>
        </div>
      </div>

      <div className={`px-5 py-4 ${desktopCollapsed ? "md:px-3" : ""}`}>
        <div className={`flex items-center gap-3 rounded-2xl bg-slate-100 p-3 ${desktopCollapsed ? "md:justify-center" : ""}`}>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
            {initials}
          </span>
          <div className={`${desktopCollapsed ? "md:hidden" : ""}`}>
            <p className="text-sm font-bold text-slate-900">{firstName} {lastName}</p>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{getRoleLabel(role)}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-5">
        {menu.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = iconByPath[item.href] ?? FiGrid;
          const rawBadgeCount = notificationCounts[item.key] ?? 0;
          const hasBadge = rawBadgeCount > 0;
          const badgeCountLabel = rawBadgeCount > 99 ? "99+" : String(rawBadgeCount);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              title={desktopCollapsed ? item.label : undefined}
              className={`flex min-w-fit items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition md:w-full ${
                desktopCollapsed ? "md:justify-center md:px-2.5" : ""
              } ${
                active
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <span className="relative inline-flex">
                <Icon className="text-[18px]" />
                {hasBadge && desktopCollapsed && (
                  <span className="absolute -right-1 -top-1 hidden h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white md:inline-block" />
                )}
              </span>
              <span className={`${desktopCollapsed ? "md:hidden" : ""}`}>{item.label}</span>
              {hasBadge && (
                <span
                  className={`ml-auto inline-flex min-w-[1.45rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                    active ? "bg-rose-500 text-white" : "bg-rose-600 text-white"
                  } ${desktopCollapsed ? "md:hidden" : ""}`}
                >
                  {badgeCountLabel}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className={`border-t border-slate-200 px-4 py-4 ${desktopCollapsed ? "md:px-3" : ""}`}>
        <div className={`rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600 ${desktopCollapsed ? "md:text-center" : ""}`}>
          {desktopCollapsed ? "v1.0" : "AloPro SaaS Dashboard v1.0"}
        </div>
      </div>
    </aside>
  );
}
