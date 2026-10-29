"use client";

import { getTier } from "@/lib/constants";
import ScoreBadge from "@/components/ui/ScoreBadge";
import TierPill from "@/components/ui/TierPill";
import SignalChip from "@/components/ui/SignalChip";
import { IconLock } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { Locked } from "@/components/stock/report/ReportSection";
import { usePremiumOpen } from "@/components/premium/usePremiumOpen";
import { TONE_CLASS, tx } from "@/components/stock/report/fmt";
import { freeReportSections } from "@/lib/free-share";
import type { CompanyDetail } from "@/lib/api";
import { SECTION_ORDER, type StockReport } from "@/lib/stock-report";

/**
 * The cover's scorecard (2026-10-28) — replaces "At a glance" when the
 * backend sends a report. Score ring, grade, Buy / Sell and the one-line take
 * (all free), our three-line summary (the first line free, the rest
 * Premium), then the eight checks: each verdict word is free and jumps to its
 * section; the figure behind it shows where that section is open (Premium,
 * or one of the free sample sections) and is simply left out elsewhere. The
 * grid doubles as the report's contents.
 */
/** What each summary line is about (the backend writes them in this order). */
const SUMMARY_KINDS = [
  { en: "A strength", bn: "একটি শক্তি" },
  { en: "The price", bn: "দাম" },
  { en: "A watch-out", bn: "একটি সতর্কতা" },
];

export default function Scorecard({ detail, report }: { detail: CompanyDetail; report: StockReport }) {
  const open = usePremiumOpen();
  const samples = freeReportSections(SECTION_ORDER.filter((k) => report.sections[k] != null));
  const { score_row, profile, verdict, signal, bengali_summary } = detail;
  const score = (score_row?.score as number | null) ?? null;
  const tier = getTier(score);

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
              // Our summary, each line under what it is about: the strength
              // is free; the price read and the watch-out are Premium, named
              // in one quiet line.
              <div className="rp-summary">
                <div className="rp-summary-row">
                  <span className="rp-summary-k">{tx(SUMMARY_KINDS[0])}</span>
                  <p>{tx(report.summary[0])}</p>
                </div>
                {report.summary.length > 1 && (
                  <Locked>
                    {report.summary.slice(1).map((line, i) => (
                      <div key={i} className="rp-summary-row">
                        <span className="rp-summary-k">{tx(SUMMARY_KINDS[i + 1] ?? SUMMARY_KINDS[2])}</span>
                        <p>{tx(line)}</p>
                      </div>
                    ))}
                  </Locked>
                )}
              </div>
            )}
            {report.summary.length > 1 && !open && (
              <a
                href="#ch-premium"
                className="mt-1 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-gold-ink hover:underline active:opacity-70"
              >
                <IconLock size={14} />
                <T
                  en={report.summary.length > 2 ? "Our read on the price and the main watch-out, in Premium" : "The rest of our summary, in Premium"}
                  bn={report.summary.length > 2 ? "দাম নিয়ে আমাদের মত আর প্রধান সতর্কতা, প্রিমিয়ামে" : "সারাংশের বাকিটা, প্রিমিয়ামে"}
                />
              </a>
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
          {report.scorecard.map((c) => {
            const detail = c.detail && <span className="mt-0.5 block text-xs leading-snug text-text-muted">{tx(c.detail)}</span>;
            const inner = (
              <>
                <span className="block text-xs font-semibold text-text-muted">{tx(c.label)}</span>
                <span className={`rp-word text-base ${TONE_CLASS[c.tone]}`}>{tx(c.word)}</span>
                {detail && (samples.includes(c.key) ? detail : <Locked as="span">{detail}</Locked>)}
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
              en="Every verdict is free. The figures behind them are in Premium, except on the sections open to everyone."
              bn="প্রতিটি রায় ফ্রি। এর পেছনের সংখ্যা প্রিমিয়ামে, শুধু সবার জন্য খোলা অংশগুলো ছাড়া।"
            />
          </p>
        )}
      </div>
    </section>
  );
}
