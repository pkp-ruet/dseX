import Link from "next/link";

/**
 * The "what should I buy?" pages as ONE set of tabs (2026-10-25): Buy signals ·
 * Trending · Popular · Find my stocks. They stay separate URLs (each answers its
 * own search), but a reader moves between them like tabs of one page instead
 * of hunting through a link grid. /top-picks and /daily-tips were folded into
 * /buy-sell-signals (301s in next.config.ts).
 */
const TABS = [
  { href: "/buy-sell-signals", label: "Buy signals" },
  { href: "/dse-trending-stocks", label: "Trending" },
  { href: "/dse-popular-stocks", label: "Popular" },
  { href: "/stock-recommendation", label: "Find my stocks" },
] as const;

export type FindTab = (typeof TABS)[number]["href"];

export default function FindTabs({ current }: { current: FindTab }) {
  return (
    <nav aria-label="Ways to find a stock" className="mb-5 flex flex-wrap gap-1">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`btn-tab shrink-0${t.href === current ? " is-active" : ""}`}
          aria-current={t.href === current ? "page" : undefined}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
