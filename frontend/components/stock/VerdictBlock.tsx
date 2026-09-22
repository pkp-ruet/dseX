"use client";
import Link from "next/link";
import { verdictTone } from "@/lib/plain-language";
import { getTier, SIGNAL_VAR } from "@/lib/constants";
import { sectorSlug } from "@/lib/sector";
import ScoreBadge from "@/components/ui/ScoreBadge";
import TierPill from "@/components/ui/TierPill";
import SignalChip from "@/components/ui/SignalChip";
import { IconChartBars, IconTrophy } from "@/components/stock/StockIcons";
import { useStockLang } from "@/context/StockLangContext";
import type { CompanyDetail } from "@/lib/api";

interface Props {
  detail: CompanyDetail;
}

const T = {
  brand: { en: "Analysis", bn: "বিশ্লেষণ" },
  score: { en: "Fundamental Score", bn: "মৌলিক স্কোর" },
  take: { en: "Our take", bn: "এক নজরে" },
  generic: {
    en: "Our take on this stock — combining its financial health with how the market is treating it right now.",
    bn: "এই শেয়ার নিয়ে আমাদের মত — এর আর্থিক অবস্থা আর বাজারের বর্তমান আচরণ মিলিয়ে।",
  },
  eduNote: { en: "Educational information, not investment advice.", bn: "এটি শিক্ষামূলক তথ্য, বিনিয়োগ পরামর্শ নয়।" },
  deepEyebrow: { en: "In-depth analysis", bn: "গভীর বিশ্লেষণ" },
  deepCta: { en: "Read the full analysis", bn: "সম্পূর্ণ বিশ্লেষণ পড়ুন" },
  sectorAvg: { en: "sector average", bn: "খাতের গড়" },
} as const;

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

/**
 * The single "Our Verdict" card: score ring + verdict word + the Buy / Sell
 * signal with its reason, the sector standing, the take (English verdict prose
 * or the cached Bengali এক নজরে), and the in-depth-analysis hook.
 *
 * The company name, code, sector and price are NOT repeated here — the hero
 * directly above already carries them, and on a phone the two stacked headers
 * used to fill a whole screen. The page-wide language toggle lives in the hero
 * too; this card only reads `StockLangContext`. Score, tier and signal are the
 * shared primitives (`ScoreBadge` lg / `TierPill` md / `SignalChip` md) — the
 * same three the rank table and cards use, just bigger. Both language blocks
 * of the take are rendered into the server HTML and toggled by visibility, so
 * crawlers still see the Bengali.
 */
