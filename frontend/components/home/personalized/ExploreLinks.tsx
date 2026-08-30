import Link from "next/link";

interface Row {
  href: string;
  emoji: string;
  label: string;
  sub: string;
  /** Bengali row — needs lang="bn" + .font-bn or the glyphs render as boxes. */
  bn?: boolean;
}

const ROWS: Row[] = [
  { href: "/dsestockranking", emoji: "🏆", label: "Stock Rankings", sub: "Every company scored, best first" },
  { href: "/dse-trending-stocks", emoji: "🚀", label: "Trending stocks", sub: "Biggest 7-day gainers" },
  { href: "/stock-insights", emoji: "📋", label: "Ready-made lists", sub: "Dividends, growth, big companies and more" },
  { href: "/stocks", emoji: "🔠", label: "Browse Stocks", sub: "Every DSE stock, A–Z" },
  { href: "/blog", emoji: "📖", label: "বাংলা ব্লগ", sub: "সহজ ভাষায় শেয়ার বাজার", bn: true },
];

/** Flat "where else to look" rows closing the Explore aside — one tappable row
 *  per discovery page, no preview tables (the full pages are one tap away).
 *  Replaced DiscoverCard (ranked preview + entry rows) and CoreFeatureTiles. */
export default function ExploreLinks() {
  return (
    <nav aria-label="Explore the market" className="flex flex-col gap-2">
      {ROWS.map((r) => (
        <Link
          key={r.href}
          prefetch={false}
          href={r.href}
          lang={r.bn ? "bn" : undefined}
          className={`flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 transition-colors hover:bg-[var(--surface-2)]${r.bn ? " font-bn" : ""}`}
        >
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-base"
            style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
            aria-hidden
          >
            {r.emoji}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.9rem] font-bold leading-tight text-[var(--text)]">{r.label}</span>
            <span className="block truncate text-[0.7rem] text-[var(--text-muted)]">{r.sub}</span>
          </span>
          <span className="shrink-0 text-sm font-bold text-[var(--primary)]" aria-hidden>
            →
          </span>
        </Link>
      ))}
    </nav>
  );
}
