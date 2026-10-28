import type { ReactNode } from "react";
import StockChapter from "@/components/stock/StockChapter";
import ReportSection from "@/components/stock/report/ReportSection";
import ReportGuide from "@/components/stock/report/ReportGuide";
import ReportOffer from "@/components/stock/report/ReportOffer";
import ShareCheck from "@/components/stock/report/ShareCheck";
import YouAndThisStock from "@/components/stock/report/YouAndThisStock";
import ScoreHistory from "@/components/stock/ScoreHistory";
import DeepAnalysisReport from "@/components/stock/DeepAnalysisReport";
import { T } from "@/components/i18n/T";
import {
  AlternativesBody, CashBody, DividendBody, DividendFree, NextBody, NextFree, OwnersBody, OwnersFree,
  PriceBody, PriceFree, QualityBody, QualityFree, RedFlagsBody, RedFlagsFree, RisksBody, SafetyBody, SafetyFree,
  SectorFree, StoryBody, StoryFree, ThisYearBody, ThisYearFree,
} from "@/components/stock/report/sections";
import { freeReportSections } from "@/lib/free-share";
import type { CompanyDetail, DeepAnalysisReport as DeepReport } from "@/lib/api";
import { REPORT_PARTS, SECTION_ORDER, type CheckKey, type SectionBase, type SectionKey, type StockReport } from "@/lib/stock-report";
import { tx } from "@/components/stock/report/fmt";

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
 * The stock report (2026-10-28): every section in report order, in three
 * parts (`REPORT_PARTS`, 2026-10-29) — each part a chapter (h2) with its
 * sections on one sheet split by hairlines — then "You and this stock" (inside
 * the second part), the analyst note (where a written report exists) and the
 * one offer. A free reader gets the map first (`ReportGuide`) and a few
 * sections open in full (`freeReportSections`); every other Premium panel is
 * closed whole.
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

  // Each section: its free face and its Premium body.
  const bodies: Partial<Record<SectionKey, { free?: ReactNode; body?: ReactNode }>> = {
    red_flags: sec.red_flags && {
      free: <RedFlagsFree s={sec.red_flags} />,
      body: <RedFlagsBody s={sec.red_flags} />,
    },
    price: sec.price && {
      free: <PriceFree s={sec.price} />,
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
    },
    this_year: sec.this_year && {
      free: <ThisYearFree s={sec.this_year} />,
      body: <ThisYearBody s={sec.this_year} />,
    },
    next: sec.next && { free: <NextFree s={sec.next} />, body: <NextBody s={sec.next} /> },
    owners: sec.owners && {
      free: <OwnersFree s={sec.owners} />,
      body: <OwnersBody s={sec.owners} />,
    },
    cash: sec.cash && { body: <CashBody s={sec.cash} /> },
    safety: sec.safety && {
      free: <SafetyFree s={sec.safety} />,
      body: <SafetyBody s={sec.safety} />,
    },
    quality: sec.quality && {
      // Free: the score and the five bars. Premium: the five checks
      // explained, then the score history.
      free: <QualityFree s={sec.quality} scoreRow={detail.score_row} />,
      body: (
        <>
          <QualityBody detail={detail} />
          {detail.score_history && detail.score_history.points.length >= 2 && (
            <div className="mt-6 border-t border-border pt-4">
              <ScoreHistory history={detail.score_history} />
            </div>
          )}
        </>
      ),
    },
    story: sec.story && { free: <StoryFree s={sec.story} />, body: <StoryBody s={sec.story} /> },
    sector: sec.sector && { free: <SectorFree s={sec.sector} /> },
    risks: sec.risks && { body: <RisksBody s={sec.risks} /> },
    alternatives: sec.alternatives && { body: <AlternativesBody s={sec.alternatives} /> },
  };

  const present = SECTION_ORDER.filter((k) => sec[k] != null);
  const samples = freeReportSections(present);
  const sampleLinks = samples.map((k) => ({
    key: k,
    label: report.scorecard.find((c) => c.key === k)?.label ?? (sec[k as SectionKey] as SectionBase).title,
  }));
  const section = (k: SectionKey) => {
    const b = bodies[k] ?? {};
    return (
      <ReportSection
        key={k}
        s={sec[k] as SectionBase}
        code={code}
        free={b.free}
        aliases={ALIASES[k]}
        sample={samples.includes(k)}
        action={(CHECKS as string[]).includes(k) ? <ShareCheck code={code} k={k as CheckKey} name={name} /> : undefined}
      >
        {b.body}
      </ReportSection>
    );
  };
  const you = <YouAndThisStock key="you" code={code} ltp={ltp} report={report} />;

  // Three parts, each one sheet. "You and this stock" sits after "What
  // happens next" (or opens the second part), else closes the first.
  const parts = REPORT_PARTS.map((p) => ({ ...p, keys: p.sections.filter((k) => sec[k] != null) }));
  const nowHas = parts.some((p) => p.id === "ch-now" && p.keys.length > 0);
  const shown = parts.filter((p) => p.keys.length > 0 || (p.id === "ch-essentials" && !nowHas));

  return (
    <>
      {/* Older links to the report land on its first part. */}
      <span id="ch-verdict" className="stock-anchor block" aria-hidden="true" />
      <span id="ch-report" className="stock-anchor block" aria-hidden="true" />
      <ReportGuide samples={sampleLinks} />
      {shown.map((p) => {
        const items: ReactNode[] = p.keys.map(section);
        if (p.id === "ch-now") {
          const at = p.keys.indexOf("next");
          items.splice(at >= 0 ? at + 1 : 0, 0, you);
        } else if (p.id === "ch-essentials" && !nowHas) {
          items.push(you);
        }
        return (
          <StockChapter key={p.id} id={p.id} fold={false} title={tx(p.title)} lead={tx(p.lead)}>
            <div className="rp-sheet">{items}</div>
          </StockChapter>
        );
      })}
      {deep && (
        <StockChapter
          id="note"
          fold={false}
          title={<T en="The analyst note" bn="বিশ্লেষকের নোট" />}
          lead={
            <T
              en="Our written report on the company: what it does, how it makes money, and the case for and against."
              bn="কোম্পানি নিয়ে আমাদের লেখা রিপোর্ট: কী করে, কীভাবে আয় করে, আর পক্ষে-বিপক্ষের যুক্তি।"
            />
          }
        >
          <div className="rp-sheet rp-sheet-pad">
            <DeepAnalysisReport report={deep} fairValue={null} code={code} />
          </div>
        </StockChapter>
      )}
      <ReportOffer code={code} name={name} lines={report.offer} />
    </>
  );
}
