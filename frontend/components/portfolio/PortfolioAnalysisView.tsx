import {
  GRADE_WORDS,
  type AnalysisLang,
  type Grade,
  type PortfolioAnalysis,
  type RebalancePlan,
} from "@/lib/portfolio-analysis";
import AllocationChart from "./AllocationChart";
import SectorBreakdownChart from "./SectorBreakdownChart";
import HoldingsDetailed from "./HoldingsDetailed";
import RebalanceHelper from "./RebalanceHelper";
import AnswerLock from "@/components/premium/AnswerLock";
import PfCard from "./PfCard";

/** Grade colour classes (app/styles/portfolio.css) — the one place a grade is coloured. */
const GRADE_CLASS: Record<Grade, string> = {
  A: "pf-g-A",
  B: "pf-g-B",
  C: "pf-g-C",
  D: "pf-g-D",
  F: "pf-g-F",
};

/** A sub-score out of 10 wears the colour of the grade it would earn. */
function scoreClass(value: number): string {
  return value >= 7 ? "pf-g-B" : value >= 5 ? "pf-g-C" : value >= 3.5 ? "pf-g-D" : "pf-g-F";
}

const STR = {
  en: {
    verdict: "Your portfolio's grade",
    spread: "Spread",
    spreadHint: "How well your money is split",
    quality: "Quality",
    qualityHint: "How strong your companies are",
    entry: "Price paid",
    entryHint: "Whether you bought at fair prices",
    listsTitle: "What we found",
    howToRead:
      "What's already working, what needs your attention, and what to think about next. Each point says what it means and what you can do.",
    goodTitle: "What's working well",
    goodEmpty: "Positive signals will appear as your portfolio grows.",
    badTitle: "Needs your attention",
    badEmpty: "No major red flags spotted.",
    considerTitle: "Things to consider",
    considerEmpty: "Nothing pressing right now.",
    disclaimer:
      "This analysis is for guidance only. Always do your own research before making investment decisions.",
  },
  bn: {
    verdict: "আপনার পোর্টফোলিওর গ্রেড",
    spread: "বণ্টন",
    spreadHint: "টাকা কতটা ভাগ করে রেখেছেন",
    quality: "মান",
    qualityHint: "আপনার কোম্পানিগুলো কতটা শক্তিশালী",
    entry: "কেনার দাম",
    entryHint: "ন্যায্য দামে কিনেছেন কি না",
    listsTitle: "আমরা যা পেলাম",
    howToRead:
      "তিনটি ছোট তালিকা: কোনটা ভালো চলছে, কোথায় নজর দরকার, আর এরপরে কী নিয়ে ভাববেন। প্রতিটি পয়েন্টে লেখা আছে এর মানে কী আর আপনি কী করতে পারেন।",
    goodTitle: "যা ভালো চলছে",
    goodEmpty: "পোর্টফোলিও বড় হলে ভালো দিকগুলো এখানে দেখা যাবে।",
    badTitle: "যেখানে নজর দরকার",
    badEmpty: "বড় কোনো সতর্ক সংকেত পাওয়া যায়নি।",
    considerTitle: "যা ভেবে দেখতে পারেন",
    considerEmpty: "এখনই জরুরি কিছু নেই।",
    disclaimer:
      "এই বিশ্লেষণ শুধু ধারণা দেওয়ার জন্য। বিনিয়োগের সিদ্ধান্ত নেওয়ার আগে সবসময় নিজে যাচাই করুন।",
  },
} as const;

interface Props {
  analysis: PortfolioAnalysis;
  /** "What to buy next" ideas — omitted on read-only surfaces (e.g. sample portfolios). */
  rebalance?: RebalancePlan | null;
  /** Language of the copy — must match the lang the analysis was built with. */
  lang?: AnalysisLang;
  showSectorSpread?: boolean;
  showHoldingsList?: boolean;
  showDisclaimer?: boolean;
  /** The grade card. /portfolio passes false — `AnalysisTop` shows the grade there. */
  showGrade?: boolean;
  /** Free account on /portfolio: the grade, its three scores and the spread
   *  charts stay open; each of the three lists shows its first FREE_POINTS
   *  points and the rest blurred in place, with a link to the page's one
   *  Premium lock. The buy-next ideas and the per-holding read are left out
   *  here — PortfolioClient puts them inside that lock. Sample portfolios and
   *  the landing never pass it. */
  locked?: boolean;
  /** Where the "+N more with Premium" links point when locked (the page's one lock). */
  moreHref?: string;
}

