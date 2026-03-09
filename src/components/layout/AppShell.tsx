"use client";

import { Role } from "@prisma/client";
import { useState } from "react";

import Navbar from "@/components/navbar/Navbar";
import Sidebar from "@/components/sidebar/Sidebar";

type AppShellProps = {
  role: Role;
  firstName: string;
  lastName: string;
  children: React.ReactNode;
};

export default function AppShell({ role, firstName, lastName, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-transparent md:flex">
      <Sidebar
        role={role}
        firstName={firstName}
        lastName={lastName}
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
