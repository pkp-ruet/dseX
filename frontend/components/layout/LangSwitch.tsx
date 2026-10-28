"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLang } from "@/context/LangContext";
import { pairedPath } from "@/lib/i18n-pairs";
import type { Lang } from "@/lib/lang";

const OPTIONS: { key: Lang; label: string }[] = [
  { key: "en", label: "EN" },
  { key: "bn", label: "বাংলা" },
];

/**
 * THE language switch — in the navbar on phones and desktop, nowhere else.
 * The highlighted half comes from CSS on `<html data-lang>` (`.lang-switch` in
 * app/styles/nav.css), so it is right on first paint before React hydrates.
 * A small hairline-framed segmented control: the chosen language wears the
 * same quiet fill as the navbar's current page.
 *
 * On an article that only exists in one language, switching opens its pair in
 * the other language (`pairedPath`); everywhere else the page simply flips.
 */
export default function LangSwitch({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLang();
  const pathname = usePathname();
  const router = useRouter();

  const choose = (to: Lang) => {
    if (to === lang && document.documentElement.getAttribute("data-lang") === to) return;
    setLang(to);
    const pair = pairedPath(pathname ?? "/", to);
    if (pair) router.push(pair);
  };

  return (
    <div role="group" aria-label="Language / ভাষা" className={`lang-switch ${className}`.trim()}>
      {OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          data-opt={o.key}
          lang={o.key}
          aria-pressed={lang === o.key}
          onClick={() => choose(o.key)}
        >
          {/* The button is the 40px tap target; the pill inside is what you see. */}
          <span className="lang-switch-pill">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
