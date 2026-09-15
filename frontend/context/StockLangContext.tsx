"use client";

import type { ReactNode } from "react";
import { useLang, type Lang } from "@/context/LangContext";

/**
 * Compatibility shim. The stock page's language switch became the app-wide
 * `LangProvider` (root layout) so the dashboard and the stock page share one
 * saved choice. `StockLangProvider` is now a pass-through and `useStockLang`
 * reads the app context — every existing stock component keeps working.
 */
export function StockLangProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useStockLang(): { lang: Lang; setLang: (l: Lang) => void } {
  const { lang, setLang } = useLang();
  return { lang, setLang };
}
