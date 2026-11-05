import { T } from "@/components/i18n/T";
import type { MarketMood, MarketStats } from "@/lib/api";

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
const FEELING: Record<string, { en: string; bn: string }> = {
  Worried: { en: "Investors feel worried", bn: "বিনিয়োগকারীরা উদ্বিগ্ন" },
  Calm: { en: "Investors feel calm", bn: "বিনিয়োগকারীরা শান্ত" },
  Confident: { en: "Investors feel confident", bn: "বিনিয়োগকারীরা আত্মবিশ্বাসী" },
};

function lvl(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/**
 * The headline carries the index level and the move — what people search for
 * ("share market today", "আজকের শেয়ার বাজার"). Also the page description.
 */
export function dsexHeadline(level: number | null | undefined, change: number | null | undefined) {
  if (level == null) return null;
  const at = lvl(level);
  if (change == null) {
    return { en: `DSEX is at ${at}`, bn: `ডিএসইএক্স এখন ${at}-এ`, pts: null, up: null };
  }
  const pts = Math.round(Math.abs(change));
  if (pts === 0) {
    return { en: `DSEX ended the day flat, at ${at}`, bn: `ডিএসইএক্স প্রায় অপরিবর্তিত, ${at}-এ`, pts: 0, up: null };
  }
  const up = change > 0;
  const unit = pts === 1 ? "point" : "points";
  return {
    en: `DSEX ${up ? "rose" : "fell"} ${pts} ${unit} to ${at}`,
    bn: `ডিএসইএক্স ${pts} পয়েন্ট ${up ? "বেড়ে" : "কমে"} ${at}-এ দাঁড়িয়েছে`,
    pts,
    up,
  };
}

/**
 * Block 1 of the market page — the day in one look, open on the canvas: the
 * mood word and how investors feel, a headline with the DSEX level and move,
 * the day's summary paragraph (from the backend, both languages) and what it
 * means. Built from the merge of /market-analysis's hero and /share-bazar's
 * headline (2026-11-05).
 */
export default function DayHeadline({
  mood,
  stats,
  dsex,
  dsexChange,
  summaryEn,
  summaryBn,
}: {
  mood: MarketMood;
  stats: MarketStats;
  dsex: number | null | undefined;
  dsexChange: number | null | undefined;
  summaryEn?: string | null;
  summaryBn?: string | null;
}) {
  const head = dsexHeadline(dsex ?? stats.dsex, dsexChange);
  const feel = stats.feeling_word ? FEELING[stats.feeling_word] : null;
  const sentenceBn = mood.sentence_bn ?? MOOD_LINE_BN[mood.tone] ?? mood.sentence;
  // The summary paragraph covers the mood sentence; without it, the sentence stands in.
  const para = summaryBn || summaryEn
    ? { en: summaryEn || mood.sentence, bn: summaryBn || sentenceBn }
    : { en: mood.sentence, bn: sentenceBn };
  const ptsCls = head?.up == null ? "" : head.up ? "text-positive" : "text-negative";

  return (
    <section className="mk-day" aria-labelledby="mk-headline">
      <div className="mk-moodrow">
        <p className={`mk-mood mk-mood--${mood.tone}`}>
          <span className="mk-mood-dot" aria-hidden="true" />
          <T
            en={`Market mood: ${mood.label.toLowerCase()}`}
            bn={`বাজারের অবস্থা: ${mood.label_bn ?? MOOD_WORD_BN[mood.tone] ?? mood.label}`}
          />
        </p>
        {feel && (
          <span className="mk-feel">
            <T en={feel.en} bn={feel.bn} />
          </span>
        )}
      </div>

      <h2 className="mk-headline" id="mk-headline">
        {head ? (
          head.pts ? (
            <T
              en={
                <>
                  DSEX {head.up ? "rose" : "fell"} <span className={ptsCls}>{head.pts} {head.pts === 1 ? "point" : "points"}</span> to{" "}
                  {lvl((dsex ?? stats.dsex) as number)}
                </>
              }
              bn={
                <>
                  ডিএসইএক্স <span className={ptsCls}>{head.pts} পয়েন্ট</span> {head.up ? "বেড়ে" : "কমে"}{" "}
                  {lvl((dsex ?? stats.dsex) as number)}-এ দাঁড়িয়েছে
                </>
              }
            />
          ) : (
            <T en={head.en} bn={head.bn} />
          )
        ) : (
          <T en={mood.sentence} bn={sentenceBn} />
        )}
      </h2>

      <p className="mk-summary">
        <T en={para.en} bn={para.bn} />
      </p>

      {mood.sentence2 && (
        <div className="mk-means">
          <p className="mk-means-k">
            <T en="What it means" bn="এর মানে কী" />
          </p>
          <p className="mk-means-v">
            <T en={mood.sentence2} bn={mood.sentence2_bn ?? mood.sentence2} />
          </p>
        </div>
      )}
    </section>
  );
}
