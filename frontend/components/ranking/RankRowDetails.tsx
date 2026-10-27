"use client";

import Link from "next/link";
import { useLang } from "@/context/LangContext";
import { PILLARS } from "@/lib/landing";
import { pillarColor } from "@/lib/insight-utils";
import Button from "@/components/ui/Button";
import StarButton from "@/components/ui/StarButton";
import type { RankedItem } from "@/components/ranking/FullRankTable";

/** The five checks in P1..P5 order, matching `PILLARS`. */
export function pillarValues(item: RankedItem): (number | null)[] {
  return [
    item.p1_biz ?? null,
    item.p2_health ?? null,
    item.p3_moat ?? null,
    item.p4_val ?? null,
    item.p5_div ?? null,
  ];
}

type PointKind = "good" | "bad" | "warn" | "neutral";

interface Point {
  en: string;
  bn: string;
  kind: PointKind;
}

/** The five checks inside a sentence, P1..P5 (the bar labels are `PILLARS`). */
const CHECK_IN_SENTENCE_EN = ["profit", "finances", "business strength", "price", "dividends"];
const CHECK_IN_SENTENCE_BN = ["মুনাফা", "আর্থিক অবস্থা", "ব্যবসার শক্তি", "দাম", "ডিভিডেন্ড"];

/**
 * One headline sentence: which check carries the score and which holds it back.
 * The score is the whole point of the page, so the row that opens under it has
 * to say what the number is made of.
 */
function buildHeadline(values: (number | null)[]): { en: string; bn: string } | null {
  const present = values
    .map((v, i) => ({ v, i }))
    .filter((x): x is { v: number; i: number } => x.v != null);
  if (present.length < 2) return null;
  const best = present.reduce((a, b) => (b.v > a.v ? b : a));
  const worst = present.reduce((a, b) => (b.v < a.v ? b : a));
  const be = CHECK_IN_SENTENCE_EN[best.i];
  const we = CHECK_IN_SENTENCE_EN[worst.i];
  const bb = CHECK_IN_SENTENCE_BN[best.i];
  const wb = CHECK_IN_SENTENCE_BN[worst.i];
  if (worst.v >= 7) {
    return {
      en: `Strong on every check. It does best on ${be} and least well on ${we}.`,
      bn: `সব যাচাইয়েই শক্ত। সবচেয়ে ভালো ${bb}-এ, তুলনায় কম ${wb}-এ।`,
    };
  }
  if (best.v < 4) {
    return {
      en: `Weak on every check. Even its best, ${be}, is low.`,
      bn: `সব যাচাইয়েই দুর্বল। সবচেয়ে ভালো দিক ${bb}, সেটিও কম।`,
    };
  }
  return {
    en: `It does best on ${be} and is weakest on ${we}.`,
    bn: `সবচেয়ে ভালো ${bb}-এ, সবচেয়ে দুর্বল ${wb}-এ।`,
  };
}

/** Plain takeaways (English + Bengali) built from the row's own numbers. The panel opens on a
 * tap, after the page has loaded, so it renders the reader's language directly. */
