import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { PortalHeader } from "@/components/portal-header";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "CLIENT") redirect("/portal-login");

  return (
    <div className="min-h-screen bg-muted/20">
      <PortalHeader clientName={(session.user as any).clientName} userName={session.user?.name} />
      <main className="mx-auto max-w-5xl p-4 sm:p-6">{children}</main>
    </div>
  );
}
