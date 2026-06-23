"use client";
import { createContext, useContext, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Locale, DEFAULT_LOCALE, makeT } from "@/lib/i18n";

type I18nValue = { locale: Locale; t: (key: string) => string; setLocale: (l: Locale) => void };
const I18nContext = createContext<I18nValue>({ locale: DEFAULT_LOCALE, t: (k) => k, setLocale: () => {} });

export function useI18n() {
  return useContext(I18nContext);
}

export function I18nProvider({ initialLocale, children }: { initialLocale: Locale; children: React.ReactNode }) {
  const router = useRouter();
  const [locale, setLoc] = useState<Locale>(initialLocale);

  const setLocale = useCallback((l: Locale) => {
    document.cookie = `locale=${l}; path=/; max-age=31536000; samesite=lax`;
    setLoc(l);
    router.refresh();
  }, [router]);

  const t = makeT(locale);
  return <I18nContext.Provider value={{ locale, t, setLocale }}>{children}</I18nContext.Provider>;
}
