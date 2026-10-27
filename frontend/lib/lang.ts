/**
 * The site language — plain constants shared by the server layout (boot
 * script), `context/LangContext.tsx` and `components/i18n/T.tsx`. Kept out of
 * the "use client" context file so server components get real values, not
 * client references.
 */

export type Lang = "en" | "bn";

/** Same key the stock page has always used — one saved choice for the whole app. */
export const LANG_KEY = "dsex.analysis.lang";

/** First-time visitors read Bengali (user decision 2026-10-27). */
export const DEFAULT_LANG: Lang = "bn";

/**
 * Runs in `<head>` before the first paint: puts the saved language (else
 * Bengali) on `<html data-lang lang>`, which is what the CSS in `globals.css`
 * reads to show one half of every `<T>`.
 */
export const LANG_BOOT_SCRIPT = `(function(){try{var l=localStorage.getItem(${JSON.stringify(
  LANG_KEY,
)});if(l!=="en"&&l!=="bn")l=${JSON.stringify(DEFAULT_LANG)};var d=document.documentElement;d.setAttribute("data-lang",l);d.lang=l;}catch(e){}})();`;
