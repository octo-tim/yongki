import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { I18nProvider } from "@/components/i18n-provider";
import { Locale, DEFAULT_LOCALE, LOCALES } from "@/lib/i18n";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const cookieLocale = cookies().get("locale")?.value as Locale | undefined;
  const locale: Locale = cookieLocale && LOCALES.includes(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  return (
    <I18nProvider initialLocale={locale}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar userName={session.user?.name} userRole={(session.user as any).role} />
        <main className="flex-1 overflow-y-auto bg-muted/20">{children}</main>
      </div>
    </I18nProvider>
  );
}
