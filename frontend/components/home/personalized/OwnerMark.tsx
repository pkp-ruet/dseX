import type { Lang } from "@/context/LangContext";
import { t } from "@/lib/home-copy";

/**
 * H (in your portfolio) / ★ (on your watchlist) tag beside a code in any
 * market list on the dashboard — so a reader spots their own stocks inside
 * the movers, the ranking, the dividend board. Renders nothing for a stock
 * the reader neither holds nor follows.
 */
export default function OwnerMark({
  code,
  held,
  watched,
  lang = "en",
}: {
  code: string;
  held: Set<string>;
  watched: Set<string>;
  lang?: Lang;
}) {
  const c = code.toUpperCase();
  const h = held.has(c);
  const w = watched.has(c);
  if (!h && !w) return null;
  return (
    <>
      {h && (
        <span
          title={t(lang, "inPortfolio")}
          className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] text-[0.68rem] font-extrabold"
          style={{
            color: "var(--primary)",
            background: "color-mix(in srgb, var(--primary) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--primary) 26%, var(--border))",
          }}
        >
          H
        </span>
      )}
      {w && (
        <span
          title={t(lang, "onWatchlist")}
          className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] text-[0.68rem] font-extrabold"
          style={{
            color: "var(--watch)",
            background: "color-mix(in srgb, var(--watch) 14%, transparent)",
            border: "1px solid color-mix(in srgb, var(--watch) 30%, var(--border))",
          }}
        >
          ★
        </span>
      )}
    </>
  );
}
