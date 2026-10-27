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
      {h && <OwnerTag kind="portfolio" lang={lang} />}
      {w && <OwnerTag kind="watchlist" lang={lang} />}
    </>
  );
}

/** The H / ★ square on its own — also heads the two sections of "Your stocks today". */
export function OwnerTag({ kind, lang = "en" }: { kind: "portfolio" | "watchlist"; lang?: Lang }) {
  const tone = kind === "portfolio" ? "var(--primary)" : "var(--watch)";
  return (
    <span
      title={t(lang, kind === "portfolio" ? "inPortfolio" : "onWatchlist")}
      className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-sm text-xs font-extrabold"
      style={{
        color: tone,
        background: `color-mix(in srgb, ${tone} ${kind === "portfolio" ? 12 : 14}%, transparent)`,
        border: `1px solid color-mix(in srgb, ${tone} ${kind === "portfolio" ? 26 : 30}%, var(--border))`,
      }}
    >
      {kind === "portfolio" ? "H" : "★"}
    </span>
  );
}
