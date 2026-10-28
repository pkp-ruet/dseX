import type { ReactNode } from "react";
import StockChapter from "@/components/stock/StockChapter";
import ReportSection from "@/components/stock/report/ReportSection";
import ReportOffer from "@/components/stock/report/ReportOffer";
import ShareCheck from "@/components/stock/report/ShareCheck";
import YouAndThisStock from "@/components/stock/report/YouAndThisStock";
import ScoreHistory from "@/components/stock/ScoreHistory";
import DeepAnalysisReport from "@/components/stock/DeepAnalysisReport";
import { IconCrown } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import {
  AlternativesBody, CashBody, DividendBody, DividendFree, NextBody, NextFree, OwnersBody, OwnersFree,
  PriceBody, PriceFree, QualityBody, QualityFree, RedFlagsBody, RedFlagsFree, RisksBody, SafetyBody, SafetyFree,
  SectorFree, StoryBody, StoryFree, ThisYearBody, ThisYearFree,
} from "@/components/stock/report/sections";
import {
  AlternativesPreview, CashPreview, DividendPreview, NextPreview, OwnersPreview, PricePreview,
  RedFlagsPreview, RisksPreview, SafetyPreview, StoryPreview, ThisYearPreview,
} from "@/components/stock/report/previews";
import type { CompanyDetail, DeepAnalysisReport as DeepReport } from "@/lib/api";
import { SECTION_ORDER, type CheckKey, type SectionBase, type SectionKey, type StockReport } from "@/lib/stock-report";

const CHECKS: CheckKey[] = ["red_flags", "price", "dividend", "this_year", "owners", "cash", "safety", "quality"];

/** Old anchors that pushes, the results feed and stories still link to. */
const ALIASES: Partial<Record<SectionKey, string[]>> = {
  this_year: ["results"],
  quality: ["score-history", "health"],
  price: ["v-price", "v-fair"],
  // "red-flags": the watcher's red-flag push links here.
  red_flags: ["signals", "red-flags"],
};

/**
 * The report chapter of the stock page (2026-10-28): every section in report
 * order, each in the `ReportSection` anatomy, then "You and this stock", the
 * analyst note (where a written report exists) and the one offer.
 */
