import { isValidElement, type ReactNode } from "react";
import QuestionRow from "@/components/stock/report/QuestionRow";
import ReportChapter from "@/components/stock/report/ReportChapter";
import FullReportBand from "@/components/stock/report/FullReportBand";
import ReportDepth from "@/components/stock/report/ReportDepth";
import ReportOffer from "@/components/stock/report/ReportOffer";
import ReportView from "@/components/stock/report/ReportView";
import ShareCheck from "@/components/stock/report/ShareCheck";
import YouAndThisStock from "@/components/stock/report/YouAndThisStock";
import { T } from "@/components/i18n/T";
import { ToneChip, money, tx } from "@/components/stock/report/fmt";
import {
  AlternativesDetails, CashPremium, DividendDetails, DividendFree, DividendPremium, MoneyPicture, NextDetails, NextFree,
  OwnersDetails, OwnersFree, PriceDetails, PricePicture, PricePremium, priceAnswer, QualityDetails, RedFlagsDetails, StrengthPicture, strengthAnswer,
  RedFlagsFree, RisksDetails, SafetyDetails, SafetyFree, SafetyPremium, SharesPicture, ThisYearDetails, ThisYearFree,
  ThisYearPremium, sharesAnswer,
} from "@/components/stock/report/sections";
import type { CompanyDetail } from "@/lib/api";

type Teaser = "word" | "lock";
import {
  ANSWERS_LOCKED_IN, CHAPTER_SIGNPOST, FREE_SAMPLE_ROW, FREE_WORD_ROWS, REPORT_CHAPTERS, VIEW_CHAPTER, type Bi, type CheckKey, type QuestionKey, type SectionBase, type SectionKey, type StockReport,
} from "@/lib/stock-report";

const CHECKS: CheckKey[] = ["red_flags", "price", "dividend", "this_year", "owners", "cash", "safety", "quality"];

/** Old anchors that pushes, the results feed, stories and old sections link
 *  to, and the row they land on now. */
const ALIASES: Partial<Record<QuestionKey, string[]>> = {
  this_year: ["results", "rp-story"],
  quality: ["score-history", "health", "rp-sector"],
  price: ["v-price", "v-fair"],
  // "red-flags": the watcher's red-flag push links here.
  red_flags: ["signals", "red-flags"],
};

/** Where a company stands on the DSE, in words (mirrors the backend's
 *  `build_quality` lead): never "2nd of 362". */
function standingWords(rank: number, total: number): Bi {
  const share = rank / total;
  if (rank <= 10) return { en: "One of the 10 strongest companies on the DSE.", bn: "ডিএসইর সবচেয়ে শক্তিশালী 10টি কোম্পানির একটি।" };
  if (share <= 0.25) return { en: "Stronger than most companies on the DSE.", bn: "ডিএসইর বেশির ভাগ কোম্পানির চেয়ে শক্তিশালী।" };
  if (share <= 0.5) return { en: "Stronger than about half the companies on the DSE.", bn: "ডিএসইর প্রায় অর্ধেক কোম্পানির চেয়ে শক্তিশালী।" };
  if (share <= 0.9) return { en: "Weaker than most companies on the DSE.", bn: "ডিএসইর বেশির ভাগ কোম্পানির চেয়ে দুর্বল।" };
  return { en: "One of the weakest companies on the DSE.", bn: "ডিএসইর সবচেয়ে দুর্বল কোম্পানিগুলোর একটি।" };
}

/** Which chapters a report fills, in order (the sticky chips read this too). */
export function reportChapters(report: StockReport): typeof REPORT_CHAPTERS {
  const sec = report.sections;
  const has = (k: QuestionKey) =>
    k === "you" ? false
    : k === "shares" ? !!(sec.dividend && sec.dividend.history.length >= 2)
    : k === "this_year" ? !!(sec.this_year || sec.story)
    : k === "quality" ? !!(sec.quality || sec.sector)
    : !!sec[k as SectionKey];
  // "You and this stock" only shows for a signed-in holder, so it never keeps
  // a chapter on the page by itself.
  return REPORT_CHAPTERS.filter((c) => c.rows.some((r) => has(r.key)));
}

/**
 * The stock report (2026-10-30 rebuild, plan
 * https://claude.ai/artifact/9AjhtrCYGSjS2Lx9Kajjg7): four chapters, one per
 * question behind the answer card's three lights (`REPORT_CHAPTERS`) plus
 * what comes next. Each chapter opens with its written read and is a list of
 * plain questions (`QuestionRow`: question, word, picture, one line, what it
 * means, the figures folded). Then Our view, then a short closing offer.
 *
 * The full report (2026-10-30, plan https://claude.ai/artifact/1TuJ9dvifeXTLzs5wVwk2Q):
 * free gives the answers, Premium the full report. The fundamentals (plan
 * https://claude.ai/artifact/KCBooTX7PK7a4PoKkcmoMP): in the company and
 * price chapters a free reader gets one sample row and one answer word; the
 * other rows show only their question and a lock. A closed chapter shows its
 * free answers and one signpost back to the Premium card under the answer
 * (plan https://claude.ai/artifact/UHZTK5nvUVrtzzmq6c2oSX).
 */
