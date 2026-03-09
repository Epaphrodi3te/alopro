import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "AloPro",
  description: "Plateforme professionnelle de gestion de projets et taches",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="bg-slate-100 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
