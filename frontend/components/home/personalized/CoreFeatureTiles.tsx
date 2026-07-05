import Link from "next/link";

const BROWSE_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="18" x2="20" y2="18" />
  </svg>
);

const BOOK_ICON = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

/** Quick-links row closing the Explore section: Browse A–Z + the Bengali blog,
 *  side by side. (The blog link used to sit as a lone pill at the top of the
 *  section; utilities now live together at the end.) */
export default function CoreFeatureTiles() {
  return (
    <div className="grid grid-cols-2 gap-3">
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
      </Link>

      <Link
        href="/blog"
        lang="bn"
        aria-label="বাংলা ব্লগ — সহজ ভাষায় শেয়ার বাজার শিখুন"
        className="font-bn group flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_4px_16px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-0.5 hover:border-[var(--positive)] hover:shadow-lg"
      >
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--positive)]"
          style={{ background: "color-mix(in srgb, var(--positive) 12%, transparent)" }}
          aria-hidden
        >
          {BOOK_ICON}
        </span>
        <span className="min-w-0">
          <span className="block text-[0.9rem] font-bold leading-tight text-[var(--text)]">বাংলা ব্লগ</span>
          <span className="block text-[0.78rem] font-semibold text-[var(--text-muted)]">সহজ ভাষায় শেয়ার বাজার</span>
        </span>
      </Link>
    </div>
  );
}
