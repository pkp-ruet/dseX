import { T } from "@/components/i18n/T";
import { IconChevronDown } from "@/components/ui/icons";
import type { MarketMood, MarketQuestion, MarketStats } from "@/lib/api";
import { crore, signed } from "@/lib/formatters";
import { croreBn } from "@/lib/bn";

// Fallbacks for an older backend without the mood's Bengali twins.
const MOOD_WORD_BN: Record<string, string> = {
  up: "বাড়ছে",
  down: "কমছে",
  weak: "শান্ত ও দুর্বল",
  steady: "স্থির",
};
const MOOD_LINE_BN: Record<string, string> = {
  up: "আজ বেশির ভাগ শেয়ারের দাম বেড়েছে।",
  down: "আজ বেশির ভাগ শেয়ারের দাম কমেছে। তাড়াহুড়ো না করাই ভালো।",
  weak: "বাজার কিছুটা দুর্বল। ভালো কোম্পানি বেছে নেওয়ার সময় হতে পারে।",
  steady: "বাজার আজ শান্ত। ধীরে-সুস্থে দেখে নিন।",
};
const FEELING_BN: Record<string, string> = {
  Worried: "উদ্বিগ্ন",
  Calm: "শান্ত",
  Confident: "আত্মবিশ্বাসী",
};

interface Bi {
  en: string;
  bn: string;
}

