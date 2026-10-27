"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { DEFAULT_LANG, LANG_KEY, type Lang } from "@/lib/lang";

export type { Lang };

interface LangValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Bengali on / off — the common test in components. */
  bn: boolean;
}

const LangContext = createContext<LangValue>({ lang: DEFAULT_LANG, setLang: () => {}, bn: true });

/**
 * The one English / বাংলা switch for the whole app; the control is
 * `components/layout/LangSwitch.tsx` in the navbar. Visible text switches
 * through CSS (`<T>`), so `lang` here is only for what CSS can't reach:
 * placeholders, toasts, aria-labels and logic. It starts at the server's
 * default and picks up the boot script's value on mount.
 */
export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    const now = document.documentElement.getAttribute("data-lang");
    if (now === "en" || now === "bn") setLangState(now);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    const root = document.documentElement;
    root.setAttribute("data-lang", l);
    root.lang = l;
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {}
  }, []);

  return <LangContext.Provider value={{ lang, setLang, bn: lang === "bn" }}>{children}</LangContext.Provider>;
}

export function useLang(): LangValue {
  return useContext(LangContext);
}
