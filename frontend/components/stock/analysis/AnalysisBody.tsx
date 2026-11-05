import AnalysisPart from "@/components/stock/analysis/AnalysisPart";
import ConclusionCard from "@/components/stock/analysis/ConclusionCard";
import DatesCard from "@/components/stock/analysis/DatesCard";
import { partExtra, partPicture } from "@/components/stock/analysis/pictures";
import PortfolioFit from "@/components/stock/report/PortfolioFit";
import ReportDepth from "@/components/stock/report/ReportDepth";
import ReportOffer from "@/components/stock/report/ReportOffer";
import YouAndThisStock from "@/components/stock/report/YouAndThisStock";
import type { CompanyDetail } from "@/lib/api";
import { CONCLUSION_ID, DATES_ID, PART_ID, type StockAnalysis, type StockReport } from "@/lib/stock-report";

/**
 * The analysis under the chart (2026-11-05): the six parts in one shape,
 * the dates to know, our conclusion, the reader's own shares (signed-in
 * holders and followers only) and the short close. The summary card sits
 * above the chart (`AnalysisSummary`). All Premium: the page renders it
 * inside `ReportGate`, open, and hides it from a reader without the report.
 */
export default function AnalysisBody({
  detail,
  report,
  analysis,
}: {
  detail: CompanyDetail;
  report: StockReport;
  analysis: StockAnalysis;
}) {
  const { profile, latest_price } = detail;
  const code = profile.trading_code;
  const name = profile.company_name ?? code;
  const ltp = latest_price.ltp ?? null;
  const next = report.sections.next;
  const depth = [...analysis.parts.map((p) => PART_ID(p.key)), ...(next ? [DATES_ID] : []), CONCLUSION_ID];
  return (
    <>
      {analysis.parts.map((p, i) => (
        <AnalysisPart key={p.key} part={p} index={i} picture={partPicture(p, report)} extra={partExtra(p, report)} />
      ))}
      {next && <DatesCard next={next} />}
      {report.answer && (
        <ConclusionCard
          code={code}
          answer={report.answer}
          view={report.view ?? null}
          alternatives={report.sections.alternatives}
          ltp={ltp}
          w52High={latest_price.w52_high}
          w52Low={latest_price.w52_low}
        />
      )}
      <div className="rp-sheet an-you">
        <YouAndThisStock code={code} ltp={ltp} report={report} />
        <PortfolioFit code={code} ltp={ltp} />
      </div>
      <ReportOffer code={code} name={name} lines={report.offer} />
      <ReportDepth code={code} chapters={depth} />
    </>
  );
}
