import Link from "next/link";
import type { DseTodayNewsItem } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { formatDate } from "@/lib/formatters";
import { bnDate } from "@/lib/bn";
import { t } from "@/lib/home-copy";
import { ACC } from "@/components/home/personalized/accents";
import { IconNews } from "@/components/home/personalized/DashIcons";
import DashHeader from "@/components/home/personalized/DashHeader";
import OwnerMark from "@/components/home/personalized/OwnerMark";

const ROWS = 5;

/** Market-wide headlines of the day (DSE notices are English). Five rows, each
 *  tapping to the company; "All news" opens the full day. */
export default function MarketNewsCard({
  news,
  held,
  watched,
  lang = "en",
}: {
  news: DseTodayNewsItem[];
  held: Set<string>;
  watched: Set<string>;
  lang?: Lang;
}) {
  const bn = lang === "bn";
  const rows = news.slice(0, ROWS);
  if (rows.length === 0) return null;
  return (
    <section className={`soft-card overflow-hidden ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
      <DashHeader title={t(lang, "marketNewsTitle")} href="/todays-news" linkLabel={t(lang, "allNews")} accent={ACC.navy} icon={<IconNews size={15} />} />
      <ul className="divide-y divide-cell-rule">
        {rows.map((n, i) => {
          const code = n.trading_code && n.trading_code !== "—" ? n.trading_code : null;
          const date = n.post_date ? (bn ? bnDate(n.post_date) : formatDate(n.post_date)) : "";
          const inner = (
            <>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  {code && <span className="ticker-tag ticker-tag--static shrink-0 text-xs">{code}</span>}
                  {code && <OwnerMark code={code} held={held} watched={watched} lang={lang} />}
                  {date && <span className="text-xs font-medium text-text-muted">{date}</span>}
                </span>
                <span className="mt-1 block text-sm font-semibold leading-snug text-text-main line-clamp-2">
                  {n.title}
                </span>
              </span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="mt-1 shrink-0 text-text-muted" aria-hidden>
                <path d="M9 18l6-6-6-6" />
              </svg>
            </>
          );
          const cls = "flex items-start gap-2.5 px-4 py-3 sm:px-5";
          return (
            <li key={`${n.trading_code}-${n.post_date}-${i}`}>
              {code ? (
                <Link prefetch={false} href={`/stock/${code}`} className={`${cls} transition-colors hover:bg-surface-2 active:bg-surface-2`}>
                  {inner}
                </Link>
              ) : (
                <div className={cls}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
