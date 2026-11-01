/**
 * The company ranking in plain words (2026-10-31, the ranking redesign
 * https://claude.ai/artifact/VMiz9Wst4vwpznfshy2vnU). Pure helpers, both
 * languages, read from the score row the page already has — no extra request.
 *
 * Free: the group names, each company's strong / weak checks in words, its
 * serious warnings. Premium (shown under `Locked`): why it ranks where it does,
 * where it stood on the first day of the
 * history, and how close it is to another group.
 */
import {
  TIER_LABELS,
  TIER_LABELS_BN,
  TIER_MEANINGS,
  TIER_MEANINGS_BN,
  TIER_THRESHOLDS,
  type TierKey,
} from "@/lib/constants";
import { PILLARS } from "@/lib/landing";
import type { ScoreItem } from "@/lib/api";

export type Bi = { en: string; bn: string };

/** The four grades, named by what the company is like on our five checks.
 *  The lines match the data (2026-10-30: 16 of 19 Excellent companies strong
 *  on 4–5 checks; the typical Good one on 3, Average on 1, Weak on 0 with 3
 *  weak). Since 2026-10-31 these names are the grade's label everywhere, so
 *  they live in lib/constants.ts and this map just pairs them with the line. */
export const GROUP_NAMES: Record<TierKey, { name: Bi; line: Bi }> = Object.fromEntries(
  (Object.keys(TIER_LABELS) as TierKey[]).map((t) => [
    t,
    { name: { en: TIER_LABELS[t], bn: TIER_LABELS_BN[t] }, line: { en: TIER_MEANINGS[t], bn: TIER_MEANINGS_BN[t] } },
  ]),
) as Record<TierKey, { name: Bi; line: Bi }>;

/** Lower-case check names for running text ("Strong: profit, dividend"). */
const CHECK: Record<string, Bi> = {
  p1_biz: { en: "profit", bn: "মুনাফা" },
  p2_health: { en: "finances", bn: "আর্থিক অবস্থা" },
  p3_moat: { en: "business", bn: "ব্যবসার শক্তি" },
  p4_val: { en: "price", bn: "দাম" },
  p5_div: { en: "dividend", bn: "ডিভিডেন্ড" },
};
/** Each check's share of the score (the scoring service's pillar weights). */
export const CHECK_WEIGHTS: { key: string; name: Bi; pct: number }[] = PILLARS.map((p, i) => ({
  key: p.key,
  name: { en: p.en, bn: p.bn },
  pct: [30, 20, 20, 15, 15][i],
}));

export const STRONG_AT = 7;
export const WEAK_BELOW = 4;

type Levels = { strong: string[]; fair: string[]; weak: string[] };

