/**
 * Premium portfolio read — five short sections on top of `analyzePortfolio`:
 * risk check, the price you paid, cash income, you vs the market, and an
 * action list. Built only from what the analysis and the `/api/scores` map
 * already hold; no request of its own. Bilingual like the analysis (Western
 * digits inside Bengali prose).
 *
 * Rendered by `components/portfolio/ProInsights.tsx`, behind PremiumGate for
 * free accounts.
 */

import type { AnalysisLang, HoldingInsight, PortfolioAnalysis } from "@/lib/portfolio-analysis";
import type { ScoreItem } from "@/lib/api";
import { money } from "@/lib/formatters";

export type ProLevel = "good" | "watch" | "bad";

export interface ProLine {
  level: ProLevel;
  text: string;
}

export type ProActionKind = "sell" | "trim" | "buy_more" | "hold";

export interface ProAction {
  code: string;
  companyName: string | null;
  kind: ProActionKind;
  label: string;
  reason: string;
}

export interface ProInsights {
  risk: ProLine[];
  paid: ProLine[];
  income: { yearlyCash: number | null; lines: ProLine[] };
  vsMarket: ProLine[];
  actions: ProAction[];
}

/** A single holding above this share of the money gets a "trim" suggestion. */
const TRIM_WEIGHT_PCT = 25;

const pct = (v: number) => `${Math.round(v)}%`;
const fix1 = (v: number) => v.toFixed(1);

