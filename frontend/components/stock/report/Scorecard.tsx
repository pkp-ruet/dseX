"use client";

import { getTier } from "@/lib/constants";
import ScoreBadge from "@/components/ui/ScoreBadge";
import TierPill from "@/components/ui/TierPill";
import SignalChip from "@/components/ui/SignalChip";
import { IconCrown } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { Locked } from "@/components/stock/report/ReportSection";
import { usePremiumOpen } from "@/components/premium/PremiumMask";
import { TONE_CLASS, tx } from "@/components/stock/report/fmt";
import { MaskedSentence } from "@/components/stock/report/preview";
import type { CompanyDetail } from "@/lib/api";
import type { StockReport } from "@/lib/stock-report";

/** What each of the three summary lines is about (the backend writes them in
 *  this order: a strength, a price read, a watch-out). */
/** How many scorecard numbers a free reader sees (2 of 8). */
const FREE_DETAILS = 2;

const SUMMARY_KINDS = [
  { en: "A strength", bn: "একটি শক্তি" },
  { en: "The price", bn: "দাম" },
  { en: "A watch-out", bn: "একটি সতর্কতা" },
];

/**
 * The cover's scorecard (2026-10-28) — replaces "At a glance" when the
 * backend sends a report. Score ring, grade, Buy / Sell and the one-line take
 * (all free), our three-line summary (Premium), then the eight checks: each
 * verdict word is free and jumps to its section; the number behind it is
 * Premium. The grid doubles as the report's contents.
 */
