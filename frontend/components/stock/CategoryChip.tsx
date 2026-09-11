"use client";

import { useState } from "react";
import { IconAlert, IconChevron } from "@/components/stock/StockIcons";

interface Props {
  category: string;
  note: string;
  color: string;
  bg: string;
  border: string;
}

/**
 * The DSE category chip. The explanation used to live in a `title` tooltip,
 * which never appears on a touchscreen — so the chip is a button that opens
 * the one-line explanation under the chip row.
 */
export default function CategoryChip({ category, note, color, bg, border }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`cat-note-${category}`}
        className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full"
        style={{ color, background: bg, border: `1px solid ${border}` }}
      >
        {category === "Z" && <IconAlert size={12} />}
        Category {category}
        <span style={{ transform: open ? "rotate(180deg)" : "none", display: "inline-flex", transition: "transform .15s" }}>
          <IconChevron size={12} />
        </span>
      </button>
      {open && (
        <p
          id={`cat-note-${category}`}
          className="basis-full text-xs leading-snug rounded-xl px-3 py-2 mt-1"
          style={{ color, background: bg, border: `1px solid ${border}` }}
        >
          {note}
        </p>
      )}
    </>
  );
}
