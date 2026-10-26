import Link from "next/link";
import type { DailyTip } from "@/lib/api";
import { TONE_TEXT, type StockRowTone } from "@/components/ui/StockRow";
import { money } from "@/lib/formatters";

// The tip's lead signal (`category`) → its plain kind word and the colour that
// word carries. Colour lives in the word only — no tinted tiles (2026-10-26
// clean redesign of /buy-sell-signals, same language as /market-analysis).
const CAT_META: Record<string, { tone: StockRowTone; tag: string }> = {
  profit_growth: { tone: "positive", tag: "Growing profit" },
  profit_streak: { tone: "positive", tag: "Steady profit" },
  dividend_yield: { tone: "watch", tag: "Dividend" },
  dividend_streak: { tone: "watch", tag: "Pays every year" },
  cheap_pe: { tone: "primary", tag: "Cheap vs peers" },
  below_book: { tone: "primary", tag: "Below book value" },
  high_roe: { tone: "watch", tag: "High returns" },
  near_52w_low: { tone: "primary", tag: "Near yearly low" },
  rel_strength: { tone: "positive", tag: "Beating the market" },
  div_catalyst: { tone: "positive", tag: "Just declared" },
};
const FALLBACK: { tone: StockRowTone; tag: string } = { tone: "muted", tag: "Worth a look" };

/**
 * One of today's tips on /buy-sell-signals — a row inside the tips card, the
 * same shape as a signal row: name + code, price on the right, then the kind
 * word, the plain sentence, and why that matters in one muted line.
 *
 * The `facts` chips are not shown: the sentence (`text`) is built from the
 * same facts, so the chips only repeated it as numbers.
 */
export default function DailyTipItem({ tip }: { tip: DailyTip }) {
  const meta = CAT_META[tip.category] ?? FALLBACK;
  // Strip the leading "Name — " from the headline so the body reads as the
  // reason; fall back to the full text when it has no dash.
  const summary = tip.text.includes(" — ")
    ? tip.text.slice(tip.text.indexOf(" — ") + 3)
    : tip.text;
  const sentence = summary ? summary.charAt(0).toUpperCase() + summary.slice(1) : "";

  return (
    <li className="sg-row">
      <Link prefetch={false} href={`/stock/${tip.trading_code}`} className="sg-tip">
        <span className="flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <span className="min-w-0 max-w-full truncate text-sm font-semibold leading-tight text-text-main">
                {tip.company_name || tip.trading_code}
              </span>
              {tip.company_name && (
                <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-text-muted">
                  {tip.trading_code}
                </span>
              )}
            </span>
            <span className={`mt-1 block text-xs font-semibold ${TONE_TEXT[meta.tone]}`}>
              {meta.tag}
              {typeof tip.conviction === "number" && tip.conviction >= 3 && (
                <span className="font-normal text-text-muted"> · {tip.conviction} good signs</span>
              )}
            </span>
          </span>
          {tip.ltp != null && (
            <span className="shrink-0 text-sm font-semibold tabular-nums nums text-text-main">{money(tip.ltp)}</span>
          )}
        </span>
        {sentence && <span className="mt-3 block max-w-prose text-sm leading-relaxed text-text-main">{sentence}</span>}
        {tip.why && <span className="mt-2 block max-w-prose text-xs leading-relaxed text-text-muted">{tip.why}</span>}
      </Link>
    </li>
  );
}