function idx(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/** The small number line under each answer. The backend fills `extra` for the
 *  breadth and value tiles; the other two are derived from `stats` here. */
function tileExtra(q: MarketQuestion, s: MarketStats): Bi | null {
  if (q.extra) return { en: q.extra, bn: q.extra_bn ?? q.extra };
  if (q.key === "price" && s.dsex != null && s.year_low != null && s.year_high != null) {
    return {
      en: `Index ${idx(s.dsex)} · this year ${idx(s.year_low)} to ${idx(s.year_high)}`,
      bn: `সূচক ${idx(s.dsex)} · এ বছর ${idx(s.year_low)} থেকে ${idx(s.year_high)}`,
    };
  }
  if (q.key === "activity" && s.turnover_mn != null) {
    return s.turnover_avg_mn != null
      ? {
          en: `${crore(s.turnover_mn)} traded · usually ${crore(s.turnover_avg_mn)}`,
          bn: `${croreBn(s.turnover_mn)} লেনদেন · সাধারণত ${croreBn(s.turnover_avg_mn)}`,
        }
      : { en: `${crore(s.turnover_mn)} traded`, bn: `${croreBn(s.turnover_mn)} লেনদেন` };
  }
  return null;
}

interface WhyRow {
  k: Bi;
  v: Bi;
  rule: Bi;
}

/** Every input behind the mood, with the exact cut-off that turns it into a
 *  word. The site's pitch is showing the working — this is where the page does. */
function whyRows(s: MarketStats): WhyRow[] {
  const rows: WhyRow[] = [];
  // advancing_pct = rose / (rose + fell): unchanged and untraded shares are left out.
  const moved = s.up + s.down;
  if (s.advancing_pct != null && moved > 0) {
    const pct = Math.round(s.advancing_pct);
    rows.push({
      k: { en: "Shares that rose today", bn: "আজ যত শেয়ারের দাম বেড়েছে" },
      v: {
        en: `${s.up} rose, ${s.down} fell · ${pct}% rose`,
        bn: `${s.up}টি বেড়েছে, ${s.down}টি কমেছে · ${pct}% বেড়েছে`,
      },
      rule: {
        en: "Counted over the shares whose price moved. Over 60% reads as rising and under 40% as falling. Anything in between is mixed.",
        bn: "যেসব শেয়ারের দাম বদলেছে শুধু সেগুলো ধরে হিসাব। 60%-এর বেশি হলে বাজার বাড়ছে, 40%-এর কম হলে কমছে। মাঝামাঝি হলে মিশ্র।",
      },
    });
  }
  if (s.price_pos_pct != null && s.year_low != null && s.year_high != null) {
    rows.push({
      k: { en: "Where the index sits this year", bn: "এ বছর সূচক কোথায় আছে" },
      v: {
        en: `${Math.round(s.price_pos_pct)}% of the way up its range`,
        bn: `বছরের সীমার ${Math.round(s.price_pos_pct)}% ওপরে`,
      },
      rule: {
        en: `This year's low is ${idx(s.year_low)} and its high is ${idx(s.year_high)}. Under 25% is near the bottom, and over 75% is near the top.`,
        bn: `এ বছরের সর্বনিম্ন ${idx(s.year_low)} আর সর্বোচ্চ ${idx(s.year_high)}। 25%-এর নিচে মানে সর্বনিম্নের কাছে, 75%-এর ওপরে মানে সর্বোচ্চের কাছে।`,
      },
    });
  }
  if (s.week_change_pct != null) {
    const v = `${signed(s.week_change_pct, 1)}%`;
    rows.push({
      k: { en: "The index over the past week", bn: "গত এক সপ্তাহে সূচক" },
      v: { en: v, bn: v },
      rule: {
        en: "A move bigger than 1% either way sets the direction. A smaller move counts as flat.",
        bn: "যেকোনো দিকে 1%-এর বেশি নড়লে দিক ঠিক হয়। এর কম হলে সমান ধরা হয়।",
      },
    });
  }
  if (s.cheap_pct != null && s.cheap_total > 0) {
    rows.push({
      k: { en: "Shares cheaper than their own usual price", bn: "নিজের স্বাভাবিক দামের চেয়ে সস্তা শেয়ার" },
      v: {
        en: `${s.cheap_n} of ${s.cheap_total} · ${Math.round(s.cheap_pct)}%`,
        bn: `${s.cheap_total}টির মধ্যে ${s.cheap_n}টি · ${Math.round(s.cheap_pct)}%`,
      },
      rule: {
        en: "55% or more is cheap, and 35% or less is expensive. A share counts as cheap when its P/E today is below its own average of recent years.",
        bn: "55% বা তার বেশি হলে দাম কম, 35% বা তার কম হলে দাম বেশি। আজকের পিই যদি গত কয়েক বছরের নিজের গড়ের চেয়ে কম হয়, শেয়ারটিকে সস্তা ধরা হয়।",
      },
    });
  }
  if (s.turnover_ratio != null && s.turnover_mn != null && s.turnover_avg_mn != null) {
    const v = `${s.turnover_ratio.toFixed(2)}×`;
    rows.push({
      k: { en: "Money traded today against a normal day", bn: "স্বাভাবিক দিনের তুলনায় আজকের লেনদেন" },
      v: { en: v, bn: v },
      rule: {
        en: `${crore(s.turnover_mn)} today, against ${crore(s.turnover_avg_mn)} on an average day this month. 1.15× or more is busy, and 0.85× or less is quiet.`,
        bn: `আজ ${croreBn(s.turnover_mn)}, এ মাসের গড় দিনে ${croreBn(s.turnover_avg_mn)}। 1.15 গুণ বা বেশি হলে ব্যস্ত, 0.85 গুণ বা কম হলে শান্ত।`,
      },
    });
  }
  // Guarded so a page prerendered against a pre-2026-09-12 backend payload
  // (no `feeling_word`) skips the row instead of printing "undefined".
  if (s.feeling_word && s.feeling_score != null) {
    rows.push({
      k: { en: "How investors feel", bn: "বিনিয়োগকারীরা কেমন বোধ করছেন" },
      v: {
        en: `${s.feeling_word} · ${s.feeling_score}/100`,
        bn: `${FEELING_BN[s.feeling_word] ?? s.feeling_word} · ${s.feeling_score}/100`,
      },
      rule: {
        en: "This mixes today's share of risers, trading against yesterday and the index move. Under 40 is worried, and over 60 is confident.",
        bn: "এতে আজ কত শেয়ারের দাম বেড়েছে, গতকালের তুলনায় লেনদেন আর সূচকের ওঠানামা মেলানো হয়। 40-এর নিচে উদ্বিগ্ন, 60-এর ওপরে আত্মবিশ্বাসী।",
      },
    });
  }
  return rows;
}

/**
 * The big picture — open on the canvas: the mood word, the headline sentence
 * and the takeaway, in the reader's language. Under it ONE card: the four
 * answers (prices this year · up or down today · cheap or expensive · busy or
 * quiet) in a hairline grid, and a fold-out "How we decide" with every raw
 * number and the cut-off that turns it into a word.
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
  const sentenceBn = mood.sentence_bn ?? MOOD_LINE_BN[mood.tone] ?? mood.sentence;
  return (
    <section className="mk-hero" aria-labelledby="mk-headline">
      <p className={`mk-mood mk-mood--${mood.tone}`}>
        <span className="mk-mood-dot" aria-hidden="true" />
        <T
          en={`Market mood: ${mood.label.toLowerCase()}`}
          bn={`বাজারের অবস্থা: ${mood.label_bn ?? MOOD_WORD_BN[mood.tone] ?? mood.label}`}
        />
      </p>
      <h2 className="mk-headline" id="mk-headline">
        <T en={mood.sentence} bn={sentenceBn} />
      </h2>
      {mood.sentence2 && (
        <p className="mk-lead" data-l={mood.sentence2_bn ? undefined : "en"}>
          {mood.sentence2_bn ? <T en={mood.sentence2} bn={mood.sentence2_bn} /> : mood.sentence2}
        </p>
      )}

      {questions.length > 0 && (
        <div className="soft-card mk-answers">
          <div className="mk-answer-grid">
            {questions.map((q) => {
              const extra = tileExtra(q, stats);
              return (
                <div className={`mk-answer mk-answer--${q.tone}`} key={q.key ?? q.q}>
                  <p className="mk-answer-q">
                    <T en={q.q} bn={q.q_bn ?? q.q} />
                  </p>
                  <p className="mk-answer-a">
                    <T en={q.a} bn={q.a_bn ?? q.a} />
                  </p>
                  {extra ? (
                    <p className="mk-answer-x">
                      <T en={extra.en} bn={extra.bn} />
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          {why.length > 0 && (
            <details className="mk-why">
              <summary>
                <T en="How we decide" bn="আমরা কীভাবে ঠিক করি" />
                <IconChevronDown size={16} />
              </summary>
              <div className="mk-why-body">
                <p className="mk-card-note">
                  <T
                    en="Six plain checks, refreshed after every trading day. Here are today's numbers and the cut-offs that turn them into words."
                    bn="ছয়টি সহজ যাচাই, প্রতিটি লেনদেনের দিনের পর হালনাগাদ হয়। এখানে আজকের সংখ্যা আর যে সীমা দিয়ে সেগুলো কথায় বলা হয়, তা দেওয়া আছে।"
                  />
                </p>
                <ul className="mk-why-list">
                  {why.map((r) => (
                    <li className="mk-why-row" key={r.k.en}>
                      <span className="mk-why-k">
                        <T en={r.k.en} bn={r.k.bn} />
                      </span>
                      <span className="mk-why-v">
                        <T en={r.v.en} bn={r.v.bn} />
                      </span>
                      <span className="mk-why-rule">
                        <T en={r.rule.en} bn={r.rule.bn} />
                      </span>
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
