import { T } from "@/components/i18n/T";
import WatchlistButton from "@/components/stock/WatchlistButton";
import BuyBelowAlert from "@/components/stock/report/BuyBelowAlert";
import { AlternativesDetails } from "@/components/stock/report/sections";
import { ToneChip, money, tx } from "@/components/stock/report/fmt";
import { AnalysisList } from "@/components/stock/analysis/AnalysisPart";
import {
  CONCLUSION_ALIASES, CONCLUSION_ID,
  type AlternativesSection, type ReportView, type StockAnswer,
} from "@/lib/stock-report";

/**
 * Our conclusion (2026-11-05, user: the analysis must not open with "Should
 * you buy it today?" — the answer now comes AFTER the analysis): the answer
 * (Buy / Not yet / No reason to buy / Avoid, the Buy signal's own rules), our
 * buy price, since when, the case for and against, what would change it,
 * better choices in its sector, an alert and following. It replaced the
 * answer card at the top and Our view at the end. Premium.
 */
export default function ConclusionCard({
  code,
  answer,
  view,
  alternatives,
  ltp,
  w52High,
  w52Low,
}: {
  code: string;
  answer: StockAnswer;
  view: ReportView | null;
  alternatives?: AlternativesSection;
  ltp: number | null;
  w52High?: number | null;
  w52Low?: number | null;
}) {
  const buy = answer.buy_price ?? view?.buy_price ?? null;
  return (
    <section id={CONCLUSION_ID} className="stock-anchor soft-card an-card an-concl" aria-labelledby={`${CONCLUSION_ID}-t`}>
      {CONCLUSION_ALIASES.map((a) => (
        <span key={a} id={a} className="stock-anchor block" aria-hidden="true" />
      ))}
      <p className="an-concl-k">
        <T en="Our conclusion" bn="আমাদের সিদ্ধান্ত" />
      </p>
      <h2 id={`${CONCLUSION_ID}-t`} className="an-card-h">
        <T en="So, should you buy it today?" bn="তাহলে, আজ কি শেয়ারটি কেনা উচিত?" />
      </h2>
      <div className="an-concl-head mt-3">
        <ToneChip word={answer.word} tone={answer.tone} size="lg" />
        {buy != null && (
          <span className="an-concl-price nums">
            <T en={`Worth buying under ${money(buy)}`} bn={`${money(buy)}-এর নিচে কেনা যায়`} />
          </span>
        )}
      </div>
      <p className="an-concl-line">{tx(answer.line)}</p>
      {answer.history && <p className="an-concl-since">{tx(answer.history.line)}</p>}

      {view && (view.for.length > 0 || view.against.length > 0) && (
        <div className="an-cases">
          {view.for.length > 0 && (
            <div className="an-case">
              <h3><T en="For buying it" bn="কেনার পক্ষে" /></h3>
              <AnalysisList lines={view.for.map((t) => ({ tone: "good" as const, text: t }))} />
            </div>
          )}
          {view.against.length > 0 && (
            <div className="an-case">
              <h3><T en="Against it" bn="কেনার বিপক্ষে" /></h3>
              <AnalysisList lines={view.against.map((t) => ({ tone: "fair" as const, text: t }))} />
            </div>
          )}
        </div>
      )}
      {view && view.change.length > 0 && (
        <div className="an-case an-case-wide">
          <h3><T en="What would change our answer" bn="কী হলে আমাদের উত্তর বদলাবে" /></h3>
          <AnalysisList lines={view.change.map((t) => ({ tone: "info" as const, text: t }))} />
        </div>
      )}

      {alternatives && alternatives.items.length > 0 && (
        <div className="an-better">
          <h3><T en="Better choices in its sector" bn="একই সেক্টরে আরও ভালো বিকল্প" /></h3>
          <p className="m-0 mt-1 text-sm text-text-main">{tx(alternatives.headline)}</p>
          <AlternativesDetails s={alternatives} />
        </div>
      )}

      <div className="an-acts">
        {buy != null && <BuyBelowAlert code={code} target={buy} ltp={ltp} w52High={w52High} w52Low={w52Low} />}
        <WatchlistButton code={code} />
        <p>
          <T
            en="Follow it and we tell you when our answer changes, a serious problem appears or new results land."
            bn="ফলো করলে আমাদের উত্তর বদলালে, গুরুতর সমস্যা দেখা দিলে বা নতুন ফল এলে জানাব।"
          />
        </p>
      </div>
      <p className="an-fine">
        <T
          en="Our reading of public figures, not investment advice."
          bn="এটি প্রকাশিত তথ্য থেকে আমাদের বিশ্লেষণ, বিনিয়োগ পরামর্শ নয়।"
        />
      </p>
    </section>
  );
}
