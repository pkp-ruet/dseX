import Link from "next/link";

const BROWSE_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="18" x2="20" y2="18" />
  </svg>
);

export default function CoreFeatureTiles() {
  return (
    <div className="grid grid-cols-1">
      <Link
        href="/stocks"
        className="group flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_4px_16px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-lg"
      >
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--primary)]"
          style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
          aria-hidden
        >
          {BROWSE_ICON}
        </span>
        <span className="min-w-0">
          <span className="block text-[0.9rem] font-bold leading-tight text-[var(--text)]">Browse Stocks</span>
          <span className="block text-[0.78rem] font-semibold text-[var(--text-muted)]">Every DSE stock, A–Z</span>
        </span>
        <span className="ml-auto text-sm font-semibold text-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity">
          →
        </span>
      </Link>
    </div>
  );
}
