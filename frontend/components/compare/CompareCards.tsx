import type { CSSProperties } from "react";
import { T } from "@/components/i18n/T";
import { IconChevronDown, IconCrown } from "@/components/ui/icons";
import { dayParts, daysWords } from "@/components/dividend-calendar/dates";
import type { Bi, CompareBar, CompareDate, CompareQuestion } from "@/lib/compare";

/**
 * The page's read-only parts: one card per question (the question, the answer
 * in a sentence, the bars best first, then "What this means, and more
 * figures" folded), the dates ahead as a card of the same shape, and "In
 * plain words" for Premium. Every share is a row, so five shares are five
 * bars, never five columns; each row carries the share's number so a reader
 * can follow it as the order changes card to card (2026-11-18).
 */

type Names = Record<string, string>;
type Nums = Record<string, number>;

const toneClass = (t: string) => (t === "pos" ? "cmp-pos" : t === "neg" ? "cmp-neg" : "");

/** The share's number: its place in the comparison, in ink (never a colour —
 *  on this site colour means good or bad). */
export function ShareNum({ n, small = false }: { n: number | undefined; small?: boolean }) {
  if (!n) return null;
  return (
    <span className={small ? "cmp-num cmp-num--sm" : "cmp-num"} aria-hidden="true">
      {n}
    </span>
  );
}

function Bars({ q, names, nums }: { q: CompareQuestion; names: Names; nums: Nums }) {
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
              <ShareNum n={nums[b.code]} small />
              <span className="min-w-0">
                <span className="cmp-br-co">{names[b.code] ?? b.code}</span>
                {b.sub && (
                  <span className="cmp-br-sub">
                    <T en={b.sub.en} bn={b.sub.bn} />
                  </span>
                )}
              </span>
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

/** One question: the question, the answer in a sentence, the bars best
 *  first, and what the figure means with a few more figures, folded. */
export function QuestionCard({ q, names, nums }: { q: CompareQuestion; names: Names; nums: Nums }) {
  return (
    <article id={`cq-${q.key}`} className="cmp-q" aria-labelledby={`cq-${q.key}-t`}>
      <h3 id={`cq-${q.key}-t`} className="cmp-q-h">
        <T en={q.question.en} bn={q.question.bn} />
      </h3>
      <p className="cmp-q-ans">
        <T en={q.answer.en} bn={q.answer.bn} />
      </p>
      <Bars q={q} names={names} nums={nums} />
      <details className="cmp-more">
        <summary>
          <T en="What this means, and more figures" bn="এর মানে কী, আর আরও হিসাব" />
          <IconChevronDown size={16} />
        </summary>
        <div className="cmp-more-wrap">
          <p className="cmp-q-mean">
            <T en={q.meaning.en} bn={q.meaning.bn} />
          </p>
          <div className="cmp-mini-wrap">
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
                    <th scope="row">
                      <span className="cmp-mini-co">
                        <ShareNum n={nums[r.code]} small />
                        {names[r.code] ?? r.code}
                      </span>
                    </th>
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
        </div>
      </details>
    </article>
  );
}

const SHOW_DATES = 5;

/** Every record date, AGM and results meeting on these shares, soonest
 *  first — a card of the same shape as the questions, beside the dividend. */
export function CompareDates({
  dates,
  names,
  nums,
  today,
  open,
  onToggle,
}: {
  dates: CompareDate[];
  names: Names;
  nums: Nums;
  today: string;
  open: boolean;
  onToggle: () => void;
}) {
  if (!dates.length) return null;
  const shown = open ? dates : dates.slice(0, SHOW_DATES);
  const t0 = Date.parse(`${today}T00:00:00Z`);
  return (
    <article id="cq-dates" className="cmp-q cmp-q--dates" aria-labelledby="cq-dates-t">
      <h3 id="cq-dates-t" className="cmp-q-h">
        <T en="Dates ahead" bn="সামনের তারিখ" />
      </h3>
      <p className="cmp-q-ans">
        <T en="Every date that matters for these shares in the next two months." bn="আগামী দুই মাসে এই শেয়ারগুলোর জরুরি সব তারিখ।" />
      </p>
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
                  <ShareNum n={nums[d.code]} small />
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
    </article>
  );
}

/** "In plain words" for a Premium reader, right under the shares: the
 *  summary before the detail. */
export function PlainWords({ plain }: { plain: Bi }) {
  return (
    <section className="cmp-card cmp-plain" aria-labelledby="cmp-plain-t">
      <h2 id="cmp-plain-t">
        <T en="In plain words" bn="সহজ ভাষায়" />
        <span className="cmp-prem-tag">
          <IconCrown size={13} />
          <T en="Premium" bn="প্রিমিয়াম" />
        </span>
      </h2>
      <p>
        <T en={plain.en} bn={plain.bn} />
      </p>
    </section>
  );
}