function median(values: number[]): number | null {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

function sumWeight(hs: HoldingInsight[], pred: (h: HoldingInsight) => boolean): number {
  return hs.filter(pred).reduce((a, h) => a + h.weightPct, 0);
}

function nameOf(h: HoldingInsight): string {
  return h.code;
}

export function buildProInsights(
  analysis: PortfolioAnalysis,
  priceMap: Map<string, ScoreItem>,
  lang: AnalysisLang = "en",
): ProInsights {
  const bn = lang === "bn";
  const L = (en: string, bnText: string) => (bn ? bnText : en);
  const hs = analysis.holdings;

  // ---- 1. Risk check -------------------------------------------------------
  const risk: ProLine[] = [];
  const top = [...hs].sort((a, b) => b.weightPct - a.weightPct)[0];
  if (top) {
    const w = top.weightPct;
    risk.push({
      level: w > 40 ? "bad" : w > TRIM_WEIGHT_PCT ? "watch" : "good",
      text: w > TRIM_WEIGHT_PCT
        ? L(
            `${nameOf(top)} is ${pct(w)} of your money. Above ${TRIM_WEIGHT_PCT}%, one bad result from one company hurts the whole portfolio.`,
            `${nameOf(top)} আপনার টাকার ${pct(w)}। ${TRIM_WEIGHT_PCT}%-এর বেশি হলে একটি কোম্পানির খারাপ ফল পুরো পোর্টফোলিওতে লাগে।`,
          )
        : L(
            `Your biggest stock, ${nameOf(top)}, is ${pct(w)} of your money — no single company can sink you.`,
            `আপনার সবচেয়ে বড় শেয়ার ${nameOf(top)}, টাকার ${pct(w)} — একটি কোম্পানি একা বড় ক্ষতি করতে পারবে না।`,
          ),
    });
  }
  if (hs.length > 1) {
    const eff = analysis.effectiveStocks;
    risk.push({
      level: eff < 3 ? "bad" : eff < 5 ? "watch" : "good",
      text: L(
        `Your ${hs.length} stocks behave like about ${fix1(eff)} separate ones, because the money isn't spread evenly.${eff < 5 ? " Five or more is a safer spread." : ""}`,
        `আপনার ${hs.length}টি শেয়ার টাকা সমানভাবে ছড়ানো না থাকায় প্রায় ${fix1(eff)}টির মতো আচরণ করে।${eff < 5 ? " 5টি বা বেশি হলে ঝুঁকি কম।" : ""}`,
      ),
    });
  }
  const zW = sumWeight(hs, (h) => h.marketCategory === "Z");
  const bW = sumWeight(hs, (h) => h.marketCategory === "B");
  if (zW > 0) {
    risk.push({
      level: "bad",
      text: L(
        `${pct(zW)} of your money is in Z-category stocks — companies that skipped dividends or AGMs. They are the riskiest on the DSE.`,
        `আপনার টাকার ${pct(zW)} Z ক্যাটাগরির শেয়ারে — যারা ডিভিডেন্ড বা AGM বাদ দিয়েছে। DSE-তে এগুলো সবচেয়ে ঝুঁকিপূর্ণ।`,
      ),
    });
  } else if (bW > 30) {
    risk.push({
      level: "watch",
      text: L(
        `${pct(bW)} of your money is in B-category stocks, which paid less than 10% dividend.`,
        `আপনার টাকার ${pct(bW)} B ক্যাটাগরির শেয়ারে, যারা 10%-এর কম ডিভিডেন্ড দিয়েছে।`,
      ),
    });
  }
  const weakW = sumWeight(hs, (h) => h.tierKey === "weak");
  if (weakW > 0) {
    risk.push({
      level: weakW > 20 ? "bad" : "watch",
      text: L(
        `${pct(weakW)} of your money is in companies we grade Weak on their business numbers.`,
        `আপনার টাকার ${pct(weakW)} এমন কোম্পানিতে যাদের ব্যবসার হিসাব দুর্বল।`,
      ),
    });
  }
  const staleW = sumWeight(hs, (h) => h.staleData);
  if (staleW > 0) {
    risk.push({
      level: "watch",
      text: L(
        `${pct(staleW)} of your money is in companies whose latest accounts are 2+ years old — their grade rests on old numbers.`,
        `আপনার টাকার ${pct(staleW)} এমন কোম্পানিতে যাদের সর্বশেষ হিসাব 2 বছরের বেশি পুরনো।`,
      ),
    });
  }
  const highW = sumWeight(hs, (h) => h.flags.nearHigh);
  if (highW > 30) {
    risk.push({
      level: "watch",
      text: L(
        `${pct(highW)} of your money sits near its 52-week high. Good for you so far — but a pullback would hit a big part at once.`,
        `আপনার টাকার ${pct(highW)} 52 সপ্তাহের সর্বোচ্চ দামের কাছে। এখন পর্যন্ত ভালো — তবে দাম কমলে বড় অংশ একসাথে কমবে।`,
      ),
    });
  }

  // ---- 2. The price you paid ----------------------------------------------
  const paid: ProLine[] = [];
  const judged = hs.filter((h) => h.entryPe != null && h.sectorPe != null && h.entryValuation !== "unknown");
  const over = judged.filter((h) => h.entryValuation === "expensive").sort((a, b) => b.weightPct - a.weightPct);
  const under = judged.filter((h) => h.entryValuation === "cheap").sort((a, b) => b.weightPct - a.weightPct);
  for (const h of over.slice(0, 3)) {
    paid.push({
      level: "watch",
      text: L(
        `You paid more than usual for ${nameOf(h)}: ${fix1(h.entryPe as number)} times its yearly profit, where its sector usually trades at ${fix1(h.sectorPe as number)}.`,
        `${nameOf(h)}-এর জন্য বেশি দাম দিয়েছেন: বছরের লাভের ${fix1(h.entryPe as number)} গুণ, যেখানে খাতে সাধারণত ${fix1(h.sectorPe as number)} গুণ।`,
      ),
    });
  }
  for (const h of under.slice(0, 2)) {
    paid.push({
      level: "good",
      text: L(
        `Good buy on ${nameOf(h)}: ${fix1(h.entryPe as number)} times profit against ${fix1(h.sectorPe as number)} for its sector.`,
        `${nameOf(h)} ভালো দামে কিনেছেন: লাভের ${fix1(h.entryPe as number)} গুণ, খাতে ${fix1(h.sectorPe as number)} গুণ।`,
      ),
    });
  }
  if (!paid.length && judged.length) {
    paid.push({
      level: "good",
      text: L(
        "Nothing stands out — you paid around normal prices for what these companies earn.",
        "বিশেষ কিছু নেই — কোম্পানিগুলোর আয়ের তুলনায় স্বাভাবিক দামেই কিনেছেন।",
      ),
    });
  }

  // ---- 3. Cash income ------------------------------------------------------
  const income: ProInsights["income"] = { yearlyCash: null, lines: [] };
  let cash = 0;
  let cost = 0;
  let payersW = 0;
  let best: { h: HoldingInsight; yoc: number } | null = null;
  for (const h of hs) {
    const y = priceMap.get(h.code.toUpperCase())?.div_yield_pct ?? null;
    cost += h.qty * h.buyPrice;
    if (y == null || y <= 0 || h.ltp == null) continue;
    cash += (h.qty * h.ltp * y) / 100;
    payersW += h.weightPct;
    const yoc = h.buyPrice > 0 ? (y * h.ltp) / h.buyPrice : 0;
    if (!best || yoc > best.yoc) best = { h, yoc };
  }
  if (cash > 0) {
    income.yearlyCash = cash;
    const yocAll = cost > 0 ? (cash / cost) * 100 : null;
    income.lines.push({
      level: "good",
      text: L(
        `At last year's dividends you'd get about ${money(cash)} a year in cash${yocAll != null ? ` — ${yocAll.toFixed(1)}% on what you paid` : ""}, before tax.`,
        `গত বছরের ডিভিডেন্ড ধরে বছরে প্রায় ${money(cash)} নগদ পাবেন${yocAll != null ? ` — কেনা দামের ${yocAll.toFixed(1)}%` : ""}, কর বাদ দেওয়ার আগে।`,
      ),
    });
    if (best && best.yoc > 0) {
      income.lines.push({
        level: "good",
        text: L(
          `${nameOf(best.h)} pays you the most for what you paid: ${best.yoc.toFixed(1)}% a year.`,
          `কেনা দামের তুলনায় ${nameOf(best.h)} সবচেয়ে বেশি দেয়: বছরে ${best.yoc.toFixed(1)}%।`,
        ),
      });
    }
  }
  const nonPayW = 100 - payersW;
  if (hs.length && nonPayW >= 30) {
    income.lines.push({
      level: "watch",
      text: L(
        `${pct(nonPayW)} of your money is in stocks that paid no cash dividend last year.`,
        `আপনার টাকার ${pct(nonPayW)} এমন শেয়ারে যারা গত বছর নগদ ডিভিডেন্ড দেয়নি।`,
      ),
    });
  }

  // ---- 4. You vs the market -----------------------------------------------
  const vsMarket: ProLine[] = [];
  const all = Array.from(priceMap.values());
  const mktScore = median(all.map((s) => s.score).filter((v): v is number => typeof v === "number"));
  const scored = hs.filter((h) => h.score != null);
  const scoredW = scored.reduce((a, h) => a + h.weightPct, 0);
  if (mktScore != null && scoredW > 0) {
    const mine = scored.reduce((a, h) => a + (h.score as number) * h.weightPct, 0) / scoredW;
    const better = mine >= mktScore;
    vsMarket.push({
      level: better ? "good" : mine >= mktScore - 5 ? "watch" : "bad",
      text: L(
        `Your money sits in companies scoring ${Math.round(mine)} on average; the typical DSE company scores ${Math.round(mktScore)}.`,
        `আপনার টাকা যেসব কোম্পানিতে তাদের গড় স্কোর ${Math.round(mine)}; DSE-র সাধারণ কোম্পানির স্কোর ${Math.round(mktScore)}।`,
      ),
    });
  }
  const mktPe = median(
    all
      .map((s) => (s.ltp != null && s.eps != null && s.eps > 0 ? s.ltp / s.eps : NaN))
      .filter((v) => v > 0 && v < 200),
  );
  let value = 0;
  let earnings = 0;
  for (const h of hs) {
    const eps = priceMap.get(h.code.toUpperCase())?.eps ?? null;
    if (h.ltp == null || eps == null || eps <= 0) continue;
    value += h.qty * h.ltp;
    earnings += h.qty * eps;
  }
  if (mktPe != null && earnings > 0) {
    const myPe = value / earnings;
    vsMarket.push({
      level: myPe <= mktPe ? "good" : myPe <= mktPe * 1.3 ? "watch" : "bad",
      text: L(
        `Today your stocks cost ${fix1(myPe)} times what they earn in a year; the typical DSE share costs ${fix1(mktPe)} times.`,
        `আজ আপনার শেয়ারগুলোর দাম বছরের আয়ের ${fix1(myPe)} গুণ; DSE-র সাধারণ শেয়ার ${fix1(mktPe)} গুণ।`,
      ),
    });
  }

  // ---- 5. Your action list -------------------------------------------------
  const LABEL: Record<ProActionKind, string> = {
    sell: L("Think about selling", "বিক্রির কথা ভাবুন"),
    trim: L("Trim it", "কিছুটা কমান"),
    buy_more: L("Good to add", "আরও কেনা যায়"),
    hold: L("Hold steady", "ধরে রাখুন"),
  };
  const ORDER: Record<ProActionKind, number> = { sell: 0, trim: 1, buy_more: 2, hold: 3 };
  const actions: ProAction[] = hs
    .map((h): ProAction => {
      const kind: ProActionKind =
        h.signal.signal === "sell"
          ? "sell"
          : h.weightPct > TRIM_WEIGHT_PCT && hs.length > 1
            ? "trim"
            : h.signal.signal === "buy_more"
              ? "buy_more"
              : "hold";
      const reason =
        kind === "trim"
          ? L(
              `It is ${pct(h.weightPct)} of your money. Moving some into another sector lowers the risk.`,
              `এটি আপনার টাকার ${pct(h.weightPct)}। কিছু অংশ অন্য খাতে সরালে ঝুঁকি কমে।`,
            )
          : (kind === "hold" ? h.oneLiner : h.signal.reason) || h.oneLiner;
      return { code: h.code, companyName: h.companyName, kind, label: LABEL[kind], reason };
    })
    .sort((a, b) => ORDER[a.kind] - ORDER[b.kind]);

  return { risk, paid, income, vsMarket, actions };
}
