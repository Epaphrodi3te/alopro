import Navbar from "@/components/navbar/Navbar";
import Sidebar from "@/components/sidebar/Sidebar";
import { requireUser } from "@/lib/auth";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUser();

  return (
    <div className="min-h-screen bg-slate-100 md:flex">
      <Sidebar role={user.role} firstName={user.firstName} lastName={user.lastName} />

      <div className="flex min-h-screen flex-1 flex-col">
        <Navbar role={user.role} firstName={user.firstName} />
        <main className="flex-1 px-5 py-6 md:px-7">{children}</main>
      </div>
    </div>
  );
}
