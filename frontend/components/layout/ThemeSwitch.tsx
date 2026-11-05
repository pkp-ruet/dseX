"use client";

import type { ReactElement } from "react";
import { T } from "@/components/i18n/T";
import { IconMoon, IconPhoneHalf, IconSun } from "@/components/ui/icons";
import type { ThemePref } from "@/lib/theme";

declare global {
  interface Window {
    __dsexSetTheme?: (pref: ThemePref) => void;
  }
}

function setTheme(pref: ThemePref) {
  window.__dsexSetTheme?.(pref);
}

const OPTIONS: { key: ThemePref; en: string; bn: string; Icon: (p: { size?: number }) => ReactElement }[] = [
  { key: "light", en: "Light", bn: "উজ্জ্বল", Icon: IconSun },
  { key: "dark", en: "Dark", bn: "অন্ধকার", Icon: IconMoon },
  { key: "auto", en: "Like my phone", bn: "ফোনের মতো", Icon: IconPhoneHalf },
];

/**
 * THE light / dark switch, in the menu (phones and desktop). Which option is
 * highlighted comes from CSS on `<html data-theme-pref>` (`.theme-switch` in
 * app/styles/nav.css), so it is right on first paint.
 */
export default function ThemeSwitch() {
  return (
    <div className="theme-switch">
      <span className="theme-switch-label" id="theme-switch-label">
        <T en="Screen" bn="স্ক্রিন" />
      </span>
      <div role="group" aria-labelledby="theme-switch-label" className="theme-switch-opts">
        {OPTIONS.map(({ key, en, bn, Icon }) => (
          <button key={key} type="button" data-opt={key} onClick={() => setTheme(key)}>
            <Icon size={16} />
            <T en={en} bn={bn} />
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * The navbar's one-tap toggle (desktop row): flips between light and dark
 * from whatever is on screen now. The moon shows in light mode, the sun in
 * dark mode — both are in the HTML, CSS shows one.
 */
export function ThemeToggleButton({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      className={`navbar-link theme-toggle ${className}`.trim()}
      onClick={() => {
        const now = document.documentElement.getAttribute("data-theme");
        setTheme(now === "dark" ? "light" : "dark");
      }}
      aria-label="Light or dark screen / উজ্জ্বল বা অন্ধকার স্ক্রিন"
      title="Light or dark screen"
    >
      <span className="theme-toggle-moon"><IconMoon size={16} /></span>
      <span className="theme-toggle-sun"><IconSun size={16} /></span>
    </button>
  );
}
