"use client";

import Link from "next/link";
import { pct, signed, taka } from "@/lib/formatters";
import { TIER_LABELS, TIER_VAR } from "@/lib/constants";
import ScoreBadge from "@/components/ui/ScoreBadge";
import type { RankedItem } from "@/components/ranking/FullRankTable";

type PointKind = "good" | "bad" | "warn" | "neutral";

interface Point {
  en: string;
  bn: string;
  kind: PointKind;
}

const TIER_POINTS: Record<RankedItem["tier"], Point> = {
  excellent: {
    en: "Excellent fundamentals — one of the healthiest companies on the DSE right now.",
    bn: "ব্যবসার ভিত খুবই মজবুত — এই মুহূর্তে ডিএসইর সবচেয়ে ভালো শেয়ারগুলোর একটি।",
    kind: "good",
  },
  good: {
    en: "Good overall — the business is healthy on most measures.",
    bn: "সার্বিকভাবে ভালো — বেশিরভাগ দিক থেকেই কোম্পানিটি ভালো অবস্থায় আছে।",
    kind: "good",
  },
  average: {
    en: "Average — some strengths, some weak spots. Look closer before you decide.",
    bn: "মিশ্র অবস্থা — ভালো দিকও আছে, দুর্বলতাও আছে। সিদ্ধান্তের আগে আরেকটু দেখে নিন।",
    kind: "neutral",
  },
  weak: {
    en: "Weak fundamentals — the numbers show real risk here.",
    bn: "ব্যবসার অবস্থা দুর্বল — এই শেয়ারে ঝুঁকি অনেক বেশি।",
    kind: "bad",
  },
};

/** Plain-language takeaways (English + Bengali) built from the row's own numbers. */
function buildPoints(item: RankedItem): Point[] {
  const points: Point[] = [TIER_POINTS[item.tier]];

  const growth = item.eps_yoy_pct;
  if (growth != null) {
    const v = Math.abs(growth).toFixed(0);
    if (growth >= 25) {
      points.push({
        en: `Profit per share jumped ${v}% last year — strong growth.`,
        bn: `গত বছর শেয়ারপ্রতি মুনাফা ${v}% বেড়েছে — দারুণ প্রবৃদ্ধি।`,
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
      en: `Pays a generous cash dividend — about ${dy.toFixed(1)}% a year at today's price.`,
      bn: `ভালো নগদ লভ্যাংশ দেয় — আজকের দামে বছরে প্রায় ${dy.toFixed(1)}%।`,
      kind: "good",
    });
  } else if (dy != null && dy >= 2) {
    points.push({
      en: `Pays a steady dividend — about ${dy.toFixed(1)}% a year.`,
      bn: `নিয়মিত লভ্যাংশ দেয় — বছরে প্রায় ${dy.toFixed(1)}%।`,
      kind: "neutral",
    });
  } else if (dy != null && dy > 0) {
    points.push({
      en: `Pays only a small dividend (${dy.toFixed(1)}% a year).`,
      bn: `লভ্যাংশ দেয় খুব কম (বছরে ${dy.toFixed(1)}%)।`,
      kind: "neutral",
    });
  } else {
    points.push({
      en: "Pays little or no dividend.",
      bn: "লভ্যাংশ প্রায় দেয় না বললেই চলে।",
      kind: "neutral",
    });
  }

  if (item.market_category === "Z") {
    points.push({
      en: "Z category on the DSE — irregular dividends and extra trading restrictions. Be careful.",
      bn: "ডিএসইতে জেড ক্যাটাগরির শেয়ার — লভ্যাংশ অনিয়মিত, লেনদেনেও বাড়তি বিধিনিষেধ। সাবধান থাকুন।",
      kind: "bad",
    });
  } else if (item.market_category === "B") {
    points.push({
      en: "B category — the dividend track record is below par.",
      bn: "বি ক্যাটাগরির শেয়ার — লভ্যাংশের রেকর্ড খুব একটা ভালো না।",
      kind: "warn",
    });
  }

  if (item.stale_data && item.last_reported_year) {
    points.push({
      en: `Latest financial report is old (${item.last_reported_year}) — treat the score with extra caution.`,
      bn: `সর্বশেষ আর্থিক রিপোর্ট পুরনো (${item.last_reported_year} সালের) — স্কোরটি সাবধানে বিবেচনা করুন।`,
      kind: "warn",
    });
  }

  return points;
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
}) {
  return (
    <div className="fr-detail-stat">
      <span className="fr-detail-stat-label">{label}</span>
      <span className={`fr-detail-stat-value${tone ? ` is-${tone}` : ""}`}>{value}</span>
    </div>
  );
}

export default function RankRowDetails({ item }: { item: RankedItem }) {
  const points = buildPoints(item);
  const chg = item.change_pct;

  return (
    <div className="fr-detail">
      <div className="fr-detail-head">
        <ScoreBadge score={item.score} tier={item.tier} size="md" />
        <div className="fr-detail-head-text">
          <span className="fr-detail-tier" style={{ color: TIER_VAR[item.tier] }}>
            {TIER_LABELS[item.tier]}
          </span>
          <span className="fr-detail-score-sub">
            Fundamental score {item.score != null ? Math.round(item.score) : "—"} / 100
          </span>
        </div>
      </div>

      <div className="fr-detail-stats">
        <Stat
          label="Today"
          value={chg != null ? `${signed(chg, 2)}%` : "—"}
          tone={chg != null && chg !== 0 ? (chg > 0 ? "up" : "down") : undefined}
        />
        <Stat label="EPS" value={item.eps != null ? taka(item.eps) : "—"} />
        <Stat
          label="Profit growth"
          value={item.eps_yoy_pct != null ? `${signed(item.eps_yoy_pct, 1)}%` : "—"}
          tone={
            item.eps_yoy_pct != null && item.eps_yoy_pct !== 0
              ? item.eps_yoy_pct > 0
                ? "up"
                : "down"
              : undefined
          }
        />
        <Stat
          label="Dividend yield"
          value={item.div_yield_pct != null && item.div_yield_pct > 0 ? pct(item.div_yield_pct) : "—"}
        />
      </div>

      <ul className="fr-detail-points">
        {points.map((p) => (
          <li key={p.en} className={`fr-point fr-point-${p.kind}`}>
            <span className="fr-point-dot" aria-hidden />
            <span className="fr-point-text">
              <span className="fr-point-en">{p.en}</span>
              <span className="fr-point-bn font-bn" lang="bn">
                {p.bn}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <Link prefetch={false} href={`/stock/${item.trading_code}`} className="fr-detail-link">
        See full analysis of {item.trading_code} →
      </Link>
    </div>
  );
}