export default function StockReportBody({ detail, report }: { detail: CompanyDetail; report: StockReport }) {
  const { profile, latest_price } = detail;
  const code = profile.trading_code;
  const name = profile.company_name ?? code;
  const ltp = latest_price.ltp ?? null;
  const sec = report.sections;
  const share = (k: SectionKey) =>
    (CHECKS as string[]).includes(k) ? <ShareCheck code={code} k={k as CheckKey} name={name} /> : undefined;

  /** A row straight from one backend section. */
  const fromSection = (
    k: SectionKey,
    q: Bi,
    parts: {
      picture?: ReactNode; free?: ReactNode; premiumPicture?: ReactNode;
      details?: ReactNode; extraMeaning?: Bi[];
    },
    s: SectionBase,
    open: boolean,
    teaser?: Teaser,
  ) => (
    <QuestionRow
      key={k}
      id={`rp-${k}`}
      aliases={ALIASES[k]}
      title={tx(q)}
      word={s.word}
      tone={s.tone}
      picture={parts.picture}
      free={parts.free}
      premiumPicture={parts.premiumPicture}
      headline={s.headline}
      freeLine={s.free_line}
      details={parts.details}
      meaning={[...s.meaning, ...(parts.extraMeaning ?? [])]}
      watch={s.watch}
      source={s.source}
      action={share(k)}
      sample={open}
      teaser={teaser}
    />
  );

  /** One row; `free` = the open free sample; `teaser` = closed down to its
   *  question (+ its answer word for "word") in a locked fundamentals chapter. */
  const row = (key: QuestionKey, q: Bi, free: boolean, teaser?: Teaser): { node: ReactNode } | null => {
    switch (key) {
      case "this_year": {
        const ty = sec.this_year;
        const st = sec.story;
        const s = (ty ?? st) as SectionBase | undefined;
        if (!s) return null;
        const k: SectionKey = ty ? "this_year" : "story";
        return {
          node: fromSection(k, q, {
            picture: <MoneyPicture story={st} />,
            free: ty ? <ThisYearFree s={ty} /> : undefined,
            premiumPicture: ty ? <ThisYearPremium s={ty} /> : undefined,
            details: <ThisYearDetails s={ty} story={st} />,
          }, s, free, teaser),
        };
      }
      case "cash":
        return sec.cash ? { node: fromSection("cash", q, { premiumPicture: <CashPremium s={sec.cash} /> }, sec.cash, free, teaser) } : null;
      case "safety":
        return sec.safety
          ? {
              // One picture per row: the loans meter answers the question;
              // the credit grade sits with the figures.
              node: fromSection("safety", q, {
                premiumPicture: <SafetyPremium s={sec.safety} />,
                details: (
                  <>
                    <SafetyFree s={sec.safety} />
                    <SafetyDetails s={sec.safety} />
                  </>
                ),
              }, sec.safety, free, teaser),
            }
          : null;
      case "quality": {
        // "Is it strong in its business?" (2026-10-30, user: "so hard to
        // understand"): answered by its place among its own sector's companies
        // — three dot lines, one sentence — with a one-word answer from its
        // business-strength check. How we grade the whole company (the five
        // bars, each explained, the grade history) sits in the fold.
        const st = sec.sector;
        const ql = sec.quality;
        if (!st && !ql) return null;
        const ans = strengthAnswer(detail.score_row);
        const base = (st ?? ql) as SectionBase;
        return {
          node: (
            <QuestionRow
              key="quality"
              id="rp-quality"
              aliases={ALIASES.quality}
              title={tx(q)}
              word={ans?.word ?? base.word}
              tone={ans?.tone ?? base.tone}
              picture={st ? <StrengthPicture sector={st} /> : undefined}
              headline={base.headline}
              freeLine={base.free_line}
              details={<QualityDetails detail={detail} />}
              meaning={st ? st.meaning : base.meaning}
              watch={ql?.watch ?? null}
              source={base.source}
              action={share("quality")}
              sample={free}
              teaser={teaser}
            />
          ),
        };
      }
      case "shares": {
        const d = sec.dividend;
        const a = d ? sharesAnswer(d) : null;
        if (!d || !a) return null;
        return {
          node: (
            <QuestionRow
              key="shares"
              id="rp-shares"
              title={tx(q)}
              word={a.word}
              tone={a.tone}
              picture={<SharesPicture s={d} />}
              headline={a.line}
              allFree
              teaser={teaser}
            />
          ),
        };
      }
      case "price":
        return sec.price
          ? {
              node: fromSection("price", q, {
                picture: <PricePicture s={sec.price} />,
                premiumPicture: <PricePremium s={sec.price} />,
                details: (
                  <PriceDetails
                    s={sec.price}
                    code={code}
                    ltp={ltp}
                    w52High={latest_price.w52_high}
                    w52Low={latest_price.w52_low}
                  />
                ),
              }, { ...sec.price, ...(priceAnswer(sec.price) ?? {}) }, free, teaser),
            }
          : null;
      case "dividend":
        return sec.dividend
          ? {
              node: fromSection("dividend", q, {
                free: <DividendFree s={sec.dividend} />,
                premiumPicture: <DividendPremium s={sec.dividend} />,
                details: <DividendDetails s={sec.dividend} />,
              }, sec.dividend, free, teaser),
            }
          : null;
      case "red_flags":
        return sec.red_flags
          ? {
              node: fromSection("red_flags", q, {
                free: <RedFlagsFree s={sec.red_flags} />,
                details: <RedFlagsDetails s={sec.red_flags} />,
              }, sec.red_flags, free, teaser),
            }
          : null;
      case "owners":
        return sec.owners
          ? {
              node: fromSection("owners", q, {
                picture: <OwnersFree s={sec.owners} />,
                details: <OwnersDetails s={sec.owners} />,
              }, sec.owners, free, teaser),
            }
          : null;
      case "risks":
        return sec.risks
          ? { node: fromSection("risks", q, { details: <RisksDetails s={sec.risks} /> }, sec.risks, free, teaser) }
          : null;
      case "next":
        return sec.next
          ? {
              node: fromSection("next", q, { picture: <NextFree s={sec.next} />, details: <NextDetails s={sec.next} /> }, sec.next, free, teaser),
            }
          : null;
      case "you":
        return { node: <YouAndThisStock key="you" code={code} ltp={ltp} report={report} /> };
      case "alternatives":
        return sec.alternatives
          ? {
              node: fromSection("alternatives", q, { details: <AlternativesDetails s={sec.alternatives} /> }, sec.alternatives, free, teaser),
            }
          : null;
      default:
        return null;
    }
  };

  const q = sec.quality;
  const standing = q?.rank && q.total ? standingWords(q.rank, q.total) : null;
  const companyHead = q ? (
    <div className="rq-chead">
      <ToneChip word={{ en: `Graded ${q.word.en.toLowerCase()}`, bn: `গ্রেড: ${q.word.bn}` }} tone={q.tone} size="lg" />
      {standing && (
        <span className="rq-chead-note">
          <T en={standing.en} bn={standing.bn} />
        </span>
      )}
    </div>
  ) : undefined;

  // The price light's word heads the price chapter, as the grade heads the company one.
  const priceLight = report.answer?.lights.find((l) => l.key === "price");
  const priceHead = priceLight ? (
    <div className="rq-chead">
      <ToneChip word={priceLight.word} tone={priceLight.tone} size="lg" />
      {ltp != null && (
        <span className="rq-chead-note">
          <T en={`At ${money(ltp)} today.`} bn={`আজকের দাম ${money(ltp)}।`} />
        </span>
      )}
    </div>
  ) : undefined;

  const chapters = reportChapters(report).map((c) => {
    // Fundamentals (plan https://claude.ai/artifact/KCBooTX7PK7a4PoKkcmoMP):
    // one sample row open, one answer word, the rest question + lock.
    const locked = ANSWERS_LOCKED_IN.includes(c.id);
    const rows = c.rows
      .map((r) => {
        const sample = locked && r.key === FREE_SAMPLE_ROW;
        const teaser: Teaser | undefined = !locked ? undefined : sample || FREE_WORD_ROWS.includes(r.key) ? "word" : "lock";
        return row(r.key, r.q, sample, teaser);
      })
      .filter(Boolean) as { node: ReactNode }[];
    return { c, rows };
  });
  // "You and this stock" only shows for a holder, so it isn't counted.
  const questions = chapters.reduce((n, ch) => n + ch.rows.filter((r) => !(isValidElement(r.node) && r.node.key === "you")).length, 0);
  const view = report.view ?? null;
  const depth = [...chapters.map((ch) => ch.c.id), ...(view ? [VIEW_CHAPTER.id] : [])];

  return (
    <>
      {/* Older links to the report land on its first chapter. */}
      <span id="ch-verdict" className="stock-anchor block" aria-hidden="true" />
      <span id="ch-report" className="stock-anchor block" aria-hidden="true" />
      <FullReportBand code={code} report={report} questions={questions} />
      {chapters.map(({ c, rows }) => (
        <ReportChapter
          key={c.id}
          id={c.id}
          title={tx(c.title)}
          lead={tx(c.lead)}
          head={c.id === "ch-company" ? companyHead : c.id === "ch-price" ? priceHead : undefined}
          read={report.reads?.[c.id as keyof NonNullable<StockReport["reads"]>] ?? null}
          signpost={CHAPTER_SIGNPOST[c.id]}
        >
          {rows.map((r) => r.node)}
        </ReportChapter>
      ))}
      {view && (
        <ReportView
          view={view}
          code={code}
          ltp={ltp}
          w52High={latest_price.w52_high}
          w52Low={latest_price.w52_low}
        />
      )}
      <ReportOffer code={code} name={name} lines={report.offer} />
      <ReportDepth code={code} chapters={depth} />
    </>
  );
}