export default function StockReportBody({
  detail,
  report,
  deep,
}: {
  detail: CompanyDetail;
  report: StockReport;
  deep: DeepReport | null;
}) {
  const { profile, latest_price } = detail;
  const code = profile.trading_code;
  const name = profile.company_name ?? code;
  const ltp = latest_price.ltp ?? null;
  const sec = report.sections;

  // Each section: free face, Premium body, and the masked preview a free
  // reader sees in the body's place (previews.tsx).
  const bodies: Partial<Record<SectionKey, { free?: ReactNode; body?: ReactNode; preview?: ReactNode }>> = {
    red_flags: sec.red_flags && {
      free: <RedFlagsFree s={sec.red_flags} />,
      body: <RedFlagsBody s={sec.red_flags} />,
      preview: <RedFlagsPreview s={sec.red_flags} />,
    },
    price: sec.price && {
      free: <PriceFree s={sec.price} />,
      preview: <PricePreview s={sec.price} />,
      body: (
        <PriceBody
          s={sec.price}
          code={code}
          ltp={ltp}
          w52High={latest_price.w52_high}
          w52Low={latest_price.w52_low}
        />
      ),
    },
    dividend: sec.dividend && {
      free: <DividendFree s={sec.dividend} />,
      body: <DividendBody s={sec.dividend} />,
      preview: <DividendPreview s={sec.dividend} />,
    },
    this_year: sec.this_year && {
      free: <ThisYearFree s={sec.this_year} />,
      body: <ThisYearBody s={sec.this_year} />,
      preview: <ThisYearPreview s={sec.this_year} />,
    },
    next: sec.next && { free: <NextFree s={sec.next} />, body: <NextBody s={sec.next} />, preview: <NextPreview s={sec.next} /> },
    owners: sec.owners && {
      free: <OwnersFree s={sec.owners} />,
      body: <OwnersBody s={sec.owners} />,
      preview: <OwnersPreview s={sec.owners} />,
    },
    cash: sec.cash && { body: <CashBody s={sec.cash} />, preview: <CashPreview s={sec.cash} /> },
    safety: sec.safety && {
      free: <SafetyFree s={sec.safety} />,
      body: <SafetyBody s={sec.safety} />,
      preview: <SafetyPreview s={sec.safety} />,
    },
    quality: sec.quality && {
      // The five checks, explained, sit in the free face: the first one is
      // open to everyone and the other four open for Premium (HealthCheck's
      // own lock) — the quality section's free sample.
      free: (
        <>
          <QualityFree s={sec.quality} scoreRow={detail.score_row} />
          <QualityBody detail={detail} />
        </>
      ),
      body: detail.score_history && detail.score_history.points.length >= 2 ? (
        <div className="mt-6 border-t border-border pt-4">
          <ScoreHistory history={detail.score_history} />
        </div>
      ) : undefined,
    },
    story: sec.story && { free: <StoryFree s={sec.story} />, body: <StoryBody s={sec.story} />, preview: <StoryPreview s={sec.story} /> },
    sector: sec.sector && { free: <SectorFree s={sec.sector} /> },
    risks: sec.risks && { body: <RisksBody s={sec.risks} />, preview: <RisksPreview s={sec.risks} /> },
    alternatives: sec.alternatives && { body: <AlternativesBody s={sec.alternatives} />, preview: <AlternativesPreview s={sec.alternatives} /> },
  };

  const present = SECTION_ORDER.filter((k) => sec[k] != null);
  const youAt = present.indexOf("next") >= 0 ? present.indexOf("next") + 1 : Math.min(4, present.length);
  let n = 0;
  const items: ReactNode[] = [];
  present.forEach((k, i) => {
    if (i === youAt) {
      items.push(<YouAndThisStock key="you" code={code} ltp={ltp} report={report} n={++n} />);
    }
    const s = sec[k] as SectionBase;
    const b = bodies[k] ?? {};
    items.push(
      <div key={k}>
        {(ALIASES[k] ?? []).map((id) => <span key={id} id={id} className="stock-anchor block" aria-hidden="true" />)}
        <ReportSection
          s={s}
          code={code}
          n={++n}
          free={b.free}
          preview={b.preview}
          action={(CHECKS as string[]).includes(k) ? <ShareCheck code={code} k={k as CheckKey} name={name} /> : undefined}
        >
          {b.body}
        </ReportSection>
      </div>,
    );
  });
  if (youAt >= present.length) {
    items.push(<YouAndThisStock key="you" code={code} ltp={ltp} report={report} n={++n} />);
  }

  return (
    <>
      <span id="ch-verdict" className="stock-anchor block" aria-hidden="true" />
      <StockChapter
        id="ch-report"
        fold={false}
        title={<T en="The report" bn="রিপোর্ট" />}
        lead={
          <T
            en={`${present.length} sections on ${code}, in the order a careful buyer asks. Every fact is free; the reasons, the sums and what to watch are in Premium.`}
            bn={`${code} নিয়ে ${present.length}টি অংশ, একজন সতর্ক ক্রেতা যে ক্রমে প্রশ্ন করেন। সব তথ্য ফ্রি; কারণ, হিসাব আর যা খেয়াল রাখবেন তা প্রিমিয়ামে।`}
          />
        }
        action={
          <span className="premium-chip">
            <IconCrown size={14} /> <T en="Premium" bn="প্রিমিয়াম" />
          </span>
        }
      >
        <div className="rp-report">
          {items}
          {deep && (
            <section id="note" className="soft-card rp-sec stock-anchor" aria-labelledby="rp-note-t">
              <div className="rp-head">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="rp-n" aria-hidden="true">{++n}</span>
                  <h3 id="rp-note-t" className="min-w-0 pt-0.5 text-lg font-bold leading-snug text-text-main sm:text-xl">
                    <T en="The analyst note" bn="বিশ্লেষকের নোট" />
                  </h3>
                </div>
              </div>
              <p className="mt-2 text-sm text-text-muted">
                <T
                  en="Our written report on the company: what it does, how it makes money, and the case for and against. The first part is free."
                  bn="কোম্পানি নিয়ে আমাদের লেখা রিপোর্ট: কী করে, কীভাবে আয় করে, আর পক্ষে-বিপক্ষের যুক্তি। প্রথম অংশ ফ্রি।"
                />
              </p>
              <div className="mt-4">
                <DeepAnalysisReport report={deep} fairValue={null} />
              </div>
            </section>
          )}
        </div>
        <ReportOffer code={code} name={name} lines={report.offer} />
      </StockChapter>
    </>
  );
}
