"use client";

import { Role } from "@prisma/client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import Navbar from "@/components/navbar/Navbar";
import Sidebar from "@/components/sidebar/Sidebar";
import { NavKey, NavNotificationCounts } from "@/lib/navigation";

type AppShellProps = {
  userId: string;
  role: Role;
  firstName: string;
  lastName: string;
  initialNotificationCounts: NavNotificationCounts;
  children: React.ReactNode;
};

export default function AppShell({
  userId,
  role,
  firstName,
  lastName,
  initialNotificationCounts,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [notificationCounts, setNotificationCounts] = useState<NavNotificationCounts>(initialNotificationCounts);
  const [seenAtByTab, setSeenAtByTab] = useState<
    Record<"projects" | "tasks" | "messages" | "users", string> | null
  >(null);

  const tabStorageKey = `alopro:seen-notifications:${userId}`;

  const getTabFromPathname = (currentPathname: string): NavKey | null => {
    if (currentPathname.startsWith("/projects")) {
      return "projects";
    }

    if (currentPathname.startsWith("/tasks")) {
      return "tasks";
    }

    if (currentPathname.startsWith("/messages")) {
      return "messages";
    }

    if (currentPathname.startsWith("/users")) {
      return "users";
    }

    return null;
  };

  useEffect(() => {
    setNotificationCounts(initialNotificationCounts);
  }, [initialNotificationCounts]);

  useEffect(() => {
    const now = new Date().toISOString();
    const fallback = {
      projects: now,
      tasks: now,
      messages: now,
      users: now,
    };

    try {
      const raw = localStorage.getItem(tabStorageKey);
      if (!raw) {
        localStorage.setItem(tabStorageKey, JSON.stringify(fallback));
        setSeenAtByTab(fallback);
        return;
      }

      const parsed = JSON.parse(raw) as Partial<Record<"projects" | "tasks" | "messages" | "users", string>>;
      const normalized = {
        projects: parsed.projects ?? now,
        tasks: parsed.tasks ?? now,
        messages: parsed.messages ?? now,
        users: parsed.users ?? now,
      };

      localStorage.setItem(tabStorageKey, JSON.stringify(normalized));
      setSeenAtByTab(normalized);
    } catch {
      localStorage.setItem(tabStorageKey, JSON.stringify(fallback));
      setSeenAtByTab(fallback);
    }
  }, [tabStorageKey]);

  useEffect(() => {
    const currentTab = getTabFromPathname(pathname);
    if (!currentTab || (currentTab !== "projects" && currentTab !== "tasks" && currentTab !== "messages" && currentTab !== "users")) {
      return;
    }

    const now = new Date().toISOString();

    setSeenAtByTab((previous) => {
      if (!previous) {
        return previous;
      }

      const nextSeenAtByTab = {
        ...previous,
        [currentTab]: now,
      };

      localStorage.setItem(tabStorageKey, JSON.stringify(nextSeenAtByTab));
      return nextSeenAtByTab;
    });

    setNotificationCounts((previous) => {
      const next = {
        ...previous,
        [currentTab]: 0,
      };

      next.dashboard = (next.tasks ?? 0) + (next.messages ?? 0);
      return next;
    });
  }, [pathname, tabStorageKey]);

  useEffect(() => {
    if (!seenAtByTab) {
      return;
    }

    let active = true;

    const pullNotifications = async () => {
      try {
        const params = new URLSearchParams({
          projectsSince: seenAtByTab.projects,
          tasksSince: seenAtByTab.tasks,
          messagesSince: seenAtByTab.messages,
          usersSince: seenAtByTab.users,
        });

        const withParamsResponse = await fetch(`/api/notifications?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
        });

        if (!withParamsResponse.ok) {
          return;
        }

        const data = (await withParamsResponse.json()) as { counts?: NavNotificationCounts };
        if (active && data?.counts) {
          const currentTab = getTabFromPathname(pathname);
          const next = { ...data.counts };

          if (currentTab && (currentTab === "projects" || currentTab === "tasks" || currentTab === "messages" || currentTab === "users")) {
            next[currentTab] = 0;
          }

          next.dashboard = (next.tasks ?? 0) + (next.messages ?? 0);
          setNotificationCounts(next);
        }
      } catch {
        // noop: silently keep previous badges if polling fails
      }
    };

    pullNotifications();
    const intervalId = window.setInterval(pullNotifications, 25000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [pathname, seenAtByTab]);

  return (
    <div className="min-h-screen bg-transparent md:flex">
      <Sidebar
        role={role}
        firstName={firstName}
        lastName={lastName}
        notificationCounts={notificationCounts}
        mobileOpen={mobileOpen}
        desktopCollapsed={desktopCollapsed}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {mobileOpen && (
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/55 backdrop-blur-[1px] md:hidden"
          aria-label="Fermer le menu"
        />
      )}

      <div className="relative flex min-h-screen flex-1 flex-col">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_72%_10%,rgba(14,165,233,0.08),transparent_32%),radial-gradient(circle_at_12%_88%,rgba(16,185,129,0.08),transparent_26%)]" />
        <Navbar
          role={role}
          firstName={firstName}
          desktopCollapsed={desktopCollapsed}
          onToggleDesktopSidebar={() => setDesktopCollapsed((prev) => !prev)}
          onToggleMobileSidebar={() => setMobileOpen((prev) => !prev)}
        />
        <main className="flex-1 px-4 py-5 md:px-7 md:py-7">
          <div className="mx-auto w-full max-w-[1280px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
