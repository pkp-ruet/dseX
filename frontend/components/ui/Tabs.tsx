"use client";

import { useRef, type KeyboardEvent } from "react";
import Button from "@/components/ui/Button";

/**
 * THE segmented tabs (2026-10 redesign, step 0): a row of `Button variant="tab"`
 * with tablist semantics and arrow-key movement. It only switches; the caller
 * renders the active panel (give it `role="tabpanel"` + `aria-labelledby` =
 * `${idBase}-${key}`).
 */
export default function Tabs<K extends string>({
  tabs,
  value,
  onChange,
  ariaLabel,
  idBase = "tab",
  className = "",
}: {
  tabs: { key: K; label: string }[];
  value: K;
  onChange: (key: K) => void;
  ariaLabel: string;
  idBase?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = tabs.findIndex((t) => t.key === value);
    const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
    onChange(next.key);
    ref.current?.querySelector<HTMLButtonElement>(`#${CSS.escape(`${idBase}-${next.key}`)}`)?.focus();
    e.preventDefault();
  };

  return (
    <div
      ref={ref}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKey}
      className={`no-scrollbar flex gap-2 overflow-x-auto ${className}`.trim()}
    >
      {tabs.map((t) => {
        const on = t.key === value;
        return (
          <Button
            key={t.key}
            id={`${idBase}-${t.key}`}
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            variant="tab"
            size="sm"
            active={on}
            onClick={() => onChange(t.key)}
            className="shrink-0 whitespace-nowrap"
          >
            {t.label}
          </Button>
        );
      })}
    </div>
  );
}
