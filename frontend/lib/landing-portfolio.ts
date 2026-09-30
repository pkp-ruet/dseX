import type { ScoresResponse } from "@/lib/api";
import type { Grade, GradeLabel } from "@/lib/portfolio-analysis";
import { buildSampleAnalysis } from "@/lib/sample-portfolio-analysis";
import { SAMPLE_PORTFOLIOS, type SampleSlug } from "@/lib/sample-portfolios";

/**
 * The landing page's portfolio section, as plain serializable data.
 *
 * Runs the real `analyzePortfolio` engine (via the two curated sample
 * portfolios, the same ones `/sample-portfolio/[slug]` shows) against today's
 * scores, in both languages, and keeps only what the card needs. Nothing here
 * is hand-written: when a company's grade moves, the card moves with it.
 *
 * The sample buy prices are illustrative, so no profit/loss figure is carried —
 * the card shows the check, never a return.
 */

export interface Line {
  en: string;
  bn: string;
}

export interface SampleView {
  slug: SampleSlug;
  /** Tab label. */
  tab: Line;
  grade: Grade;
  gradeLabel: GradeLabel;
  gradeLabelBn: string;
  headline: Line;
  sub: { spread: number; quality: number; entry: number };
  sectors: { name: string; weightPct: number }[];
  companies: number;
  good: Line | null;
  watch: Line | null;
  next: Line | null;
}

const GRADE_LABEL_BN: Record<GradeLabel, string> = {
  Excellent: "চমৎকার",
  Good: "ভালো",
  Okay: "মোটামুটি",
  Risky: "ঝুঁকিপূর্ণ",
  "Very Risky": "খুব ঝুঁকিপূর্ণ",
};

const TABS: Record<SampleSlug, Line> = {
  diversified: { en: "Well spread", bn: "ছড়ানো পোর্টফোলিও" },
  risky: { en: "All in one stock", bn: "সব এক শেয়ারে" },
};

/** The engine writes paragraphs; the card has room for the first sentence. */
function firstSentence(s: string): string {
  const m = s.match(/^.+?[.!?।](?=\s|$)/);
  return (m ? m[0] : s).trim();
}

function line(en: string[] , bn: string[], i = 0): Line | null {
  // The two languages are generated from the same conditions in the same
  // order, so index i is the same bullet in both.
  if (!en[i]) return null;
  return { en: firstSentence(en[i]), bn: firstSentence(bn[i] ?? en[i]) };
}

export function buildLandingPortfolios(scores: ScoresResponse): SampleView[] {
  const out: SampleView[] = [];
  for (const slug of ["diversified", "risky"] as SampleSlug[]) {
    const portfolio = SAMPLE_PORTFOLIOS[slug];
    const en = buildSampleAnalysis(portfolio, scores, "en");
    // A holding missing from today's scores would make the sample lie about
    // itself — skip the whole sample rather than show a thinner one.
    if (en.rows.some((r) => r.ltp == null)) continue;
    const bn = buildSampleAnalysis(portfolio, scores, "bn").analysis;
    const a = en.analysis;
    out.push({
      slug,
      tab: TABS[slug],
      grade: a.grade,
      gradeLabel: a.gradeLabel,
      gradeLabelBn: GRADE_LABEL_BN[a.gradeLabel],
      headline: { en: firstSentence(a.headline), bn: firstSentence(bn.headline) },
      sub: { spread: a.subScores.spread, quality: a.subScores.quality, entry: a.subScores.entry },
      sectors: a.sectorSpread.map((s) => ({ name: s.name, weightPct: s.weightPct })),
      companies: en.rows.length,
      good: line(a.good, bn.good),
      watch: line(a.bad, bn.bad),
      next: line(a.consider, bn.consider),
    });
  }
  return out;
}
