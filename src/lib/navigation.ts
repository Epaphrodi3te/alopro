import { Role } from "@prisma/client";

export type NavItem = {
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
      { href: "/dashboard", label: "Accueil" },
      { href: "/users", label: "Gestion des utilisateurs" },
      { href: "/projects", label: "Projets" },
      { href: "/tasks", label: "Taches" },
      { href: "/messages", label: "Messages" },
      { href: "/settings", label: "Parametres" },
    ];
  }

  if (role === "manager") {
    return [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/projects", label: "Projets" },
      { href: "/tasks", label: "Taches" },
      { href: "/messages", label: "Messages" },
      { href: "/settings", label: "Parametres" },
    ];
  }

  return [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/projects", label: "Projets assignes" },
    { href: "/tasks", label: "Taches assignees" },
    { href: "/messages", label: "Messages" },
    { href: "/settings", label: "Parametres" },
  ];
}
