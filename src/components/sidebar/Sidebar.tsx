"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Role } from "@prisma/client";
import { useEffect, useState } from "react";
import { IconType } from "react-icons";
import {
  FiCheckSquare,
  FiChevronDown,
  FiChevronRight,
  FiFolder,
  FiGrid,
  FiMessageCircle,
  FiSettings,
  FiUsers,
  FiX,
} from "react-icons/fi";

import BrandMark from "@/components/brand/BrandMark";
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

type SidebarTaskNode = {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  progressPercent: number;
};

type SidebarProjectNode = {
  id: string;
  title: string;
  tasks: SidebarTaskNode[];
};

type NavigationTreeResponse = {
  projects: SidebarProjectNode[];
};

function getTaskStatusLabel(status: SidebarTaskNode["status"]) {
  if (status === "in_progress") {
    return "En cours";
  }

  if (status === "done") {
    return "Terminee";
  }

  return "A faire";
}

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
  const [projectsOpen, setProjectsOpen] = useState(pathname.startsWith("/projects") || pathname.startsWith("/tasks"));
  const [projectsTree, setProjectsTree] = useState<SidebarProjectNode[]>([]);
  const [treeLoaded, setTreeLoaded] = useState(false);
  const [treeLoading, setTreeLoading] = useState(false);
  const [expandedProjectIds, setExpandedProjectIds] = useState<Record<string, boolean>>({});
  const iconByPath: Record<string, IconType> = {
    "/dashboard": FiGrid,
    "/users": FiUsers,
    "/projects": FiFolder,
    "/tasks": FiCheckSquare,
    "/messages": FiMessageCircle,
    "/settings": FiSettings,
  };

  useEffect(() => {
    if (pathname.startsWith("/projects") || pathname.startsWith("/tasks")) {
      setProjectsOpen(true);
    }
  }, [pathname]);

  useEffect(() => {
    if (desktopCollapsed || !projectsOpen || treeLoaded) {
      return;
    }
    const abortController = new AbortController();

    const pullTree = async () => {
      setTreeLoading(true);

      try {
        const response = await fetch("/api/navigation/tree", {
          method: "GET",
          cache: "no-store",
          signal: abortController.signal,
        });

        if (!response.ok) {
          setProjectsTree([]);
          setTreeLoaded(true);
          return;
        }

        const data = (await response.json()) as NavigationTreeResponse;
        setProjectsTree(data.projects ?? []);
        setTreeLoaded(true);
      } catch {
        if (!abortController.signal.aborted) {
          setProjectsTree([]);
          setTreeLoaded(true);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setTreeLoading(false);
        }
      }
    };

    pullTree();

    return () => {
      abortController.abort();
    };
  }, [desktopCollapsed, projectsOpen, treeLoaded]);

  const toggleProjectNode = (projectId: string) => {
    setExpandedProjectIds((previous) => ({
      ...previous,
      [projectId]: !previous[projectId],
    }));
  };

  const toggleProjectsSection = () => {
    setProjectsOpen((previous) => {
      const next = !previous;
      if (next) {
        setTreeLoaded(false);
        setTreeLoading(false);
      }

      return next;
    });
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-[290px] flex-col border-r border-slate-300 bg-[#f4f5f7] transition-transform duration-200 md:sticky md:top-0 md:z-10 md:h-screen ${
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      } ${desktopCollapsed ? "md:w-24" : "md:w-72"}`}
    >
      <div className="border-b border-slate-300 bg-white px-4 py-3 text-slate-900">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">AloPro</p>
            <h1 className={`mt-1 text-lg font-semibold ${desktopCollapsed ? "md:hidden" : ""}`}>Workspace</h1>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="inline-flex rounded-md border border-slate-300 p-1.5 text-slate-700 md:hidden"
            aria-label="Fermer le menu"
          >
            <FiX />
          </button>
        </div>
      </div>

      <div className={`px-3 py-3 ${desktopCollapsed ? "md:px-3" : ""}`}>
        <div className={`flex items-center gap-3 rounded-md border border-slate-300 bg-white px-3 py-2 ${desktopCollapsed ? "md:justify-center md:px-1" : ""}`}>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-slate-800 text-xs font-bold text-white">
            {initials}
          </span>
          <div className={`${desktopCollapsed ? "md:hidden" : ""}`}>
            <p className="text-sm font-semibold text-slate-900">{firstName} {lastName}</p>
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">{getRoleLabel(role)}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-4">
        {menu.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = iconByPath[item.href] ?? FiGrid;
          const rawBadgeCount = notificationCounts[item.key] ?? 0;
          const hasBadge = rawBadgeCount > 0;
          const badgeCountLabel = rawBadgeCount > 99 ? "99+" : String(rawBadgeCount);
          const isProjectsItem = item.key === "projects";

          if (isProjectsItem && !desktopCollapsed) {
            return (
              <div key={item.href} className="space-y-1">
                <button
                  type="button"
                  onClick={toggleProjectsSection}
                  className={`flex w-full min-w-fit items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition ${
                    active
                      ? "border border-slate-300 bg-white text-slate-900"
                      : "text-slate-700 hover:bg-slate-200/60 hover:text-slate-900"
                  }`}
                >
                  <span className="relative inline-flex">
                    <Icon className="text-[18px]" />
                  </span>
                  <span className="truncate">{item.label}</span>
                  {hasBadge && (
                    <span className={`nav-badge ml-auto inline-flex ${active ? "nav-badge-active" : ""}`}>
                      {badgeCountLabel}
                    </span>
                  )}
                  {projectsOpen ? <FiChevronDown className="shrink-0 text-sm" /> : <FiChevronRight className="shrink-0 text-sm" />}
                </button>

                {projectsOpen && (
                  <div className="mt-1 space-y-1 pl-1">
                    <Link
                      href="/projects"
                      onClick={onCloseMobile}
                      className={`mb-1 flex items-center justify-between rounded-md px-2 py-1.5 text-xs font-medium transition ${
                        pathname === "/projects"
                          ? "bg-white text-slate-900"
                          : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
                      }`}
                    >
                      <span>Tous les projets</span>
                      <FiChevronRight className="text-[11px]" />
                    </Link>

                    {treeLoading && !treeLoaded && (
                      <p className="px-2.5 py-2 text-xs font-medium text-slate-500">Chargement des projets...</p>
                    )}

                    {!treeLoading && treeLoaded && projectsTree.length === 0 && (
                      <p className="px-2.5 py-2 text-xs font-medium text-slate-500">Aucun projet disponible</p>
                    )}

                    <div className="space-y-0.5">
                      {projectsTree.map((project) => {
                        const projectPath = `/projects/${project.id}`;
                        const projectActive = pathname === projectPath;
                        const projectOpen = expandedProjectIds[project.id] || pathname.startsWith(projectPath);

                        return (
                          <div key={project.id} className="rounded-md">
                            <div
                              className={`flex items-center gap-1 rounded-md px-1 py-0.5 ${
                                projectActive ? "bg-white text-slate-900" : "text-slate-700"
                              }`}
                            >
                              <Link
                                href={projectPath}
                                onClick={() => {
                                  setExpandedProjectIds((previous) => ({
                                    ...previous,
                                    [project.id]: true,
                                  }));
                                  onCloseMobile();
                                }}
                                className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium transition ${
                                  projectActive ? "text-slate-900" : "text-slate-700 hover:bg-slate-200/60 hover:text-slate-900"
                                }`}
                              >
                                <FiFolder className="shrink-0 text-[12px] text-amber-500" />
                                <span className="truncate text-[12px]">{project.title}</span>
                                <span
                                  className={`ml-auto rounded px-1 py-0.5 text-[10px] font-medium ${
                                    projectActive ? "bg-slate-100 text-slate-700" : "bg-slate-200 text-slate-600"
                                  }`}
                                >
                                  {project.tasks.length}
                                </span>
                              </Link>
                              <button
                                type="button"
                                onClick={() => toggleProjectNode(project.id)}
                                className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition ${
                                  projectActive
                                    ? "text-slate-700 hover:bg-slate-100"
                                    : "text-slate-500 hover:bg-slate-200/60 hover:text-slate-800"
                                }`}
                                aria-label={projectOpen ? "Masquer les taches" : "Afficher les taches"}
                              >
                                {projectOpen ? <FiChevronDown className="text-[12px]" /> : <FiChevronRight className="text-[12px]" />}
                              </button>
                            </div>

                            {projectOpen && (
                              <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-300 pl-2.5">
                                {project.tasks.length === 0 && (
                                  <p className="px-2 py-1 text-[11px] font-medium text-slate-500">Aucune tache associee</p>
                                )}

                                {project.tasks.map((task) => {
                                  const taskPath = `/tasks/${task.id}`;
                                  const taskActive = pathname === taskPath;

                                  return (
                                    <Link
                                      key={task.id}
                                      href={taskPath}
                                      onClick={onCloseMobile}
                                      className={`flex items-start justify-between gap-2 rounded-md px-2 py-1.5 text-[11px] font-medium transition ${
                                        taskActive
                                          ? "bg-white text-slate-900"
                                          : "text-slate-700 hover:bg-slate-200/60 hover:text-slate-900"
                                      }`}
                                    >
                                      <span className="min-w-0">
                                        <span className="block truncate text-[12px]">{task.title}</span>
                                        <span className={`block text-[10px] ${taskActive ? "text-slate-600" : "text-slate-500"}`}>{getTaskStatusLabel(task.status)}</span>
                                      </span>
                                      <span className={`shrink-0 rounded px-1 py-0.5 text-[10px] font-medium ${taskActive ? "bg-slate-100 text-slate-700" : "bg-slate-200 text-slate-700"}`}>
                                        {task.progressPercent}%
                                      </span>
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              title={desktopCollapsed ? item.label : undefined}
              className={`flex min-w-fit items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition md:w-full ${
                desktopCollapsed ? "md:justify-center md:px-2.5" : ""
              } ${
                active
                  ? "border border-slate-300 bg-white text-slate-900"
                  : "text-slate-700 hover:bg-slate-200/60 hover:text-slate-900"
              }`}
            >
              <span className="relative inline-flex">
                <Icon className="text-[18px]" />
                {hasBadge && desktopCollapsed && (
                  <span className="nav-badge-dot absolute -right-1 -top-1 hidden md:inline-block" />
                )}
              </span>
              <span className={`${desktopCollapsed ? "md:hidden" : ""}`}>{item.label}</span>
              {hasBadge && (
                <span
                  className={`nav-badge ml-auto inline-flex ${desktopCollapsed ? "md:hidden" : ""} ${active ? "nav-badge-active" : ""}`}
                >
                  {badgeCountLabel}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className={`border-t border-slate-200 px-4 py-4 ${desktopCollapsed ? "md:px-3" : ""}`}>
        <div className={`rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-600 ${desktopCollapsed ? "md:text-center" : ""}`}>
          {desktopCollapsed ? "v1.0" : "AloPro SaaS Dashboard v1.0"}
        </div>
      </div>
    </aside>
  );
}