export default function Scorecard({ detail, report }: { detail: CompanyDetail; report: StockReport }) {
  const open = usePremiumOpen();
  const { score_row, profile, verdict, signal, bengali_summary } = detail;
  const score = (score_row?.score as number | null) ?? null;
  const tier = getTier(score);
  const code = profile.trading_code;

  const sentences = (verdict?.sentences ?? []).filter(Boolean);
  const takeEn = verdict?.tagline ?? sentences[0] ?? null;
  const bnFirst = bengali_summary?.trim().split(/\n\s*\n/).map((p) => p.trim()).find(Boolean) ?? null;
  const takeBn = verdict?.tagline_bn ?? verdict?.sentences_bn?.[0] ?? bnFirst;
  const isBuy = signal?.signal === "buy";
  const isSell = signal?.signal === "sell";
  const rank = score_row?.overall_rank as number | null | undefined;
  const total = score_row?.total_scored as number | null | undefined;

  return (
    <section className="soft-card mb-8 overflow-hidden" aria-labelledby="rp-scorecard-t">
      <div className="p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-7">
          <div className="flex shrink-0 items-center gap-4 sm:flex-col sm:items-center sm:gap-2">
            <ScoreBadge score={score} tier={tier} size="lg" />
            <span className="text-xs font-semibold text-text-muted sm:text-center">
              <T en="Our score" bn="আমাদের স্কোর" />
              {rank && total ? (
                <span className="block font-normal">
                  <T en={`${rank} of ${total}`} bn={`${total}টির মধ্যে ${rank}`} />
                </span>
              ) : null}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <TierPill tier={tier} size="md" />
              {(isBuy || isSell) && signal && <SignalChip signal={signal.signal} strength={signal.strength} size="md" />}
            </div>
            {(takeEn || takeBn) && (
              <p className="mt-3 text-base font-semibold leading-snug text-text-main sm:text-lg">
                <T en={takeEn ?? takeBn ?? ""} bn={takeBn ?? takeEn ?? ""} />
              </p>
            )}

            {report.summary.length > 0 && (
              <>
                {!open && (
                  // The summary's shape for a free reader: what each line is
                  // about, the line itself grey.
                  <a
                    href="#ch-premium"
                    className="mt-3 block rounded-lg border border-gold/50 bg-gold/10 px-3 py-2.5 text-sm hover:bg-gold/15 active:opacity-80"
                  >
                    <span className="flex items-center gap-2">
                      <span className="shrink-0 text-gold-ink"><IconCrown size={14} /></span>
                      <b className="text-text-main"><T en="Our three-line summary" bn="আমাদের তিন লাইনের সারাংশ" /></b>
                    </span>
                    <span className="mt-2 grid gap-1.5">
                      {SUMMARY_KINDS.slice(0, report.summary.length).map((k, i) => (
                        <span key={i} className="flex items-start gap-2">
                          <span className="w-24 shrink-0 pt-0.5 text-xs font-semibold text-text-muted sm:w-28">
                            <T en={k.en} bn={k.bn} />
                          </span>
                          {/* The strength is the free line; the price read and
                              the watch-out show with their figures hidden. */}
                          {i === 0 ? (
                            <span className="min-w-0 text-sm leading-snug text-text-main">{tx(report.summary[0])}</span>
                          ) : (
                            <span className="min-w-0 text-sm leading-snug text-text-main" aria-hidden="true">
                              <MaskedSentence b={report.summary[i]} />
                            </span>
                          )}
                        </span>
                      ))}
                    </span>
                  </a>
                )}
                <Locked>
                  <ol className="mt-4 grid gap-2 border-t border-border pt-3">
                    {report.summary.map((line, i) => (
                      <li key={i} className="flex gap-2.5 text-sm leading-snug text-text-main sm:text-base">
                        <span className="rp-n" aria-hidden="true">{i + 1}</span>
                        <span className="min-w-0 pt-0.5">{tx(line)}</span>
                      </li>
                    ))}
                  </ol>
                </Locked>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-baseline justify-between gap-3">
          <h2 id="rp-scorecard-t" className="text-base font-bold text-text-main">
            <T en="What we checked" bn="আমরা যা যাচাই করেছি" />
          </h2>
          <span className="text-xs text-text-muted">
            <T en={`${report.scorecard.length} checks · tap one to read it`} bn={`${report.scorecard.length}টি যাচাই · পড়তে যেকোনোটিতে চাপুন`} />
          </span>
        </div>
        <div className="rp-grid mt-3">
          {report.scorecard.map((c, ci) => {
            // Free sample: the numbers under the first FREE_DETAILS checks.
            const freeDetail = ci < FREE_DETAILS;
            const inner = (
              <>
                <span className="block text-xs font-semibold text-text-muted">{tx(c.label)}</span>
                <span className={`rp-word text-base ${TONE_CLASS[c.tone]}`}>{tx(c.word)}</span>
                {c.detail && !open && freeDetail && (
                  <span className="mt-0.5 block text-xs leading-snug text-text-muted">{tx(c.detail)}</span>
                )}
                {c.detail && !open && !freeDetail && (
                  <span className="mt-0.5 block text-xs leading-snug text-text-muted" aria-hidden="true">
                    <MaskedSentence b={c.detail} size="xs" />
                  </span>
                )}
                {c.detail && (
                  <Locked as="span">
                    <span className="mt-0.5 block text-xs leading-snug text-text-muted">{tx(c.detail)}</span>
                  </Locked>
                )}
              </>
            );
            // A check with no section (cash for a bank) is a plain tile, not a link.
            return report.sections[c.key] ? (
              <a key={c.key} href={`#rp-${c.key}`} className="rp-tile">{inner}</a>
            ) : (
              <div key={c.key} className="rp-tile">{inner}</div>
            );
          })}
        </div>
        {!open && (
          <p className="mt-3 text-sm text-text-muted">
            <T
              en="Every word is free, and the numbers under the first two. The other numbers and the reasons are in Premium."
              bn="সব শব্দ ফ্রি, আর প্রথম দুটির নিচের সংখ্যাও। বাকি সংখ্যা আর কারণ প্রিমিয়ামে।"
            />
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border pt-3 text-xs font-semibold text-text-muted">
          <span>topstockbd.com</span>
          <span>
            {code} · <T en="DSE stock report" bn="ডিএসই শেয়ার রিপোর্ট" />
          </span>
        </div>
      </div>
    </section>
  );
}