/** Points of each list a free reader sees; the rest are blurred in place. */
export const FREE_POINTS = { good: 1, bad: 0, consider: 0 } as const;

export default function PortfolioAnalysisView({
  analysis,
  rebalance = null,
  lang = "en",
  showSectorSpread = true,
  showHoldingsList = true,
  showDisclaimer = true,
  showGrade = true,
  locked = false,
  moreHref,
}: Props) {
  const { spread, quality, entry } = analysis.subScores;
  const t = STR[lang];
  const bnMode = lang === "bn";
  const bnText = bnMode ? "font-bn" : "";
  const langAttr = bnMode ? "bn" : undefined;
  const gradeCls = GRADE_CLASS[analysis.grade];

  return (
    <div
      id={showGrade ? "portfolio-analysis" : undefined}
      lang={langAttr}
      className={`flex flex-col gap-4 sm:gap-5 scroll-mt-20 ${bnText}`}
    >
      {/* The grade: letter in its colour, label word, headline, then the three
          sub-scores in a hairline grid (the BigPicture "answers" pattern). */}
      {showGrade && (
      <PfCard title={t.verdict} lang={lang} flush dataCard="portfolio-grade">
        <div className="px-4 pb-5 sm:px-6 sm:pb-6">
          <div className="flex items-start gap-4 sm:gap-5">
            <span
              className={`${gradeCls} grid h-16 w-16 shrink-0 place-items-center rounded-xl border-2 border-current text-3xl font-bold leading-none sm:h-20 sm:w-20 sm:text-4xl`}
              aria-hidden
            >
              {analysis.grade}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`${gradeCls} text-sm font-bold`}>
                <span className="sr-only">
                  {bnMode ? "গ্রেড " : "Grade "}
                  {analysis.grade}:{" "}
                </span>
                {GRADE_WORDS[analysis.gradeLabel][bnMode ? "bn" : "en"]}
              </p>
              <p className="mt-1 text-lg font-bold leading-snug text-text-main sm:text-xl">{analysis.headline}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-text-muted sm:text-base">{analysis.gradeExplanation}</p>
        </div>

        <div className="grid grid-cols-1 gap-px border-t border-border bg-border sm:grid-cols-3">
          <SubScore label={t.spread} value={spread} hint={t.spreadHint} />
          <SubScore label={t.quality} value={quality} hint={t.qualityHint} />
          <SubScore label={t.entry} value={entry} hint={t.entryHint} />
        </div>
      </PfCard>
      )}

      {/* Good / Bad / Consider — one card, three hairline-separated lists
          (stacked on phones, three columns from md). */}
      <PfCard title={t.listsTitle} note={t.howToRead} lang={lang} flush dataCard="portfolio-lists">
        <div className="grid grid-cols-1 divide-y divide-border border-t border-border md:grid-cols-3 md:divide-x md:divide-y-0">
          <Section
            title={t.goodTitle}
            tone="good"
            items={analysis.good}
            emptyText={t.goodEmpty}
            bnMode={bnMode}
            limit={locked ? FREE_POINTS.good : undefined}
            moreHref={moreHref}
          />
          <Section
            title={t.badTitle}
            tone="bad"
            items={analysis.bad}
            emptyText={t.badEmpty}
            bnMode={bnMode}
            limit={locked ? FREE_POINTS.bad : undefined}
            moreHref={moreHref}
          />
          <Section
            title={t.considerTitle}
            tone="consider"
            items={analysis.consider}
            emptyText={t.considerEmpty}
            bnMode={bnMode}
            limit={locked ? FREE_POINTS.consider : undefined}
            moreHref={moreHref}
          />
        </div>
      </PfCard>

      {/* What to buy next — concrete ideas for the gaps above */}
      {rebalance && !locked && <RebalanceHelper plan={rebalance} lang={lang} />}

      {/* Allocation per company */}
      {showSectorSpread && <AllocationChart analysis={analysis} lang={lang} />}

      {/* Sector breakdown */}
      {showSectorSpread && <SectorBreakdownChart analysis={analysis} lang={lang} />}

      {/* Holdings */}
      {showHoldingsList && !locked && <HoldingsDetailed analysis={analysis} lang={lang} />}

      {showDisclaimer && <p className="pf-disclaimer mt-1 px-2">{t.disclaimer}</p>}
    </div>
  );
}

