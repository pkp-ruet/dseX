import { T } from "@/components/i18n/T";
import AnalysisPart from "@/components/stock/analysis/AnalysisPart";
import { partExtra, partPicture } from "@/components/stock/analysis/pictures";
import ReportDepth from "@/components/stock/report/ReportDepth";
import ReportOffer from "@/components/stock/report/ReportOffer";
import type { CompanyDetail } from "@/lib/api";
import { ANALYSIS_ID, PART_ID, type StockAnalysis, type StockReport } from "@/lib/stock-report";

/**
 * "Why we say this", under the chart (2026-11-24, analysis only): the six
 * parts as small cards, one sentence and one picture each, two a row on wide
 * screens, then the short close for a reader on a free analysis. Our
 * conclusion (Buy / Not yet, the buy price, the split), the dates card and
 * the reader's own-shares cards are gone: the stock page tells you what we
 * think of the company and its price, not what to do. All Premium: the page
 * renders it inside `ReportGate`, open, and hides it from a reader without
 * the analysis.
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
  const { profile } = detail;
  const code = profile.trading_code;
  const name = profile.company_name ?? code;
  const depth = [ANALYSIS_ID, ...analysis.parts.map((p) => PART_ID(p.key))];
  return (
    <>
      <section className="an-why" aria-labelledby="an-why-t">
        <div className="an-why-head">
          <h2 id="an-why-t">
            <T en="Why we say this" bn="কেন এমন বলছি" />
          </h2>
          <p>
            <T
              en="The six things we look at, each in a line and a picture. Every figure is in the numbers at the bottom of the page."
              bn="যে ছয়টি দিক আমরা দেখি, প্রতিটি এক লাইনে আর একটি ছবিতে। সব সংখ্যা পেজের নিচে দেওয়া আছে।"
            />
          </p>
        </div>
        <div className="an-pcs">
          {analysis.parts.map((p) => (
            <AnalysisPart key={p.key} part={p} picture={partPicture(p, report)} extra={partExtra(p, report)} />
          ))}
        </div>
      </section>
      <ReportOffer code={code} name={name} lines={report.offer} />
      <ReportDepth code={code} chapters={depth} />
    </>
  );
}
