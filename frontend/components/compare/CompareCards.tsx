import type { CSSProperties } from "react";
import { T } from "@/components/i18n/T";
import { IconChevronDown } from "@/components/ui/icons";
import { dayParts, daysWords } from "@/components/dividend-calendar/dates";
import type { CompareBar, CompareDate, CompareQuestion } from "@/lib/compare";

/**
 * The page's read-only parts: the short version (who leads each question),
 * one card per question (the answer, the sorted bars, what the figure means
 * and "More figures"), and the dates ahead. Every share is a row, so five
 * shares are five bars, never five columns.
 */

type Names = Record<string, string>;

const toneClass = (t: string) => (t === "pos" ? "cmp-pos" : t === "neg" ? "cmp-neg" : "");

/** "The short version": each question's glance word and who leads it. */
export function ShortVersion({ questions, names }: { questions: CompareQuestion[]; names: Names }) {
  return (
    <section className="cmp-short cmp-card" aria-labelledby="cmp-short-t">
      <h2 id="cmp-short-t" className="cmp-short-h">
        <T en="The short version" bn="এক নজরে" />
      </h2>
      <ul className="cmp-short-list">
        {questions.map((q) => {
          const top = q.bars[0];
          const who = q.leaders.map((c) => names[c] ?? c);
          return (
            <li key={q.key}>
              <a href={`#cq-${q.key}`} className="cmp-sv">
                <span className="cmp-sv-q">{q.glance ? <T en={q.glance.en} bn={q.glance.bn} /> : <T en={q.topic.en} bn={q.topic.bn} />}</span>
                <span className="cmp-sv-who">
                  {who.length ? (
                    <>
                      <b>
                        <T en={who.join(" and ")} bn={who.join(" ও ")} />
                      </b>
                      {top && top.value != null && (
                        <span className={`cmp-sv-v ${toneClass(top.tone)}`}>
                          <T en={top.label.en} bn={top.label.bn} />
                        </span>
                      )}
                    </>
                  ) : (
                    <T en="No figures yet" bn="এখনো হিসাব নেই" />
                  )}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Bars({ q, names }: { q: CompareQuestion; names: Names }) {
  const have = q.bars.filter((b) => b.value != null) as (CompareBar & { value: number })[];
  const max = Math.max(...have.map((b) => Math.abs(b.value)), 0) || 1;
  const lead = new Set(q.leaders);
  return (
    <ul className="cmp-bars">
      {q.bars.map((b) => {
        const v = b.value;
        let fill: CSSProperties | null = null;
        if (v != null) {
          if (q.diverge) {
            const w = (Math.abs(v) / max) * 50;
            fill = v >= 0 ? { left: "50%", width: `${w}%` } : { left: `${50 - w}%`, width: `${w}%` };
          } else {
            fill = { left: 0, width: `${(Math.max(0, v) / max) * 100}%` };
          }
        }
        const cls = q.diverge ? (v != null && v < 0 ? "is-down" : "is-up") : lead.has(b.code) ? "is-lead" : "";
        return (
          <li key={b.code} className={`cmp-br ${lead.has(b.code) ? "is-leader" : ""}`}>
            <span className="cmp-br-name">
              <span className="cmp-br-co">{names[b.code] ?? b.code}</span>
              {b.sub && (
                <span className="cmp-br-sub">
                  <T en={b.sub.en} bn={b.sub.bn} />
                </span>
              )}
            </span>
            <span className={`cmp-br-track ${q.diverge ? "is-div" : ""}`} aria-hidden="true">
              {fill && <i className={cls} style={fill} />}
            </span>
            <span className={`cmp-br-val ${toneClass(b.tone)}`}>
              <T en={b.label.en} bn={b.label.bn} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** One question: what it asks, the answer in a sentence, the bars best
 *  first, what the figure means, and a few more figures folded. */
export function QuestionCard({ q, names }: { q: CompareQuestion; names: Names }) {
  return (
    <article id={`cq-${q.key}`} className="cmp-q" aria-labelledby={`cq-${q.key}-t`}>
      <p className="cmp-q-topic">
        <T en={q.topic.en} bn={q.topic.bn} />
      </p>
      <h3 id={`cq-${q.key}-t`} className="cmp-q-h">
        <T en={q.question.en} bn={q.question.bn} />
      </h3>
      <p className="cmp-q-ans">
        <T en={q.answer.en} bn={q.answer.bn} />
      </p>
      <Bars q={q} names={names} />
      <p className="cmp-q-mean">
        <T en={q.meaning.en} bn={q.meaning.bn} />
      </p>
      <details className="cmp-more">
        <summary>
          <T en="More figures" bn="আরও হিসাব" />
          <IconChevronDown size={16} />
        </summary>
        <div className="cmp-more-wrap">
          <table className="cmp-mini">
            <thead>
              <tr>
                <th scope="col">
                  <span className="sr-only">
                    <T en="Company" bn="কোম্পানি" />
                  </span>
                </th>
                {q.more.cols.map((c) => (
                  <th key={c.en} scope="col">
                    <T en={c.en} bn={c.bn} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {q.more.rows.map((r) => (
                <tr key={r.code}>
                  <th scope="row">{names[r.code] ?? r.code}</th>
                  {r.cells.map((c, i) => (
                    <td key={i}>
                      <T en={c.en} bn={c.bn} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </article>
  );
}

const SHOW_DATES = 5;

/** Every record date, AGM and results meeting on these shares, soonest first. */
export function CompareDates({
  dates,
  names,
  today,
  open,
  onToggle,
}: {
  dates: CompareDate[];
  names: Names;
  today: string;
  open: boolean;
  onToggle: () => void;
}) {
  if (!dates.length) return null;
  const shown = open ? dates : dates.slice(0, SHOW_DATES);
  const t0 = Date.parse(`${today}T00:00:00Z`);
  return (
    <section className="cmp-sec" aria-labelledby="cmp-dates-t">
      <div className="cmp-sec-h">
        <h2 id="cmp-dates-t">
          <T en="Dates ahead" bn="সামনের তারিখ" />
        </h2>
        <p>
          <T en="Every date that matters for these shares in the next two months, in one list." bn="আগামী দুই মাসে এই শেয়ারগুলোর জরুরি সব তারিখ, এক তালিকায়।" />
        </p>
      </div>
      <div className="cmp-card">
        <ul className="cmp-dates">
          {shown.map((d) => {
            const p = dayParts(d.date);
            const n = Math.round((Date.parse(`${d.date}T00:00:00Z`) - t0) / 86_400_000);
            const when = daysWords(n);
            return (
              <li key={`${d.date}-${d.code}-${d.kind}`} className="cmp-dt">
                <span className={`cmp-dt-tile ${n === 0 ? "is-today" : ""}`} aria-hidden="true">
                  <b>{p?.day}</b>
                  <span>{p && <T en={p.month.en} bn={p.month.bn} />}</span>
                </span>
                <span className="min-w-0">
                  <span className="cmp-dt-what">
                    <b>{names[d.code] ?? d.code}</b> · <T en={d.label.en} bn={d.label.bn} />
                    {when && (
                      <span className="cmp-dt-when">
                        <T en={when.en} bn={when.bn} />
                      </span>
                    )}
                  </span>
                  <span className="cmp-dt-line">
                    <T en={d.line.en} bn={d.line.bn} />
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
        {dates.length > SHOW_DATES && (
          <button type="button" className="cmp-showall" onClick={onToggle} aria-expanded={open}>
            {open ? <T en="Show fewer" bn="কম দেখুন" /> : <T en={`Show all ${dates.length} dates`} bn={`সব ${dates.length}টি তারিখ দেখুন`} />}
          </button>
        )}
      </div>
    </section>
  );
}