function SubScore({ label, value, hint }: { label: string; value: number; hint: string }) {
  const pct = Math.max(0, Math.min(100, (value / 10) * 100));
  return (
    <div className="flex min-w-0 flex-col gap-2 bg-surface px-4 py-4 sm:px-6 sm:py-5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-text-main">{label}</span>
        <span className="nums text-xl font-bold leading-none text-text-main">
          {value.toFixed(1)}
          <span className="ml-0.5 text-xs font-semibold text-text-muted">/10</span>
        </span>
      </div>
      <div className="pf-bar" aria-hidden>
        <div className={`${scoreClass(value)} absolute inset-y-0 left-0 rounded-full bg-current`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs leading-snug text-text-muted">{hint}</span>
    </div>
  );
}

interface SectionProps {
  title: string;
  tone: "good" | "bad" | "consider";
  items: string[];
  emptyText: string;
  bnMode: boolean;
  /** Show only this many points; the rest sit behind one `AnswerLock` line.
   *  `moreHref` is kept for callers; the button follows the page's
   *  PageLockScope anchor. */
  limit?: number;
  moreHref?: string;
}

/** The meaning dot for each list (`.pf-dot--*`). */
const TONE_DOT: Record<SectionProps["tone"], string> = {
  good: "pf-dot pf-dot--good",
  bad: "pf-dot pf-dot--bad",
  consider: "pf-dot pf-dot--watch",
};

function Section({ title, tone, items, emptyText, bnMode, limit, moreHref }: SectionProps) {
  const shown = limit != null ? items.slice(0, limit) : items;
  const more = items.length - shown.length;
  const dot = TONE_DOT[tone];
  // The reader's language is already picked here (`bnMode`), so one string serves both halves.
  const moreLine = bnMode
    ? `${shown.length ? "আরও " : ""}${more}টি কথা, "${title}" অংশে`
    : `${more} ${shown.length ? "more " : ""}point${more === 1 ? "" : "s"} under "${title}"`;
  const list = (rows: string[]) => (
    <ul className="flex flex-col gap-3">
      {rows.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className={`${dot} mt-2`} aria-hidden />
          <span className="min-w-0 text-sm leading-relaxed text-text-main sm:text-base">{item}</span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="flex min-w-0 flex-col px-4 py-5 sm:px-6">
      <h4 className="mb-3 flex items-center gap-2 text-base font-bold leading-tight text-text-main">
        <span className={dot} aria-hidden />
        <span className="min-w-0">{title}</span>
        {items.length > 0 && <span className="nums font-semibold text-text-muted">{items.length}</span>}
      </h4>

      {items.length === 0 ? (
        <p className="text-sm leading-relaxed text-text-muted">{emptyText}</p>
      ) : (
        <>
          {shown.length > 0 && list(shown)}
          {more > 0 && (
            <>
              {/* The rest of the points: one lock line (the page's
                  PageLockScope points it at #pf-premium). */}
              <AnswerLock
                variant="line"
                job="watch"
                lock={`Portfolio: ${tone}`}
                className={shown.length ? "mt-3" : ""}
                lines={[{ en: moreLine, bn: moreLine }]}
              >
                {list(items.slice(shown.length))}
              </AnswerLock>
            </>
          )}
        </>
      )}
    </div>
  );
}
