import { getTier } from "@/lib/constants";
import { HEALTH_PILLAR_ORDER } from "@/lib/plain-language";
import ScoreBadge from "@/components/ui/ScoreBadge";
import TierPill from "@/components/ui/TierPill";
import SignalChip from "@/components/ui/SignalChip";
import { PillarBars } from "@/components/stock/HealthCheck";
import { T } from "@/components/i18n/T";
import type { CompanyDetail } from "@/lib/api";

interface Props {
  detail: CompanyDetail;
}

/**
 * "At a glance" (2026-10-27) — everything free about our view of a stock in
 * one card: score ring, grade, the Buy / Sell chip, the one-line take and the
 * five checks as bars, then one link down to the full verdict chapter, where
 * the reasons live (FullVerdict). No locks in this card.
 *
 * The company name, code, sector and price are NOT repeated here — the hero
 * directly above already carries them. Both languages of the take are in the
 * HTML (`<T>`); the page language decides which one shows.
 */
export default function VerdictBlock({ detail }: Props) {
  const { score_row, profile, verdict, signal, bengali_summary } = detail;

  const score = (score_row?.score as number | null) ?? null;
  const tier = getTier(score);
  const code = profile.trading_code;

  const sentences = (verdict?.sentences ?? []).filter(Boolean);
  const takeEn = verdict?.tagline ?? sentences[0] ?? null;

  // Bengali take: the verdict's own Bengali tagline, else the first paragraph
  // of the এক নজরে summary (older backend).
  const bnSummary = bengali_summary?.trim() || "";
  const bnFirstPara = bnSummary ? bnSummary.split(/\n\s*\n/).map((p) => p.trim()).find(Boolean) ?? null : null;
  const takeBn = verdict?.tagline_bn ?? verdict?.sentences_bn?.[0] ?? bnFirstPara;

  const isSell = signal?.signal === "sell";
  const isBuy = signal?.signal === "buy";
  const hasBars = HEALTH_PILLAR_ORDER.some((k) => score_row?.[k] != null);

  return (
    <section className="soft-card relative mb-8 overflow-hidden">
      <div className="relative p-5 sm:p-7">
        <p className="mb-4 text-sm font-semibold text-text-muted">
          <T en="At a glance" bn="এক নজরে" />
        </p>

        {/* Score ring + grade + signal */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-7">
          <div className="flex flex-col items-center shrink-0">
            <span className="mb-2 text-xs font-semibold text-text-muted">
              <T en="Our score" bn="আমাদের স্কোর" />
            </span>
            <ScoreBadge score={score} tier={tier} size="lg" />
          </div>

          <div className="text-left flex-1 w-full">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <TierPill tier={tier} size="md" />
              {(isBuy || isSell) && signal && <SignalChip signal={signal.signal} strength={signal.strength} size="md" />}
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold text-text-muted">
                <T en="In short" bn="সংক্ষেপে" />
              </p>
              <p
                className={`text-sm sm:text-base leading-snug ${
                  takeEn || takeBn ? "font-semibold text-text-main" : "text-text-muted"
                }`}
              >
                <T
                  en={
                    takeEn ??
                    "Our view of this share, based on the company's finances and how its price is moving."
                  }
                  bn={takeBn ?? "কোম্পানির আর্থিক অবস্থা আর দামের গতি মিলিয়ে এই শেয়ার নিয়ে আমাদের মত।"}
                />
              </p>
            </div>
          </div>
        </div>

        {/* The five checks as bars — the shape of the company, free. */}
        {score_row && hasBars && (
          <div className="mt-6 border-t border-border pt-5">
            <p className="mb-3 text-xs font-semibold text-text-muted">
              <T en="Five checks, each out of 10" bn="পাঁচটি যাচাই, প্রতিটি 10-এর মধ্যে" />
            </p>
            <PillarBars scoreRow={score_row} />
          </div>
        )}

        {/* Why — the one way into the full verdict chapter below. */}
        <a
          href="#ch-verdict"
          className="mt-5 flex min-h-10 items-center gap-1 text-sm font-semibold text-primary-ink hover:underline active:opacity-70"
        >
          {isBuy ? (
            <T en="Why a Buy? Read the full verdict" bn="কেন কেনার সংকেত? পূর্ণ মূল্যায়ন পড়ুন" />
          ) : isSell ? (
            <T en="Why a Sell? Read the full verdict" bn="কেন বিক্রির সংকেত? পূর্ণ মূল্যায়ন পড়ুন" />
          ) : (
            <T en="Read the full verdict" bn="পূর্ণ মূল্যায়ন পড়ুন" />
          )}{" "}
          <span aria-hidden="true">↓</span>
        </a>

        {/* Footer watermark — for shared screenshots */}
        <div className="mt-5 pt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs font-semibold border-t border-border">
          <span className="text-text-muted">topstockbd.com</span>
          <span className="text-text-muted">
            {code} · <T en="DSE stock analysis" bn="ডিএসই শেয়ার বিশ্লেষণ" />
          </span>
        </div>
      </div>
    </section>
  );
}
