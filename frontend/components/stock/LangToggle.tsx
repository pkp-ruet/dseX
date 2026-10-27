"use client";

import { useStockLang } from "@/context/StockLangContext";

export type Lang = "en" | "bn";

interface Props {
  value: Lang;
  onChange: (lang: Lang) => void;
  /** Smaller type for tight rows (eyebrows, card headers); the tap target stays 40px. */
  size?: "sm" | "md";
  /** solid = clay fill on the chosen half · quiet = white raised segment, ink text (calm headers). */
  tone?: "solid" | "quiet";
  className?: string;
}

/**
 * EN / বাংলা segmented switch. Purely the control — the caller owns the value.
 * Both halves are at least 40px tall (the audience taps on phones).
 */
export default function LangToggle({ value, onChange, size = "md", tone = "solid", className = "" }: Props) {
  const pad = size === "sm" ? "px-3 text-xs" : "px-3 text-sm";
  const on = tone === "quiet" ? "bg-surface text-text-main shadow-soft" : "bg-primary text-surface";
  const track = tone === "quiet" ? "bg-surface-2" : "bg-surface-2 border border-border";
  const opts: { key: Lang; label: string }[] = [
    { key: "en", label: "English" },
    { key: "bn", label: "বাংলা" },
  ];
  return (
    <div
      role="tablist"
      aria-label="Language"
      className={`inline-flex rounded-full p-0.5 ${track} ${className}`}
    >
      {opts.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(o.key)}
            className={`${pad} min-h-10 inline-flex items-center rounded-full font-semibold transition-colors ${
              o.key === "bn" ? "font-bn" : ""
            } ${active ? on : "bg-transparent text-text-muted hover:text-text-main"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The same control wired to the app-wide language (`useStockLang`, a shim over
 * `LangContext`). Server components (the stock hero) can drop this in directly.
 */
export function StockLangToggle({ size = "md", className = "" }: { size?: "sm" | "md"; className?: string }) {
  const { lang, setLang } = useStockLang();
  return <LangToggle value={lang} onChange={setLang} size={size} className={className} />;
}
