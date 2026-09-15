import Link from "next/link";
import type { Top20Item } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { money } from "@/lib/formatters";
import { t } from "@/lib/home-copy";
import DashHeader, { HeaderChip } from "@/components/home/personalized/DashHeader";
import OwnerMark from "@/components/home/personalized/OwnerMark";

const ROWS = 5;

/** This week's strongest movers with real trading behind them (the top-20
 *  momentum list), five rows: rank, name, the 7-day move, one plain line. */
export default function TrendingCard({
  items,
  held,
  watched,
  lang = "en",
}: {
  items: Top20Item[];
  held: Set<string>;
  watched: Set<string>;
  lang?: Lang;
}) {
  const bn = lang === "bn";
  const rows = items.slice(0, ROWS);
  if (rows.length === 0) return null;
  return (
    <section className={`soft-card overflow-hidden ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
      <DashHeader
        title={t(lang, "trendingTitle")}
        chips={<HeaderChip>{t(lang, "sevenDay")}</HeaderChip>}
        href="/dse-trending-stocks"
        linkLabel={t(lang, "allTrending")}
      />
      <ol className="divide-y divide-[var(--cell-rule)]">
        {rows.map((it, i) => {
          const r7 = it.return_7d_pct;
          const up = (r7 ?? 0) >= 0;
          const color = r7 == null ? "var(--text-muted)" : up ? "var(--positive)" : "var(--negative)";
          const line = bn
            ? r7 != null
              ? t(lang, up ? "upLastWeek" : "downLastWeek", { n: Math.abs(r7).toFixed(1) })
              : ""
            : it.rationale || (r7 != null ? t(lang, up ? "upLastWeek" : "downLastWeek", { n: Math.abs(r7).toFixed(1) }) : "");
          return (
            <li key={it.trading_code}>
              <Link
                prefetch={false}
                href={`/stock/${it.trading_code}`}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--surface-2)] active:bg-[var(--surface-2)] sm:px-5"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--surface-2)] text-[0.75rem] font-black tabular-nums text-[var(--text-muted)]" aria-hidden>
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[0.9rem] font-bold leading-tight text-[var(--text)]">{it.company_name ?? it.trading_code}</span>
                    <OwnerMark code={it.trading_code} held={held} watched={watched} lang={lang} />
                  </span>
                  {line && <span className="mt-0.5 block truncate text-[0.75rem] text-[var(--text-muted)]">{line}</span>}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[0.86rem] font-bold tabular-nums nums text-[var(--text)]">{money(it.ltp)}</span>
                  {r7 != null && (
                    <span className="inline-block rounded-md px-1.5 py-0.5 text-[0.75rem] font-bold tabular-nums nums" style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)` }}>
                      {up ? "▲" : "▼"} {Math.abs(r7).toFixed(1)}%
                    </span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
