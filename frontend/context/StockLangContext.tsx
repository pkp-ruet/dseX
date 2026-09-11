"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Lang } from "@/components/stock/LangToggle";

const LANG_KEY = "dsex.analysis.lang";

interface StockLangValue {
  lang: Lang;
  setLang: (l: Lang) => void;
}

const StockLangContext = createContext<StockLangValue>({ lang: "en", setLang: () => {} });

/**
 * One language switch for the whole `/stock/[code]` page.
 *
 * The server always renders English (SEO + a stable first paint). After mount
 * the saved choice wins; with no saved choice a Bengali-language browser gets
 * Bengali by default — the audience is Bengali and the toggle used to default
 * to English until someone found it. Every language-aware section (verdict,
 * value box, health check, position card…) reads from here, so one tap on the
 * toggle flips the page, not one card.
 */
export function StockLangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved === "bn" || saved === "en") {
        setLangState(saved);
        return;
      }
      const nav = (navigator.language || "").toLowerCase();
      const all = (navigator.languages || []).map((l) => l.toLowerCase());
      if (nav.startsWith("bn") || all.some((l) => l.startsWith("bn"))) setLangState("bn");
    } catch {}
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(LANG_KEY, l); } catch {}
  }, []);

  return <StockLangContext.Provider value={{ lang, setLang }}>{children}</StockLangContext.Provider>;
}

export function useStockLang(): StockLangValue {
  return useContext(StockLangContext);
}
