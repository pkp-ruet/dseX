"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "bn";

/** Same key the stock page has always used — one saved choice for the whole app. */
const LANG_KEY = "dsex.analysis.lang";

interface LangValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Bengali on / off — the common test in components. */
  bn: boolean;
}

const LangContext = createContext<LangValue>({ lang: "en", setLang: () => {}, bn: false });

/**
 * One English / বাংলা switch for the whole app (dashboard, stock page, portfolio
 * copy). Mounted once in the root layout.
 *
 * The server always renders English (SEO + a stable first paint). After mount
 * the saved choice wins; with no saved choice a Bengali-language browser gets
 * Bengali by default — the audience is Bengali and an English-only default
 * meant most readers never found the toggle.
 */
export function LangProvider({ children }: { children: ReactNode }) {
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
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {}
  }, []);

  return <LangContext.Provider value={{ lang, setLang, bn: lang === "bn" }}>{children}</LangContext.Provider>;
}

export function useLang(): LangValue {
  return useContext(LangContext);
}
