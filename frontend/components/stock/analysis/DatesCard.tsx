import { T } from "@/components/i18n/T";
import { NextFree } from "@/components/stock/report/sections";
import { tx } from "@/components/stock/report/fmt";
import { DATES_ALIASES, DATES_ID, type NextSection } from "@/lib/stock-report";

/**
 * Dates to know (2026-11-05): the results, the last day to buy for a
 * dividend, the record date and the AGM, left to right, and under them what
 * each one means for a shareholder — in the open.
 */
export default function DatesCard({ next }: { next: NextSection }) {
  const dated = next.items.filter((it) => it.date);
  if (!dated.length) return null;
  const expect = next.items.filter((it) => it.expect);
  return (
    <section id={DATES_ID} className="stock-anchor soft-card an-card" aria-labelledby={`${DATES_ID}-t`}>
      {DATES_ALIASES.map((a) => (
        <span key={a} id={a} className="stock-anchor block" aria-hidden="true" />
      ))}
      <h2 id={`${DATES_ID}-t`} className="an-card-h">
        <T en="Dates to know" bn="যে তারিখগুলো জানা দরকার" />
      </h2>
      <p className="an-card-lead">{tx(next.headline)}</p>
      <NextFree s={next} />
      {expect.length > 0 && (
        <ul className="an-expect">
          {expect.map((it, i) => (
            <li key={i}>
              <b>{tx(it.label)}</b>
              {tx(it.expect)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