function pillar(item: ScoreItem, key: string): number | null {
  const v = (item as unknown as Record<string, unknown>)[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Each check as strong (7+ of 10), fair (4–7) or weak (under 4). */
export function checkLevels(item: ScoreItem): Levels {
  const out: Levels = { strong: [], fair: [], weak: [] };
  for (const p of PILLARS) {
    const v = pillar(item, p.key);
    if (v == null) continue;
    (v >= STRONG_AT ? out.strong : v >= WEAK_BELOW ? out.fair : out.weak).push(p.key);
  }
  return out;
}

const join = (keys: string[], lang: "en" | "bn") => keys.map((k) => CHECK[k][lang]).join(", ");

/** The free line under a company: "Strong: profit, finances · Weak: price". */
export function checksLine(item: ScoreItem): Bi | null {
  const { strong, fair, weak } = checkLevels(item);
  if (!strong.length && !fair.length && !weak.length) return null;
  if (strong.length === 5) return { en: "Strong on all five checks", bn: "পাঁচটি যাচাইয়েই শক্তিশালী" };
  if (weak.length === 5) return { en: "Weak on all five checks", bn: "পাঁচটি যাচাইয়েই দুর্বল" };
  const en: string[] = [];
  const bn: string[] = [];
  if (strong.length) {
    en.push(`Strong: ${join(strong, "en")}`);
    bn.push(`শক্তিশালী: ${join(strong, "bn")}`);
  }
  if (weak.length) {
    en.push(`Weak: ${join(weak, "en")}`);
    bn.push(`দুর্বল: ${join(weak, "bn")}`);
  }
  if (!strong.length && !weak.length) {
    en.push(`Fair on ${fair.length === 1 ? "its one check" : `all ${fair.length} checks`}`);
    bn.push(`${fair.length}টি যাচাইয়েই মোটামুটি`);
  }
  return { en: en.join(" · "), bn: bn.join(" · ") };
}

/** Red check keys from the stock report (`/api/rankings/today` warnings),
 *  worded short for the row's red tag. */
export const WARNING_WORDS: Record<string, Bi> = {
  audit: { en: "Auditor's warning", bn: "নিরীক্ষকের সতর্কতা" },
  category: { en: "Z category", bn: "Z ক্যাটাগরি" },
  loans: { en: "Loans over its value", bn: "ঋণ বাজারমূল্যের চেয়ে বেশি" },
  stale: { en: "Old accounts", bn: "পুরোনো হিসাব" },
  owners_30: { en: "Owners hold under 30%", bn: "মালিকদের হাতে 30%-এর কম" },
  factory: { en: "Factory found closed", bn: "কারখানা বন্ধ পাওয়া গেছে" },
  rally: { en: "Price ran on no news", bn: "খবর ছাড়াই দাম বেড়েছে" },
};

export function warningWord(key: string): Bi {
  return WARNING_WORDS[key] ?? { en: "Serious warning", bn: "গুরুতর সতর্কতা" };
}

// ---------------------------------------------------------------- Premium lines

/** Why it sits in its group, in one sentence. */
export function whyLine(item: ScoreItem & { tier: TierKey }): Bi {
  const { strong, fair, weak } = checkLevels(item);
  const vals = PILLARS.map((p) => ({ key: p.key, v: pillar(item, p.key) })).filter((x) => x.v != null) as {
    key: string;
    v: number;
  }[];
  const best = [...vals].sort((a, b) => b.v - a.v)[0]?.key;
  const worst = [...vals].sort((a, b) => a.v - b.v)[0]?.key;
  const cat = item.market_category?.toUpperCase();
  const cut =
    cat === "Z"
      ? { en: " Its score is cut because it is in Z category.", bn: " Z ক্যাটাগরিতে থাকায় স্কোর কমানো হয়েছে।" }
      : item.stale_data
        ? { en: " Its score is cut because its accounts are old.", bn: " হিসাব পুরোনো হওয়ায় স্কোর কমানো হয়েছে।" }
        : { en: "", bn: "" };
  let base: Bi;
  if (strong.length === 5 && best) {
    base = {
      en: `Strong on all five checks; ${CHECK[best].en} is its best.`,
      bn: `পাঁচটি যাচাইয়েই শক্তিশালী; সবচেয়ে ভালো ${CHECK[best].bn}।`,
    };
  } else if (strong.length && (weak.length || fair.length) && worst) {
    base = {
      en: `Strong on ${join(strong, "en")}; ${CHECK[worst].en} holds it back.`,
      bn: `শক্তিশালী: ${join(strong, "bn")}; পিছিয়ে রাখছে ${CHECK[worst].bn}।`,
    };
  } else if (weak.length && worst) {
    base = {
      en: `Weak on ${join(weak, "en")}${fair.length ? `, only fair on ${join(fair, "en")}` : ""}.`,
      bn: `দুর্বল: ${join(weak, "bn")}${fair.length ? `; মোটামুটি: ${join(fair, "bn")}` : ""}।`,
    };
  } else {
    base = { en: "Fair on most checks, strong on none.", bn: "বেশিরভাগ যাচাইয়ে মোটামুটি, কোনোটিতে শক্তিশালী নয়।" };
  }
  return { en: base.en + cut.en, bn: base.bn + cut.bn };
}

const ORDER: TierKey[] = ["weak", "average", "good", "excellent"];
const LINE: Record<TierKey, number> = {
  weak: 0,
  average: TIER_THRESHOLDS.AVERAGE,
  good: TIER_THRESHOLDS.GOOD,
  excellent: TIER_THRESHOLDS.EXCELLENT,
};

/** Points to the next group up and the line below it (null at either end). */
export function toNextGroup(item: ScoreItem & { tier: TierKey }): { up: { tier: TierKey; pts: number } | null; down: { tier: TierKey; pts: number } | null } {
  const s = item.score;
  if (s == null) return { up: null, down: null };
  const i = ORDER.indexOf(item.tier);
  const upT = ORDER[i + 1];
  const up = upT ? { tier: upT, pts: Math.max(0.1, LINE[upT] - s) } : null;
  const down = i > 0 ? { tier: ORDER[i - 1], pts: Math.max(0, s - LINE[item.tier]) } : null;
  return { up, down };
}

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th"}`;
}

const pts = (n: number) => (n < 1 ? "under 1 point" : `${Math.round(n)} ${Math.round(n) === 1 ? "point" : "points"}`);
const ptsBn = (n: number) => (n < 1 ? "1 পয়েন্টের কম" : `${Math.round(n)} পয়েন্ট`);

/** Where it stood on the first day of the history, and the nearer group line. */
export function standingLine(
  item: ScoreItem & { tier: TierKey },
  then: { date: string; rank: number | null } | null,
  dayEn: string,
  dayBn: string,
): Bi {
  const parts: Bi[] = [];
  if (then?.rank) parts.push({ en: `On ${dayEn} it ranked ${ordinal(then.rank)}.`, bn: `${dayBn} এটি ছিল ${then.rank} নম্বরে।` });
  const { up, down } = toNextGroup(item);
  const near = up && (!down || up.pts <= down.pts) ? { ...up, dir: "up" as const } : down ? { ...down, dir: "down" as const } : null;
  if (near) {
    const g = GROUP_NAMES[near.tier].name;
    parts.push(
      near.dir === "up"
        ? { en: `${pts(near.pts)} from ${g.en}.`, bn: `"${g.bn}" থেকে ${ptsBn(near.pts)} দূরে।` }
        : { en: `${pts(near.pts)} above ${g.en}.`, bn: `"${g.bn}"-এর চেয়ে ${ptsBn(near.pts)} ওপরে।` },
    );
  }
  return { en: parts.map((p) => p.en).join(" "), bn: parts.map((p) => p.bn).join(" ") };
}

// ---------------------------------------------------------------- close to moving

/** Within this many points of a group line counts as "close to moving". */
export const CLOSE_PTS = 2;

export type CloseMove = {
  item: ScoreItem & { tier: TierKey };
  dir: "up" | "down";
  to: TierKey;
  pts: number;
  /** The check that would move it (up) or the one to watch (down). */
  check: Bi;
};

/** Companies within `CLOSE_PTS` of a better group or of a lower one, nearest
 *  first: up-movers, then down-movers. The check named is the one with the
 *  most room to rise (by its weight in the score), or the weakest one. */
export function closeToMoving(items: (ScoreItem & { tier: TierKey })[]): { up: CloseMove[]; down: CloseMove[] } {
  const up: CloseMove[] = [];
  const down: CloseMove[] = [];
  for (const item of items) {
    const { up: u, down: d } = toNextGroup(item);
    const vals = CHECK_WEIGHTS.map((c) => ({ key: c.key, w: c.pct, v: pillar(item, c.key) })).filter(
      (x) => x.v != null,
    ) as { key: string; w: number; v: number }[];
    if (!vals.length) continue;
    if (u && u.pts <= CLOSE_PTS) {
      const k = [...vals].sort((a, b) => b.w * (10 - b.v) - a.w * (10 - a.v))[0].key;
      up.push({
        item, dir: "up", to: u.tier, pts: u.pts,
        check: { en: `A stronger ${CHECK[k].en} check would do it.`, bn: `${CHECK[k].bn}-এর যাচাই আরও ভালো হলেই হবে।` },
      });
    } else if (d && d.pts < CLOSE_PTS) {
      const k = [...vals].sort((a, b) => a.v - b.v)[0].key;
      down.push({
        item, dir: "down", to: d.tier, pts: d.pts,
        check: { en: `Its ${CHECK[k].en} check is the one to watch.`, bn: `নজর রাখার মতো যাচাই: ${CHECK[k].bn}।` },
      });
    }
  }
  up.sort((a, b) => a.pts - b.pts);
  down.sort((a, b) => a.pts - b.pts);
  return { up, down };
}

export { ORDER as GROUP_ORDER };
