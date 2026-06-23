"use client";
import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";
import { Languages } from "lucide-react";

export function LanguageToggle({ collapsed }: { collapsed?: boolean }) {
  const { locale, setLocale } = useI18n();

  if (collapsed) {
    return (
      <button onClick={() => setLocale(locale === "ko" ? "zh" : "ko")} title="한국어 / 中文"
        className="flex h-9 w-9 items-center justify-center rounded-lg border text-xs font-bold hover:bg-accent">
        {locale === "ko" ? "中" : "한"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Languages className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="inline-flex rounded-full border p-0.5 text-xs">
        <button onClick={() => setLocale("ko")}
          className={cn("rounded-full px-2.5 py-1 font-medium transition-colors", locale === "ko" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}>
          한국어
        </button>
        <button onClick={() => setLocale("zh")}
          className={cn("rounded-full px-2.5 py-1 font-medium transition-colors", locale === "zh" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}>
          中文
        </button>
      </div>
    </div>
  );
}