function buildPoints(item: RankedItem): Point[] {
  const points: Point[] = [];

  const growth = item.eps_yoy_pct;
  if (growth != null) {
    const v = Math.abs(growth).toFixed(0);
    if (growth >= 25) {
      points.push({
        en: `Profit per share rose ${v}% last year, which is strong growth.`,
        bn: `গত বছর শেয়ারপ্রতি মুনাফা ${v}% বেড়েছে, যা ভালো প্রবৃদ্ধি।`,
        kind: "good",
      });
    } else if (growth >= 5) {
      points.push({
        en: `Profit per share grew ${v}% last year.`,
        bn: `গত বছর শেয়ারপ্রতি মুনাফা ${v}% বেড়েছে।`,
        kind: "good",
      });
    } else if (growth > -5) {
      points.push({
        en: "Profit per share stayed about the same as last year.",
        bn: "শেয়ারপ্রতি মুনাফা গত বছরের প্রায় সমান।",
        kind: "neutral",
      });
    } else {
      points.push({
        en: `Profit per share fell ${v}% last year.`,
        bn: `গত বছর শেয়ারপ্রতি মুনাফা ${v}% কমেছে।`,
        kind: "bad",
      });
    }
  }

  const dy = item.div_yield_pct;
  if (dy != null && dy >= 6) {
    points.push({
      en: `It pays a good cash dividend: about ${dy.toFixed(1)}% a year at today's price.`,
      bn: `ভালো নগদ ডিভিডেন্ড দেয়: আজকের দামে বছরে প্রায় ${dy.toFixed(1)}%।`,
      kind: "good",
    });
  } else if (dy != null && dy >= 2) {
    points.push({
      en: `It pays a steady dividend of about ${dy.toFixed(1)}% a year.`,
      bn: `বছরে প্রায় ${dy.toFixed(1)}% হারে নিয়মিত ডিভিডেন্ড দেয়।`,
      kind: "neutral",
    });
  } else if (dy != null && dy > 0) {
    points.push({
      en: `It pays only a small dividend, ${dy.toFixed(1)}% a year.`,
      bn: `ডিভিডেন্ড খুব কম দেয়, বছরে ${dy.toFixed(1)}%।`,
      kind: "neutral",
    });
  } else {
    points.push({
      en: "It pays little or no dividend.",
      bn: "ডিভিডেন্ড প্রায় দেয় না।",
      kind: "neutral",
    });
  }

  // Same bands as the "Price today" word in the row.
  const val = item.p4_val;
  if (val != null && val >= 7) {
    points.push({
      en: "The share price looks good for a business this strong.",
      bn: "এমন ব্যবসার তুলনায় শেয়ারের দাম ভালো।",
      kind: "good",
    });
  } else if (val != null && val >= 4) {
    points.push({
      en: "The share price is about fair.",
      bn: "শেয়ারের দাম মোটামুটি ন্যায্য।",
      kind: "neutral",
    });
  } else if (val != null) {
    points.push({
      en: "The share looks expensive right now.",
      bn: "শেয়ারটির দাম এখন বেশি মনে হচ্ছে।",
      kind: "warn",
    });
  }

  if (item.market_category === "Z") {
    points.push({
      en: "It is in DSE's Z category: dividends are irregular and trading has extra limits. Please be careful.",
      bn: "এটি ডিএসইর Z ক্যাটাগরিতে আছে: ডিভিডেন্ড অনিয়মিত, আর লেনদেনেও বাড়তি সীমা আছে। সাবধান থাকুন।",
      kind: "bad",
    });
  } else if (item.market_category === "B") {
    points.push({
      en: "It is in B category, which means its recent dividends were low.",
      bn: "এটি B ক্যাটাগরিতে আছে, অর্থাৎ সাম্প্রতিক ডিভিডেন্ড কম ছিল।",
      kind: "warn",
    });
  }

  if (item.stale_data && item.last_reported_year) {
    points.push({
      en: `Its latest annual report is from ${item.last_reported_year}, so please read the score with extra care.`,
      bn: `সর্বশেষ বার্ষিক রিপোর্ট ${item.last_reported_year} সালের, তাই স্কোরটি বাড়তি সাবধানে দেখুন।`,
      kind: "warn",
    });
  }

  return points;
}

export default function RankRowDetails({ item }: { item: RankedItem }) {
  const { bn } = useLang();
  const values = pillarValues(item);
  const hasChecks = values.some((v) => v != null);
  const headline = buildHeadline(values);
  const points = buildPoints(item);
  const name = item.company_name ?? item.trading_code;

  return (
    <div className="rk-detail" lang={bn ? "bn" : "en"}>
      <div className="rk-detail-main">
        {headline && <p className="rk-detail-headline">{bn ? headline.bn : headline.en}</p>}
        <ul className="rk-points">
          {points.map((p) => (
            <li key={p.en} className={`rk-point rk-point-${p.kind}`}>
              <span className="rk-point-dot" aria-hidden />
              <span>{bn ? p.bn : p.en}</span>
            </li>
          ))}
        </ul>
        <div className="rk-detail-actions">
          <Button href={`/stock/${item.trading_code}`}>
            {bn ? `${item.trading_code}-এর পুরো রিপোর্ট দেখুন` : `See the full report on ${item.trading_code}`}
          </Button>
          {/* The row's star column is hidden on phones — it lives here instead */}
          <span className="rk-detail-star">
            <StarButton code={item.trading_code} />
          </span>
        </div>
      </div>

      {hasChecks && (
        <div
          className="rk-checks"
          aria-label={bn ? `${name}-এর স্কোরের পেছনের পাঁচটি যাচাই` : `The five checks behind ${name}'s score`}
        >
          <div className="rk-checks-head">
            <span className="rk-checks-title">
              {bn ? "স্কোরের পেছনের পাঁচটি যাচাই" : "The five checks behind this score"}
            </span>
            <span className="rk-checks-scale">{bn ? "প্রতিটি 10-এর মধ্যে" : "each out of 10"}</span>
          </div>
          {PILLARS.map((p, i) => {
            const v = values[i];
            const color = pillarColor(v);
            return (
              <div key={p.key} className="rk-check">
                <span className="rk-check-top">
                  <span>{bn ? p.bn : p.en}</span>
                  <b className="nums" style={{ color }}>{v == null ? "—" : v.toFixed(1)}</b>
                </span>
                <span className="rk-check-track">
                  {v != null && (
                    <span
                      className="rk-check-fill"
                      style={{ width: `${Math.max(4, Math.min(100, v * 10))}%`, background: color }}
                    />
                  )}
                </span>
              </div>
            );
          })}
          <Link prefetch={false} href="/about" className="rk-checks-link">
            {bn ? "আমরা কীভাবে স্কোর দিই →" : "How we score →"}
          </Link>
        </div>
      )}
    </div>
  );
}