export default function VerdictBlock({ detail }: Props) {
  const { score_row, profile, verdict, signal, bengali_summary, deep_analysis, sector_context } = detail;
  const { lang } = useStockLang();
  const isBn = lang === "bn";

  const score = (score_row?.score as number | null) ?? null;
  const tone = verdictTone(score);
  const tier = getTier(score);
  const code = profile.trading_code;

  const tagline = verdict?.tagline ?? null;
  const sentences = (verdict?.sentences ?? []).filter(Boolean);

  // Bengali "এক নজরে" prose — split blank-line-separated paragraphs.
  const bnSummary = bengali_summary?.trim() || "";
  const bnParas = bnSummary ? bnSummary.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) : [];

  // The reason rides with both Buy and Sell — a Sell is exactly where the reader
  // most needs the why. Neutral (`none`) shows no chip and no reason.
  const isSell = signal?.signal === "sell";
  const isBuy = signal?.signal === "buy";
  const reason = isBn ? signal?.reason_bn : signal?.reason_en;
  const showReason = (isBuy || isSell) && !!reason;

  // Sector standing — the API has always returned this; nothing rendered it.
  const rank = sector_context?.rank_in_sector ?? null;
  const peers = sector_context?.peer_count ?? null;
  const sectorAvg = sector_context?.sector_avg_score ?? null;
  const sectorName = sector_context?.sector ?? profile.sector ?? null;
  const hasStanding = rank != null && peers != null && peers >= 2 && !!sectorName;

  const hasDeep = !!deep_analysis?.available;
  const deepHeadline = (isBn ? deep_analysis?.headline_bn : deep_analysis?.headline_en) ?? deep_analysis?.headline_en ?? "";
  const deepBottom = (isBn ? deep_analysis?.bottom_line_bn : deep_analysis?.bottom_line_en) ?? deep_analysis?.bottom_line_en ?? "";

  const eyebrowCls = (bn: boolean) =>
    `text-xs font-bold tracking-[0.22em] ${bn ? "font-bn" : "uppercase"}`;

  return (
    <section
      className="relative rounded-3xl overflow-hidden mb-8"
      style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-soft)" }}
    >
      {/* Thin tone accent on the left edge */}
      <div aria-hidden style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "3px", background: tone.color }} />

      <div className="relative p-5 sm:p-7">
        {/* Brand strip */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <span className="text-xs font-bold uppercase tracking-[0.22em] flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: tone.color }} />
            <span className="text-text-main">TopStockBD</span>
            <span className={`text-text-muted ${isBn ? "font-bn normal-case tracking-normal" : ""}`}>
              {T.brand[lang]}
            </span>
          </span>
        </div>

        {/* Score ring + verdict word + signal */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-7">
          <div className="flex flex-col items-center shrink-0">
            <span className={`${eyebrowCls(isBn)} mb-2`} style={{ color: "var(--text-muted)" }}>
              {T.score[lang]}
            </span>
            <ScoreBadge score={score} tier={tier} size="lg" />
          </div>

          <div className="text-left flex-1 w-full">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <TierPill tier={tier} size="md" lang={lang} />
              {(isBuy || isSell) && signal && (
                <SignalChip signal={signal.signal} strength={signal.strength} size="md" lang={lang} />
              )}
            </div>

            {showReason && (
              <p
                className={`text-base sm:text-xl font-bold mt-3 leading-snug ${isBn ? "font-bn" : ""}`}
                lang={isBn ? "bn" : undefined}
                style={{ color: isSell ? SIGNAL_VAR.sell : "var(--text)" }}
              >
                {reason}
              </p>
            )}

            {hasStanding && (
              <p
                className={`mt-3 inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm ${isBn ? "font-bn" : ""}`}
                lang={isBn ? "bn" : undefined}
                style={{ color: "var(--text-muted)" }}
              >
                <span className="inline-flex" style={{ color: tone.color }}><IconTrophy size={15} /></span>
                {isBn ? (
                  <>
                    <Link
                      href={`/sector/${sectorSlug(sectorName as string)}`}
                      prefetch={false}
                      className="font-semibold hover:underline"
                      style={{ color: "var(--text)" }}
                    >
                      {sectorName}
                    </Link>
                    <span>খাতে {peers}টির মধ্যে <b style={{ color: "var(--text)" }}>{rank} নম্বরে</b></span>
                  </>
                ) : (
                  <>
                    <span>Ranked <b style={{ color: "var(--text)" }}>{ordinal(rank as number)}</b> of {peers} in</span>
                    <Link
                      href={`/sector/${sectorSlug(sectorName as string)}`}
                      prefetch={false}
                      className="font-semibold hover:underline"
                      style={{ color: "var(--text)" }}
                    >
                      {sectorName}
                    </Link>
                  </>
                )}
                {sectorAvg != null && score != null && (
                  <span>
                    · {T.sectorAvg[lang]} <b className="tabular-nums nums" style={{ color: "var(--text)" }}>{Math.round(sectorAvg)}</b>
                  </span>
                )}
              </p>
            )}

            {/* The take — language-aware. Both blocks live in the DOM (SEO); one is hidden. */}
            <div className="mt-4">
              <p className={`${eyebrowCls(isBn)} mb-2`} style={{ color: "var(--text-muted)" }}>
                {T.take[lang]}
              </p>

              {/* English take: verdict tagline + sentences */}
              <div className={isBn ? "hidden" : "block"}>
                {tagline && (
                  <p className="text-sm sm:text-base font-semibold leading-snug" style={{ color: "var(--text)" }}>
                    {tagline}
                  </p>
                )}
                {sentences.length > 0 ? (
                  <ul className="mt-2.5 space-y-1.5">
                    {sentences.map((line, i) => (
                      <li key={i} className="flex gap-2.5 text-sm sm:text-sm leading-snug" style={{ color: "var(--text)" }}>
                        <span aria-hidden className="mt-[6px] h-1.5 w-1.5 rounded-full shrink-0" style={{ background: tone.color }} />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                ) : !tagline ? (
                  <p className="text-base sm:text-base leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    {T.generic.en}
                  </p>
                ) : null}
              </div>

              {/* Bengali take: cached এক নজরে prose (falls back to a generic line) */}
              <div className={`font-bn ${isBn ? "block" : "hidden"}`} lang="bn">
                {bnParas.length > 0 ? (
                  <>
                    <div className="space-y-3 leading-relaxed" style={{ color: "var(--text)" }}>
                      {bnParas.map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                    </div>
                    <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
                      {T.eduNote.bn}
                    </p>
                  </>
                ) : (
                  <p className="text-base sm:text-base leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    {T.generic.bn}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* In-depth analysis hook — distinct premium panel → full report sub-page */}
        {hasDeep && (
          <div
            className="mt-6 rounded-xl overflow-hidden"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
          >
            <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, var(--primary), var(--accent, var(--primary)))" }} />
            <div className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-2" style={{ color: "var(--primary)" }}>
                <IconChartBars size={16} />
                <span className={eyebrowCls(isBn)}>
                  {T.deepEyebrow[lang]}
                </span>
              </div>
              <div className={isBn ? "font-bn" : ""} lang={isBn ? "bn" : undefined}>
                <h3 className="text-base sm:text-xl font-bold leading-snug mb-1.5" style={{ color: "var(--text)" }}>
                  {deepHeadline}
                </h3>
                <p className="text-sm leading-relaxed line-clamp-3" style={{ color: "var(--text-muted)" }}>
                  {deepBottom}
                </p>
              </div>
              <Link
                href={`/stock/${code}/analysis`}
                className={`btn-primary mt-4 ${isBn ? "font-bn" : ""}`}
              >
                {T.deepCta[lang]}
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        )}

        {/* Footer watermark — for shared screenshots */}
        <div
          className="mt-5 pt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs font-bold uppercase tracking-[0.2em]"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <span style={{ color: "var(--text-muted)" }}>topstockbd.com</span>
          <span style={{ color: "var(--text-muted)" }}>{code} · DSE Stock Analysis</span>
        </div>
      </div>
    </section>
  );
}
