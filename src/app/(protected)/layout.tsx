import AppShell from "@/components/layout/AppShell";
import { requireUser } from "@/lib/auth";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUser();

  return (
    <AppShell role={user.role} firstName={user.firstName} lastName={user.lastName}>
      {children}
    </AppShell>
  );
}
