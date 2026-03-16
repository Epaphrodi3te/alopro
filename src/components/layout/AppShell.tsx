"use client";

import { Role } from "@prisma/client";
import { useState } from "react";

import Navbar from "@/components/navbar/Navbar";
import Sidebar from "@/components/sidebar/Sidebar";
import { useNotifications } from "@/hooks/useNotifications";
import { NavNotificationCounts } from "@/lib/navigation";

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const notificationCounts = useNotifications(userId, initialNotificationCounts);

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
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
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm md:hidden"
          aria-label="Fermer le menu"
        />
      )}

      <div className="relative flex min-h-screen flex-1 flex-col">
        <Navbar
          role={role}
          firstName={firstName}
          desktopCollapsed={desktopCollapsed}
          onToggleDesktopSidebar={() => setDesktopCollapsed((prev) => !prev)}
          onToggleMobileSidebar={() => setMobileOpen((prev) => !prev)}
        />
        <main className="flex-1 px-4 py-5 md:px-6 md:py-6">
          <div className="mx-auto w-full max-w-[1280px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
