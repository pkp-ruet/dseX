"use client";

export type Lang = "en" | "bn";

interface Props {
  value: Lang;
  onChange: (lang: Lang) => void;
  /** Smaller variant for the teaser card. */
  size?: "sm" | "md";
  className?: string;
}

/**
 * EN / বাংলা segmented switch for the deep-analysis surfaces. Defaults to
 * English elsewhere; this is purely the control. Kept tiny and dependency-free.
 */
export default function LangToggle({ value, onChange, size = "md", className = "" }: Props) {
  const pad = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm";
  const opts: { key: Lang; label: string }[] = [
    { key: "en", label: "English" },
    { key: "bn", label: "বাংলা" },
  ];
  return (
    <div
      role="tablist"
      aria-label="Report language"
      className={`inline-flex rounded-full p-0.5 ${className}`}
      style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
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
            className={`${pad} rounded-full font-semibold transition-colors ${o.key === "bn" ? "font-bn" : ""}`}
            style={{
              background: active ? "var(--primary)" : "transparent",
              color: active ? "#fff" : "var(--text-muted)",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
