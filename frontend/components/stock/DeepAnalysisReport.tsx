import type { DeepAnalysisReport as Report, DeepAnalysisSection, WrittenBeforeResults } from "@/lib/api";
import Markdown from "@/lib/markdown";
import { T, TBlock } from "@/components/i18n/T";
import { formatDate } from "@/lib/formatters";
import { bnDate } from "@/lib/bn";

interface Props {
  report: Report;
  /** Set when the company posted results after the analysis was written. */
  writtenBefore: WrittenBeforeResults | null;
}

// Bull case reads positive, bear case negative; everything else uses the brand accent.
function accentFor(key: string): string {
  if (key === "bull_case") return "border-positive";
  if (key === "bear_case") return "border-negative";
  return "border-primary";
}

/** Both halves of a report field; the Bengali falls back to the English. */
const pair = (en: string | null | undefined, bn: string | null | undefined) => {
  const e = en ?? bn ?? "";
  return <T en={e} bn={bn ?? e} />;
};

const day = (iso: string) => ({ en: formatDate(iso), bn: bnDate(iso) || iso });

/**
 * The written analysis: the data room's "Written analysis" tab on the stock
 * page (`#note`). The tab is Premium and sits open inside the report scope, so
 * this renders every section, open. The standalone `/analysis` layout, its
 * live value box (`ValueTodayBox`) and the locks that hid all but the first
 * section were deleted with the audit's dead-code pass (SP14, 2026-11-05).
 *
 * The analyses are written once and kept (`data/deep_analysis/`); when the
 * company has posted results since, the tab says so first (audit SP2), so a
 * reader knows some figures are older than the full report's.
 */
export default function DeepAnalysisReport({ report, writtenBefore }: Props) {
  const sectionBody = (s: DeepAnalysisSection) => (
    <TBlock
      en={<Markdown text={s.body_en ?? s.body_bn ?? ""} className="text-base" />}
      bn={<Markdown text={s.body_bn ?? s.body_en ?? ""} className="text-base" />}
    />
  );
  const written = report.as_of_date ? day(report.as_of_date) : null;
  const posted = writtenBefore ? day(writtenBefore.posted) : null;

  return (
    <article>
      {/* Its age first, when the company has reported since it was written. */}
      {posted && (
        <p className="mb-4 rounded-xl border border-border bg-surface-2 p-4 text-sm leading-snug text-text-main" role="note">
          <b className="block font-semibold">
            <T en="Written before its latest results" bn="সর্বশেষ আর্থিক ফলের আগে লেখা" />
          </b>
          <T
            en={`${written ? `We wrote this on ${written.en}. ` : ""}The company posted ${writtenBefore?.full_year ? "its yearly results" : "new results"} on ${posted.en}, so some figures below are older. The full report above uses the newest ones.`}
            bn={`${written ? `এই বিশ্লেষণ লেখা হয়েছে ${written.bn}-এ। ` : ""}এরপর ${posted.bn}-এ কোম্পানি ${writtenBefore?.full_year ? "বার্ষিক আর্থিক ফল" : "নতুন আর্থিক ফল"} প্রকাশ করেছে, তাই নিচের কিছু সংখ্যা পুরোনো। ওপরের পূর্ণ রিপোর্টে নতুন সংখ্যাগুলো আছে।`}
          />
        </p>
      )}

      {/* Thesis in ~20 seconds: headline + bottom line */}
      <p className="text-xl sm:text-2xl font-bold leading-snug mb-3 text-text-main">
        {pair(report.headline_en, report.headline_bn)}
      </p>
      <p className="text-base sm:text-lg leading-relaxed mb-6 text-text-muted">
        {pair(report.bottom_line_en, report.bottom_line_bn)}
      </p>

      {written && !posted && (
        <p className="text-xs mb-6 text-text-muted">
          <T en={`Figures as of ${written.en}`} bn={`তথ্য ${written.bn} পর্যন্ত`} />
        </p>
      )}

      {(report.data_note_en || report.data_note_bn) && (
        <div className="rounded-xl p-4 mb-6 text-sm leading-snug bg-surface-2 border border-border text-text-muted">
          {pair(report.data_note_en, report.data_note_bn)}
        </div>
      )}

      {/* The ten durable sections, all open, the takeaway as the lead line. */}
      <div className="space-y-8">
        {report.sections.map((s, i) => (
          <section key={s.key} className="stock-anchor" id={`sec-${s.key}`}>
            <div className="flex items-baseline gap-2.5 mb-2">
              <span className="text-xs font-bold tabular-nums shrink-0 text-text-muted">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="text-lg sm:text-xl font-bold leading-snug text-text-main">{pair(s.title_en, s.title_bn)}</h3>
            </div>
            <p className={`text-base font-semibold leading-snug mb-3 pl-3 border-l-[3px] text-text-main ${accentFor(s.key)}`}>
              {pair(s.takeaway_en, s.takeaway_bn)}
            </p>
            {sectionBody(s)}
          </section>
        ))}
      </div>

      {/* Fine print */}
      {(report.disclaimer_en || report.disclaimer_bn) && (
        <p className="text-xs leading-snug mt-10 pt-6 text-text-muted border-t border-border">
          {pair(report.disclaimer_en, report.disclaimer_bn)}
        </p>
      )}
    </article>
  );
}
