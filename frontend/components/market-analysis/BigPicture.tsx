import Bn from "@/components/i18n/Bn";
import { IconChevronDown } from "@/components/ui/icons";
import type { MarketMood, MarketQuestion, MarketStats } from "@/lib/api";
import { crore, signed } from "@/lib/formatters";

// One reassuring Bangla line per mood tone, echoing the English takeaway.
const MOOD_BN: Record<string, string> = {
  up: "বাজার আজ চাঙা — বেশিরভাগ শেয়ারের দাম বাড়ছে।",
  down: "বাজার আজ পড়তির দিকে — তাড়াহুড়ো করবেন না।",
  weak: "বাজার কিছুটা দুর্বল — ভালো কোম্পানি বেছে নেওয়ার সময়।",
  steady: "বাজার আজ শান্ত — ধীরে-সুস্থে দেখে নিন।",
};

function idx(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/** The small number line under each answer. The backend fills `extra` for the
 *  breadth and value tiles; the other two are derived from `stats` here. */
function tileExtra(q: MarketQuestion, s: MarketStats): string | null {
  if (q.extra) return q.extra;
  if (q.key === "price" && s.dsex != null && s.year_low != null && s.year_high != null) {
    return `Index ${idx(s.dsex)} · year ${idx(s.year_low)}–${idx(s.year_high)}`;
  }
  if (q.key === "activity" && s.turnover_mn != null) {
    return s.turnover_avg_mn != null
      ? `${crore(s.turnover_mn)} traded · usually ${crore(s.turnover_avg_mn)}`
      : `${crore(s.turnover_mn)} traded`;
  }
  return null;
}

interface WhyRow {
  k: string;
  v: string;
  rule: string;
}

/** Every input behind the mood, with the exact cut-off that turns it into a
 *  word. The site's pitch is showing the working — this is where the page does. */
function whyRows(s: MarketStats): WhyRow[] {
  const rows: WhyRow[] = [];
  const traded = s.up + s.down + s.neutral;
  if (s.advancing_pct != null && traded > 0) {
    rows.push({
      k: "Shares that rose today",
      v: `${s.up} of ${traded} · ${Math.round(s.advancing_pct)}%`,
      rule: "Over 60% reads as \"going up\", under 40% as \"going down\", in between as mixed.",
    });
  }
  if (s.price_pos_pct != null && s.year_low != null && s.year_high != null) {
    rows.push({
      k: "Where the index sits this year",
      v: `${Math.round(s.price_pos_pct)}% up its range`,
      rule: `This year's low is ${idx(s.year_low)} and high ${idx(s.year_high)}. Under 25% = near the bottom, over 75% = near the top.`,
    });
  }
  if (s.week_change_pct != null) {
    rows.push({
      k: "Index over the past week",
      v: `${signed(s.week_change_pct, 1)}%`,
      rule: "A move bigger than 1% either way sets the direction; smaller counts as flat.",
    });
  }
  if (s.cheap_pct != null && s.cheap_total > 0) {
    rows.push({
      k: "Shares cheaper than their own usual price",
      v: `${s.cheap_n} of ${s.cheap_total} · ${Math.round(s.cheap_pct)}%`,
      rule: "55% or more = cheap, 35% or less = expensive. A share is \"cheap\" when today's price-to-profit is below its own multi-year average.",
    });
  }
  if (s.turnover_ratio != null && s.turnover_mn != null && s.turnover_avg_mn != null) {
    rows.push({
      k: "Money traded today vs a normal day",
      v: `${s.turnover_ratio.toFixed(2)}×`,
      rule: `${crore(s.turnover_mn)} today against ${crore(s.turnover_avg_mn)} on an average day this month. 1.15× or more = busy, 0.85× or less = quiet.`,
    });
  }
  // Guarded so a page prerendered against a pre-2026-09-12 backend payload
  // (no `feeling_word`) skips the row instead of printing "undefined".
  if (s.feeling_word && s.feeling_score != null) {
    rows.push({
      k: "How people feel",
      v: `${s.feeling_word} · ${s.feeling_score}/100`,
      rule: "Mixes today's share of risers, trading volume against yesterday, and the index move. Under 40 = worried, over 60 = confident.",
    });
  }
  return rows;
}

/**
 * The big picture — open on the canvas: the mood word, the headline sentence,
 * the takeaway and its Bengali line. Under it ONE card: the four answers
 * (prices this year · up or down today · cheap or expensive · busy or quiet)
 * in a hairline grid, and a fold-out "How we decide" with every raw number
 * and the cut-off that turns it into a word.
 */
export default function BigPicture({
  mood,
  questions,
  stats,
}: {
  mood: MarketMood;
  questions: MarketQuestion[];
  stats: MarketStats;
}) {
  const why = whyRows(stats);
  return (
    <section className="mk-hero" aria-labelledby="mk-headline">
      <p className={`mk-mood mk-mood--${mood.tone}`}>
        <span className="mk-mood-dot" aria-hidden="true" />
        Market mood: {mood.label.toLowerCase()}
      </p>
      <h2 className="mk-headline" id="mk-headline">
        {mood.sentence}
      </h2>
      {mood.sentence2 && <p className="mk-lead">{mood.sentence2}</p>}
      {MOOD_BN[mood.tone] && <Bn className="mk-lead-bn">{MOOD_BN[mood.tone]}</Bn>}

      {questions.length > 0 && (
        <div className="soft-card mk-answers">
          <div className="mk-answer-grid">
            {questions.map((q) => {
              const extra = tileExtra(q, stats);
              return (
                <div className={`mk-answer mk-answer--${q.tone}`} key={q.key ?? q.q}>
                  <p className="mk-answer-q">{q.q}</p>
                  <p className="mk-answer-a">{q.a}</p>
                  {extra ? <p className="mk-answer-x">{extra}</p> : null}
                </div>
              );
            })}
          </div>

          {why.length > 0 && (
            <details className="mk-why">
              <summary>
                How we decide
                <IconChevronDown size={16} />
              </summary>
              <div className="mk-why-body">
                <p className="mk-card-note">
                  Six plain checks, refreshed after every trading day — today&apos;s numbers and the cut-offs
                  that turn them into words.
                </p>
                <Bn className="mk-card-bn">আমরা কীসের ভিত্তিতে এই কথা বলছি — আজকের সংখ্যাগুলো এখানে।</Bn>
                <ul className="mk-why-list">
                  {why.map((r) => (
                    <li className="mk-why-row" key={r.k}>
                      <span className="mk-why-k">{r.k}</span>
                      <span className="mk-why-v">{r.v}</span>
                      <span className="mk-why-rule">{r.rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          )}
        </div>
      )}
    </section>
  );
}
