import { T } from "@/components/i18n/T";
import AnalysisBadge from "@/components/stock/analysis/AnalysisBadge";
import { Meter } from "@/components/stock/visuals/kit";
import { DateT, ToneChip, money, tx } from "@/components/stock/report/fmt";
import { ANALYSIS_ALIASES, ANALYSIS_ID, type Bi, type PriceSection, type StockAnalysis, type StockReport } from "@/lib/stock-report";

/** A part's first sentence ("Low for what it earns and owns."), both languages. */
function firstSentence(b: Bi): Bi {
  const en = b.en.split(/(?<=\.)\s+/)[0];
  const bn = b.bn.split(/(?<=।)\s+/)[0];
  return { en, bn };
}

/** Today's price on our fair range: low · fair · high, today's pin. No buy
 *  price (the stock page is analysis only since 2026-11-24). */
function FairBar({ s }: { s: PriceSection }) {
  const f = s.fair;
  if (!f) return null;
  const min = Math.min(s.today, f.low) * 0.85;
  const max = Math.max(s.today, f.high) * 1.12;
  return (
    <Meter
      min={min}
      max={max}
      label={`Our fair price ${money(f.low)} to ${money(f.high)}; today ${money(s.today)}`}
      zones={[
        { key: "low", from: min, to: f.low, tone: "good", name: <T en="Low" bn="কম" /> },
        { key: "fair", from: f.low, to: f.high, tone: "neutral", name: <T en={`Fair ${money(f.low)}–${money(f.high)}`} bn={`ন্যায্য ${money(f.low)}–${money(f.high)}`} /> },
        { key: "high", from: f.high, to: max, tone: "bad", name: <T en="High" bn="বেশি" /> },
      ]}
      pins={[{ key: "today", value: s.today, main: true, text: <T en={`Today ${money(s.today)}`} bn={`আজ ${money(s.today)}`} /> }]}
    />
  );
}

const GOOD_MARK = "✓";
const WATCH_MARK = "!";

/**
 * "Our analysis, in short" (2026-11-24, user: "too much facts, numbers and
 * explanation … need a simplified, easy to understand analysis"; mockup
 * https://claude.ai/artifact/2shfh7wSivDZXcExSTabQB). ONE card: one line of
 * our view, up to three good things, up to two things to watch, and today's
 * price on our fair range. Replaced the summary card with its six tiles and
 * the conclusion card (Buy / Not yet, the buy price, the Buy / Sell split).
 * The old anchors of both land here. Premium, like the whole analysis.
 */
export default function InShort({
  analysis,
  report,
}: {
  analysis: StockAnalysis;
  report: StockReport;
}) {
  const good = analysis.good ?? [];
  const watch = analysis.watch ?? [];
  const pricePart = analysis.parts.find((p) => p.key === "price") ?? null;
  const pr = report.sections.price ?? null;
  const updated = report.updated;
  return (
    <section id={ANALYSIS_ID} className="stock-anchor soft-card an-card an-short" aria-labelledby="an-short-t">
      {ANALYSIS_ALIASES.map((a) => (
        <span key={a} id={a} className="stock-anchor block" aria-hidden="true" />
      ))}
      <p className="an-eyebrow">
        <AnalysisBadge />
        {updated && (
          <span>
            <T en="Updated " bn="হালনাগাদ " />
            <DateT iso={updated.date} />
            {", "}
            {tx(updated.reason)}
          </span>
        )}
      </p>
      <h2 id="an-short-t" className="an-short-h">
        <T en="Our analysis, in short" bn="সংক্ষেপে আমাদের বিশ্লেষণ" />
      </h2>
      {analysis.lead && <p className="an-lead">{tx(analysis.lead)}</p>}

      <div className="an-gw">
        <div>
          <h3 className="an-k">
            <T en="What's good" bn="ভালো দিক" />
          </h3>
          {good.length > 0 ? (
            <ul className="an-pts">
              {good.map((g, i) => (
                <li key={i}>
                  <span className="an-mk" data-tone="good" aria-hidden="true">{GOOD_MARK}</span>
                  <span>{tx(g)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="an-none">
              <T en="Nothing stands out as strong on our checks." bn="আমাদের যাচাইয়ে আলাদা করে শক্তিশালী কিছু নেই।" />
            </p>
          )}
        </div>
        <div>
          <h3 className="an-k">
            <T en="What to watch" bn="যা খেয়াল রাখবেন" />
          </h3>
          {watch.length > 0 ? (
            <ul className="an-pts">
              {watch.map((w, i) => (
                <li key={i}>
                  <span className="an-mk" data-tone={w.tone} aria-hidden="true">{WATCH_MARK}</span>
                  <span>{tx(w.text)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="an-none">
              <T en="Nothing worth a warning on our checks." bn="আমাদের যাচাইয়ে সতর্ক হওয়ার মতো কিছু নেই।" />
            </p>
          )}
        </div>
      </div>

      {pricePart && (
        <div className="an-pv">
          <div className="an-pv-h">
            <h3 className="an-k">
              <T en="Today's price" bn="আজকের দাম" />
            </h3>
            <ToneChip word={pricePart.word} tone={pricePart.tone} />
          </div>
          {pr?.fair ? (
            <>
              <FairBar s={pr} />
              <p className="an-pv-line">{tx(firstSentence(pricePart.answer))}</p>
            </>
          ) : (
            <p className="an-pv-line">{tx(pricePart.answer)}</p>
          )}
        </div>
      )}
    </section>
  );
}
