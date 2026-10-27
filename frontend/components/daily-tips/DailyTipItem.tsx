import Link from "next/link";
import type { DailyTip } from "@/lib/api";
import { TONE_TEXT, type StockRowTone } from "@/components/ui/StockRow";
import { money } from "@/lib/formatters";
import { T } from "@/components/i18n/T";

/** The facts as one sentence in each language (backend 2026-10-28); older
 *  stored tips carry only `text`. */
type Tip = DailyTip & { summary?: string | null; summary_bn?: string | null };

// The tip's lead signal (`category`) → its plain kind word and the colour that
// word carries. Colour lives in the word only — no tinted tiles (2026-10-26
// clean redesign of /buy-sell-signals, same language as /market-analysis).
const CAT_META: Record<string, { tone: StockRowTone; tag: string; tagBn: string }> = {
  profit_growth: { tone: "positive", tag: "Growing profit", tagBn: "মুনাফা বাড়ছে" },
  profit_streak: { tone: "positive", tag: "Steady profit", tagBn: "নিয়মিত মুনাফা" },
  dividend_yield: { tone: "watch", tag: "Dividend", tagBn: "ডিভিডেন্ড" },
  dividend_streak: { tone: "watch", tag: "Pays every year", tagBn: "প্রতি বছর ডিভিডেন্ড" },
  cheap_pe: { tone: "primary", tag: "Cheaper than similar companies", tagBn: "একই ধরনের কোম্পানির চেয়ে সস্তা" },
  below_book: { tone: "primary", tag: "Below net assets", tagBn: "নিট সম্পদের চেয়ে কম দাম" },
  high_roe: { tone: "watch", tag: "High returns", tagBn: "বেশি মুনাফার হার" },
  near_52w_low: { tone: "primary", tag: "Near yearly low", tagBn: "বছরের সর্বনিম্নের কাছে" },
  rel_strength: { tone: "positive", tag: "Beating the market", tagBn: "বাজারের চেয়ে এগিয়ে" },
  div_catalyst: { tone: "positive", tag: "Just declared", tagBn: "সম্প্রতি ঘোষণা" },
};
const FALLBACK: { tone: StockRowTone; tag: string; tagBn: string } = {
  tone: "muted",
  tag: "Worth a look",
  tagBn: "দেখে নেওয়ার মতো",
};

/**
 * One of today's tips on /buy-sell-signals — a row inside the tips card, the
 * same shape as a signal row: name + code, price on the right, then the kind
 * word, the plain sentence, and why that matters in one muted line.
 *
 * The `facts` chips are not shown: the sentence (`text`) is built from the
 * same facts, so the chips only repeated it as numbers.
 */
export default function DailyTipItem({ tip }: { tip: Tip }) {
  const meta = CAT_META[tip.category] ?? FALLBACK;
  // Older stored tips have no `summary`: strip the leading "Name — " from the
  // headline so the body reads as the reason.
  const fromText = tip.text.includes(" — ") ? tip.text.slice(tip.text.indexOf(" — ") + 3) : tip.text;
  const sentence = tip.summary || (fromText ? fromText.charAt(0).toUpperCase() + fromText.slice(1) : "");
  const sentenceBn = tip.summary_bn || "";

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
              <T en={meta.tag} bn={meta.tagBn} />
              {typeof tip.conviction === "number" && tip.conviction >= 3 && (
                <span className="font-normal text-text-muted">
                  <T en={` · ${tip.conviction} good signs`} bn={` · ${tip.conviction}টি ভালো দিক`} />
                </span>
              )}
            </span>
          </span>
          {tip.ltp != null && (
            <span className="shrink-0 text-sm font-semibold tabular-nums nums text-text-main">{money(tip.ltp)}</span>
          )}
        </span>
        {(sentence || sentenceBn) && (
          <span className="mt-3 block max-w-prose text-sm leading-relaxed text-text-main">
            <T en={sentence} bn={sentenceBn} />
          </span>
        )}
        {(tip.why || tip.why_bn) && (
          <span className="mt-2 block max-w-prose text-xs leading-relaxed text-text-muted">
            <T en={tip.why ?? ""} bn={tip.why_bn ?? ""} />
          </span>
        )}
      </Link>
    </li>
  );
}
