import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userName={session.user?.name} />
      <main className="flex-1 overflow-y-auto bg-muted/20">{children}</main>
    </div>
  );
}
