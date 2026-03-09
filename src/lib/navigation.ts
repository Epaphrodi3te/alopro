import { Role } from "@prisma/client";

export type NavKey = "dashboard" | "users" | "projects" | "tasks" | "messages" | "settings";
export type NavNotificationCounts = Partial<Record<NavKey, number>>;

export type NavItem = {
  key: NavKey;
  href: string;
  label: string;
};

export function getRoleLabel(role: Role) {
  if (role === "admin") {
    return "Admin";
  }

  if (role === "manager") {
    return "Manager";
  }

  return "Agent";
}

export function getMenuByRole(role: Role): NavItem[] {
  if (role === "admin") {
    return [
      { key: "dashboard", href: "/dashboard", label: "Accueil" },
      { key: "users", href: "/users", label: "Gestion des utilisateurs" },
      { key: "projects", href: "/projects", label: "Projets" },
      { key: "tasks", href: "/tasks", label: "Taches" },
      { key: "messages", href: "/messages", label: "Messages" },
      { key: "settings", href: "/settings", label: "Parametres" },
    ];
  }

  if (role === "manager") {
    return [
      { key: "dashboard", href: "/dashboard", label: "Dashboard" },
      { key: "projects", href: "/projects", label: "Projets" },
      { key: "tasks", href: "/tasks", label: "Taches" },
      { key: "messages", href: "/messages", label: "Messages" },
      { key: "settings", href: "/settings", label: "Parametres" },
    ];
  }

  return [
    { key: "dashboard", href: "/dashboard", label: "Dashboard" },
    { key: "projects", href: "/projects", label: "Projets assignes" },
    { key: "tasks", href: "/tasks", label: "Taches assignees" },
    { key: "messages", href: "/messages", label: "Messages" },
    { key: "settings", href: "/settings", label: "Parametres" },
  ];
}
