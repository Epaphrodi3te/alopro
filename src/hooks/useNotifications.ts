"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { getDashboardNotificationCount, NavKey, NavNotificationCounts } from "@/lib/navigation";

const EPOCH_ISO = new Date(0).toISOString();

type TabKey = "projects" | "tasks" | "messages" | "users" | "files";

function getTabFromPathname(pathname: string): NavKey | null {
  if (pathname.startsWith("/projects")) return "projects";
  if (pathname.startsWith("/tasks")) return "tasks";
  if (pathname.startsWith("/messages")) return "messages";
  if (pathname.startsWith("/users")) return "users";
  if (pathname.startsWith("/files")) return "files";
  return null;
}

export function useNotifications(
  userId: string,
  initialCounts: NavNotificationCounts,
) {
  const pathname = usePathname();
  const tabStorageKey = `alopro:seen-notifications:v3:${userId}`;

  const [notificationCounts, setNotificationCounts] = useState<NavNotificationCounts>(initialCounts);
  const [seenAtByTab, setSeenAtByTab] = useState<Record<TabKey, string> | null>(null);

  useEffect(() => {
    setNotificationCounts(initialCounts);
  }, [initialCounts]);

  // Initialize seenAt from localStorage
  useEffect(() => {
    const fallback: Record<TabKey, string> = {
      projects: EPOCH_ISO,
      tasks: EPOCH_ISO,
      messages: EPOCH_ISO,
      users: EPOCH_ISO,
      files: EPOCH_ISO,
    };

    try {
      const raw = localStorage.getItem(tabStorageKey);
      if (!raw) {
        localStorage.setItem(tabStorageKey, JSON.stringify(fallback));
        setSeenAtByTab(fallback);
        return;
      }

      const parsed = JSON.parse(raw) as Partial<Record<TabKey, string>>;
      const normalized: Record<TabKey, string> = {
        projects: parsed.projects ?? EPOCH_ISO,
        tasks: parsed.tasks ?? EPOCH_ISO,
        messages: parsed.messages ?? EPOCH_ISO,
        users: parsed.users ?? EPOCH_ISO,
        files: parsed.files ?? EPOCH_ISO,
      };

      localStorage.setItem(tabStorageKey, JSON.stringify(normalized));
      setSeenAtByTab(normalized);
    } catch {
      localStorage.setItem(tabStorageKey, JSON.stringify(fallback));
      setSeenAtByTab(fallback);
    }
  }, [tabStorageKey]);

  // Mark current tab as seen
  useEffect(() => {
    const currentTab = getTabFromPathname(pathname) as TabKey | null;
    if (!currentTab || !["projects", "tasks", "messages", "users", "files"].includes(currentTab)) {
      return;
    }

    const now = new Date().toISOString();

    setSeenAtByTab((previous) => {
      if (!previous) return previous;
      const next = { ...previous, [currentTab]: now };
      localStorage.setItem(tabStorageKey, JSON.stringify(next));
      return next;
    });

    setNotificationCounts((previous) => {
      const next = { ...previous, [currentTab]: 0 };
      next.dashboard = getDashboardNotificationCount(next);
      return next;
    });
  }, [pathname, tabStorageKey]);

  // Poll notifications
  useEffect(() => {
    if (!seenAtByTab) return;

    let active = true;

    const pullNotifications = async () => {
      try {
        const params = new URLSearchParams({
          projectsSince: seenAtByTab.projects,
          tasksSince: seenAtByTab.tasks,
          messagesSince: seenAtByTab.messages,
          usersSince: seenAtByTab.users,
          filesSince: seenAtByTab.files,
        });

        const response = await fetch(`/api/notifications?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) return;

        const data = (await response.json()) as { counts?: NavNotificationCounts };
        if (active && data?.counts) {
          const currentTab = getTabFromPathname(pathname) as TabKey | null;
          const next = { ...data.counts };

          if (currentTab && ["projects", "tasks", "messages", "users", "files"].includes(currentTab)) {
            next[currentTab] = 0;
          }

          next.dashboard = getDashboardNotificationCount(next);
          setNotificationCounts(next);
        }
      } catch {
        // silently keep previous badges
      }
    };

    pullNotifications();
    const intervalId = window.setInterval(pullNotifications, 5000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        pullNotifications();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [pathname, seenAtByTab]);

  return notificationCounts;
}
