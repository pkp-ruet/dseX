import { takaGroup } from "@/lib/formatters";
import type { NextMove } from "@/lib/portfolio-next";
import { GRADE_WORDS, type AnalysisLang, type Grade, type PortfolioAnalysis } from "@/lib/portfolio-analysis";

/** A sub-score out of 10 wears the colour of the grade it would earn. */
function scoreClass(v: number): string {
  return v >= 7 ? "pf-g-B" : v >= 5 ? "pf-g-C" : v >= 3.5 ? "pf-g-D" : "pf-g-F";
}

/** The grade as a ring: the letter inside, the ring filled to the score out of 10. */
function GradeRing({ grade, overall }: { grade: Grade; overall: number }) {
  const R = 44;
  const C = 2 * Math.PI * R;
  const frac = Math.max(0, Math.min(1, overall / 10));
  return (
    <span className={`pf-ring pf-g-${grade}`} aria-hidden>
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        <circle cx="50" cy="50" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="7" />
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${frac * C} ${C}`}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <span className="pf-ring-letter">{grade}</span>
    </span>
  );
}

/**
 * The top of the analysis chapter (2026-10-26 redesign — the market-analysis
 * hero shape): open on the canvas, the grade as a ring with its word, the
 * one-sentence headline and what the grade means; then ONE card — the three
 * scores in a hairline grid, and "Your next move" as its footer (the one
 * thing to act on first, ranked by the taka at stake, `buildNextMove`).
 * It replaced the separate grade card and next-move card. Free.
 */
export default function AnalysisTop({
  analysis,
  next,
  lang,
}: {
  analysis: PortfolioAnalysis;
  next: { first: NextMove; more: NextMove[] };
  lang: AnalysisLang;
}) {
  const bn = lang === "bn";
  const L = (en: string, b: string) => (bn ? b : en);
  const { spread, quality, entry, overall } = analysis.subScores;
  const label = GRADE_WORDS[analysis.gradeLabel][bn ? "bn" : "en"];
  const first = next.first;
  const dot = (k: NextMove["kind"]) =>
    k === "sell" || k === "weak" ? "pf-dot--bad" : k === "none" ? "pf-dot--good" : "pf-dot--watch";

  const scores = [
    { k: L("Spread", "বণ্টন"), v: spread, hint: L("How well your money is split", "টাকা কতটা ভাগ করা") },
    { k: L("Quality", "মান"), v: quality, hint: L("How strong your companies are", "কোম্পানিগুলো কতটা শক্তিশালী") },
    { k: L("Price paid", "কেনার দাম"), v: entry, hint: L("Whether you bought at fair prices", "ন্যায্য দামে কিনেছেন কি না") },
  ];

  return (
    <div id="portfolio-analysis" className={`dash-section ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
      {/* Open on the canvas: the grade and what it means */}
      <div className="pf-an-head">
        <GradeRing grade={analysis.grade} overall={overall} />
        <div className="min-w-0">
          <p className={`pf-an-grade pf-g-${analysis.grade}`}>
            {L(`Grade ${analysis.grade}`, `গ্রেড ${analysis.grade}`)} · {label}
            <span className="pf-an-of">{overall.toFixed(1)} / 10</span>
          </p>
          <h3 className="pf-an-headline">{analysis.headline}</h3>
        </div>
      </div>
      <p className="pf-an-explain">{analysis.gradeExplanation}</p>

      {/* ONE card: the three scores, then the next move */}
      <div className="soft-card pf-answers">
        <div className="pf-an-scores">
          {scores.map((s) => (
            <div key={s.k} className="pf-answer">
              <p className="pf-answer-q">{s.k}</p>
              <p className="pf-answer-a">
                {s.v.toFixed(1)}
                <span className="ml-0.5 text-xs font-semibold text-text-muted">/10</span>
              </p>
              <div className="pf-bar" aria-hidden>
                <div
                  className={`${scoreClass(s.v)} absolute inset-y-0 left-0 rounded-full bg-current`}
                  style={{ width: `${Math.max(0, Math.min(100, s.v * 10))}%` }}
                />
              </div>
              <p className="pf-answer-x hidden sm:block">{s.hint}</p>
            </div>
          ))}
        </div>

        <section className="pf-an-next" aria-labelledby="pf-next-h">
          <p className="pf-an-eyebrow">
            <span className={`pf-dot ${dot(first.kind)}`} aria-hidden />
            {L("Your next move", "আপনার পরের পদক্ষেপ")}
          </p>
          <h4 id="pf-next-h" className="pf-an-move">{first.title}</h4>
          <p className="pf-an-line">{first.line}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1">
            {first.amount != null && (
              <p className="text-sm text-text-muted">
                {L("Money this is about: ", "যত টাকা নিয়ে: ")}
                <b className="pv pf-num text-text-main">{takaGroup(first.amount)}</b>
              </p>
            )}
            {first.href && first.cta && (
              <a href={first.href} className="pf-link">
                {first.cta} →
              </a>
            )}
          </div>

          {next.more.length > 0 && (
            <div className="mt-3 border-t border-cell-rule pt-3">
              <p className="text-xs font-semibold text-text-muted">{L("After that", "তারপর")}</p>
              <ul className="pf-rows mt-1">
                {next.more.map((m) => (
                  <li key={m.kind} className="flex items-center gap-3 py-2">
                    <span className={`pf-dot ${dot(m.kind)}`} aria-hidden />
                    <span className="min-w-0 flex-1 text-sm text-text-main">
                      <span className="font-semibold">{m.title}</span>
                      {m.amount != null && <span className="pv pf-num text-text-muted"> · {takaGroup(m.amount)}</span>}
                    </span>
                    {m.href && (
                      <a href={m.href} className="pf-link shrink-0 -my-2">
                        {L("See", "দেখুন")}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
