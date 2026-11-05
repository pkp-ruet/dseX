/**
 * Light / dark screen (2026-11-06). Plain constants shared by the server
 * layout (boot script) and `components/layout/ThemeSwitch.tsx`, kept out of
 * any "use client" file so the server gets real values.
 *
 * `<html data-theme>` is what the CSS reads (`:root[data-theme="dark"]` in
 * globals.css); `<html data-theme-pref>` is the reader's choice, which the
 * switch highlights straight from CSS so it is right before React hydrates.
 */

export type ThemePref = "light" | "dark" | "auto";

export const THEME_KEY = "dsex.theme";

/** First visit follows the phone / computer's own setting. */
export const DEFAULT_THEME: ThemePref = "auto";

/** Browser chrome colours (themeColor) — the navbar's surface in each mode. */
export const THEME_CHROME = { light: "#FCFBF8", dark: "#1F1C19" } as const; // themeColor

/**
 * Runs in `<head>` before the first paint: resolves the saved choice (else
 * auto) to light or dark, sets `data-theme`, `data-theme-pref` and
 * `color-scheme` on `<html>`, keeps the browser's theme-color in step, follows
 * the system setting live while on auto, and exposes `window.__dsexSetTheme`
 * for the switch.
 */
export const THEME_BOOT_SCRIPT = `(function(){var K=${JSON.stringify(THEME_KEY)},L=${JSON.stringify(
  THEME_CHROME.light,
)},D=${JSON.stringify(THEME_CHROME.dark)},d=document.documentElement,p;try{p=localStorage.getItem(K);}catch(e){}if(p!=="light"&&p!=="dark")p="auto";var m=window.matchMedia?window.matchMedia("(prefers-color-scheme: dark)"):null;function meta(t){var n=document.querySelectorAll('meta[name="theme-color"]');for(var i=0;i<n.length;i++)n[i].setAttribute("content",t==="dark"?D:L);}function set(){var t=p==="auto"?(m&&m.matches?"dark":"light"):p;d.setAttribute("data-theme",t);d.setAttribute("data-theme-pref",p);d.style.colorScheme=t;meta(t);}set();document.addEventListener("DOMContentLoaded",function(){meta(d.getAttribute("data-theme"));});if(m){var f=function(){if(p==="auto")set();};if(m.addEventListener)m.addEventListener("change",f);else if(m.addListener)m.addListener(f);}window.__dsexSetTheme=function(n){p=n==="light"||n==="dark"?n:"auto";try{localStorage.setItem(K,p);}catch(e){}set();};})();`;
