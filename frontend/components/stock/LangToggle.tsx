"use client";

import { useStockLang } from "@/context/StockLangContext";

export type Lang = "en" | "bn";

interface Props {
  value: Lang;
  onChange: (lang: Lang) => void;
  /** Smaller type for tight rows (eyebrows, card headers); the tap target stays 40px. */
  size?: "sm" | "md";
  className?: string;
}

/**
 * EN / বাংলা segmented switch. Purely the control — the caller owns the value.
 * Both halves are at least 40px tall (the audience taps on phones).
 */
export default function LangToggle({ value, onChange, size = "md", className = "" }: Props) {
  const pad = size === "sm" ? "px-2.5 text-xs" : "px-3 text-sm";
  const opts: { key: Lang; label: string }[] = [
    { key: "en", label: "English" },
    { key: "bn", label: "বাংলা" },
  ];
  return (
    <div
      role="tablist"
      aria-label="Language"
      className={`inline-flex rounded-full p-0.5 bg-surface-2 border border-border ${className}`}
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
            } ${active ? "bg-primary text-surface" : "bg-transparent text-text-muted hover:text-text-main"}`}
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
