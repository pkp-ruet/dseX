import Bn from "@/components/i18n/Bn";
import type { TrustStats } from "@/lib/api";

/**
 * Block 2 — the credibility signal, compressed to a strip.
 *
 * This replaces a full-height trust section that sat here and buried the page's
 * features under prose. Same job, a fraction of the words: the checkable numbers
 * in one row, one sentence on where the data comes from, and nothing else.
 *
 * The figures are tiles that span the full width of the card — four across on a
 * desktop, 2×2 on a phone — each with its own accent hairline, so the row reads
 * as a set of distinct facts rather than a grey table with dead space beside it.
 */

interface Figure {
  value: string;
  label: string;
  accent: string;
}

/** Column count on desktop — written out so Tailwind's JIT can see the class. */
const COLS: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
};

function Item({ value, label, accent }: Figure) {
  return (
    <div
      className="acc-top rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 sm:px-3.5"
      style={{ "--acc": accent } as React.CSSProperties}
    >
      <span
        className="font-display block text-[1.5rem] font-extrabold leading-none tabular-nums nums sm:text-[1.7rem]"
        style={{ color: accent }}
      >
        {value}
      </span>
      <span className="mt-1.5 block text-[0.68rem] font-semibold leading-tight text-[var(--text-muted)]">
        {label}
      </span>
    </div>
  );
}

export default function TrustStrip({
  totalCount,
  sectorCount,
  trust,
}: {
  totalCount: number;
  sectorCount: number;
  trust: TrustStats | null;
}) {
  const users = trust?.user_count ?? 0;
  const avg = trust?.review_average ?? null;
  const reviews = trust?.review_count ?? 0;

  // Built as a list so a missing figure (no reviews yet, say) shortens the row
  // instead of leaving a hole in it.
  const figures: Figure[] = [
    { value: `${totalCount}`, label: "Companies scored", accent: "var(--info)" },
  ];
  if (sectorCount > 0) {
    figures.push({ value: `${sectorCount}`, label: "Sectors covered", accent: "var(--primary)" });
  }
  if (users > 0) {
    figures.push({
      value: users.toLocaleString("en-US"),
      label: "People signed up",
      accent: "var(--positive)",
    });
  }
  if (avg != null && reviews > 0) {
    figures.push({
      value: `★ ${avg.toFixed(1)}`,
      label: `${reviews} ratings`,
      accent: "var(--gold-ink)",
    });
  }

  return (
    <section
      aria-label="Coverage and sources"
      className="acc-panel px-4 py-5 sm:px-6"
      style={{ "--acc": "var(--info)" } as React.CSSProperties}
    >
      {/* Four tiles across the full width of the card — 2×2 on a phone. */}
      <div className={`grid grid-cols-2 gap-3 ${COLS[figures.length] ?? "sm:grid-cols-4"}`}>
        {figures.map((f) => (
          <Item key={f.label} {...f} />
        ))}
      </div>

      <div
        className="mt-5 flex items-start gap-3 border-t pt-4"
        style={{ borderColor: "color-mix(in srgb, var(--info) 18%, var(--border))" }}
      >
        <span
          className="icon-tile icon-tile-sm mt-0.5"
          style={{ "--acc": "var(--info)" } as React.CSSProperties}
          aria-hidden
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l7.5 3.6v5.2c0 4.3-3 8.1-7.5 9.2-4.5-1.1-7.5-4.9-7.5-9.2V6.6z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-[0.85rem] font-semibold leading-relaxed text-[var(--text)]">
            No tips, no rumours — every figure comes from what companies publish and from
            each day&apos;s market data.
          </p>
          <Bn className="mt-1 text-[0.85rem] leading-relaxed text-[var(--text-muted)]">
            কোনো টিপস নয়, গুজব নয় — সব হিসাব কোম্পানির প্রকাশিত আর্থিক প্রতিবেদন আর প্রতিদিনের বাজার
            ডেটা থেকে।
          </Bn>
        </div>
      </div>
    </section>
  );
}
