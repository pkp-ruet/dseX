import Link from "next/link";
import type { MarketIndexData } from "@/lib/api";

interface Props {
  marketIndex: MarketIndexData | null;
}

interface Tile {
  label: string;
  href: string;
  icon: React.ReactNode;
  stat: React.ReactNode;
}

const ICON = {
  analysis: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 3v18h18" />
      <path d="M7 14l3-3 3 3 5-6" />
    </svg>
  ),
  browse: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  ),
};

function fmtPct(p: number | null | undefined): React.ReactNode {
  if (p == null) return <span className="text-[var(--text-muted)]">—</span>;
  const up = p >= 0;
  return (
    <span style={{ color: up ? "var(--positive)" : "var(--negative)" }}>
      {up ? "+" : ""}
      {p.toFixed(2)}%
    </span>
  );
}

export default function CoreFeatureTiles({ marketIndex }: Props) {
  const tiles: Tile[] = [
    {
      label: "Market Analysis",
      href: "/market-analysis",
      icon: ICON.analysis,
      stat: <>DSEX {fmtPct(marketIndex?.dsex_change_pct)}</>,
    },
    {
      label: "Browse Stocks",
      href: "/stocks",
      icon: ICON.browse,
      stat: <span className="text-[var(--text-muted)]">All DSE stocks</span>,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
      {tiles.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className="group flex flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-[0_4px_16px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-lg"
        >
          <span className="flex items-center gap-2">
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--primary)]"
              style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
              aria-hidden
            >
              {t.icon}
            </span>
            <span className="text-[0.84rem] font-bold leading-tight text-[var(--text)]">{t.label}</span>
          </span>
          <span className="text-[0.78rem] font-semibold tabular-nums nums text-[var(--text)]">{t.stat}</span>
        </Link>
      ))}
    </div>
  );
}
