import Link from "next/link";
import type { PopularStockItem } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { money } from "@/lib/formatters";
import { t } from "@/lib/home-copy";
import DashHeader from "@/components/home/personalized/DashHeader";
import OwnerMark from "@/components/home/personalized/OwnerMark";

const ROWS = 5;

/** The most-viewed stocks on TopStockBD — what other readers are checking. */
export default function PopularCard({
  items,
  held,
  watched,
  lang = "en",
}: {
  items: PopularStockItem[];
  held: Set<string>;
  watched: Set<string>;
  lang?: Lang;
}) {
  const bn = lang === "bn";
  const rows = items.slice(0, ROWS);
  if (rows.length === 0) return null;
  return (
    <section className={`soft-card overflow-hidden ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
      <DashHeader title={t(lang, "popularTitle")} href="/dse-popular-stocks" linkLabel={t(lang, "seeAll")} />
      <ol className="divide-y divide-[var(--cell-rule)]">
        {rows.map((it, i) => {
          const chg = it.change_pct;
          const chgColor = chg == null ? "var(--text-muted)" : chg >= 0 ? "var(--positive)" : "var(--negative)";
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
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.68rem] font-bold tracking-wide text-[var(--text-muted)]">
                    <span className="font-mono">{it.trading_code}</span>
                    <span className="tabular-nums nums">{t(lang, "views", { n: it.visits_total.toLocaleString("en-US") })}</span>
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[0.86rem] font-bold tabular-nums nums text-[var(--text)]">{money(it.ltp)}</span>
                  {chg != null && (
                    <span className="block text-[0.75rem] font-semibold tabular-nums nums" style={{ color: chgColor }}>
                      {chg >= 0 ? "▲" : "▼"} {Math.abs(chg).toFixed(1)}%
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
