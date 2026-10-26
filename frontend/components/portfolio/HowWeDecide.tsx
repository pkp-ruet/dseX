import { formatDate } from "@/lib/formatters";
import type { AnalysisLang, PortfolioAnalysis } from "@/lib/portfolio-analysis";

/**
 * "How we decide" (2026-10-26): every input behind the grade, the lists and
 * the buy ideas, with this portfolio's own numbers and the cut-offs — the
 * portfolio version of the market-analysis "How we decide" fold. Free.
 */
export default function HowWeDecide({
  analysis,
  scoresAt,
  lang,
}: {
  analysis: PortfolioAnalysis;
  /** When the scores (and prices) this page uses were computed. */
  scoresAt: string | null;
  lang: AnalysisLang;
}) {
  const bn = lang === "bn";
  const L = (en: string, b: string) => (bn ? b : en);
  const f = (v: number) => v.toFixed(1);
  const { subScores: s, breakdown: b, effectiveStocks } = analysis;
  const qualityCuts = b.weakPenalty + b.strugglingPenalty + b.categoryPenalty + b.stalePenalty;

  const rows: { k: string; v: string; rule: string }[] = [
    {
      k: L("Your grade", "আপনার গ্রেড"),
      v: `${analysis.grade} · ${f(s.overall)}/10`,
      rule: L(
        "The average of the three scores below. A from 8, B from 6.5, C from 5, D from 3.5, else F.",
        "নিচের তিনটি স্কোরের গড়। 8 থেকে A, 6.5 থেকে B, 5 থেকে C, 3.5 থেকে D, তার নিচে F।",
      ),
    },
    {
      k: L("Spread", "বণ্টন"),
      v: `${f(s.spread)}/10`,
      rule: L(
        `Your money behaves like ${f(effectiveStocks)} equal stocks (counted by size, up to 10)${b.sectorPenalty > 0 ? `, minus ${f(b.sectorPenalty)} because one sector or the finance group is too heavy` : ""}. One sector over 50% costs up to 4; banks, finance companies and insurers over 55% together cost 3.`,
        `আপনার টাকা ${f(effectiveStocks)}টি সমান শেয়ারের মতো ছড়ানো (আকার ধরে, 10 পর্যন্ত)${b.sectorPenalty > 0 ? `, একটি খাত বা আর্থিক খাত বেশি ভারী বলে ${f(b.sectorPenalty)} কম` : ""}। একটি খাত 50%-এর বেশি হলে 4 পর্যন্ত কাটে; ব্যাংক, আর্থিক প্রতিষ্ঠান আর বিমা মিলে 55%-এর বেশি হলে 3।`,
      ),
    },
    {
      k: L("Quality", "মান"),
      v: `${f(s.quality)}/10`,
      rule: L(
        `Your companies' scores, weighted by the money in each: ${f(b.baseQuality)}${qualityCuts > 0 ? `, minus ${f(qualityCuts)} for money in weak-rated companies, weak finances, Z category or accounts 2+ years old` : ""}. Each cut grows with the money involved and is capped (3 · 2 · 2 · 2).`,
        `টাকার ভাগ ধরে আপনার কোম্পানিগুলোর স্কোর: ${f(b.baseQuality)}${qualityCuts > 0 ? `, দুর্বল রেটিং, দুর্বল আর্থিক অবস্থা, Z ক্যাটাগরি বা 2+ বছরের পুরোনো হিসাবের টাকার জন্য ${f(qualityCuts)} কম` : ""}। প্রতিটি কাটা টাকার সাথে বাড়ে, সর্বোচ্চ সীমা আছে (3 · 2 · 2 · 2)।`,
      ),
    },
    {
      k: L("Price paid", "কেনার দাম"),
      v: `${f(s.entry)}/10`,
      rule: L(
        `Your buy price ÷ the company's latest yearly profit per share, next to the middle P/E of its sector today. Up to 0.9× is cheap, under 1.2× fair, above that — or any P/E over 30 — expensive. Weighted by money; ${b.judgeablePct.toFixed(0)}% of your money could be judged (loss-makers can't).`,
        `আপনার কেনার দাম ÷ কোম্পানির সর্বশেষ বার্ষিক শেয়ারপ্রতি লাভ, আজকের খাতের মাঝামাঝি P/E-র পাশে। 0.9 গুণ পর্যন্ত সস্তা, 1.2 গুণের নিচে ন্যায্য, তার ওপরে — বা P/E 30-এর বেশি হলে — দামি। টাকার ভাগ ধরে; আপনার টাকার ${b.judgeablePct.toFixed(0)}% যাচাই করা গেছে (লোকসানি কোম্পানি যায় না)।`,
      ),
    },
    {
      k: L("Buy more / Sell", "আরও কিনুন / বিক্রি"),
      v: L("Per stock", "প্রতি শেয়ারে"),
      rule: L(
        "From the same signal as every stock page, with the price you paid added in. The lists and your next move read it; they never make up their own.",
        "প্রতিটি শেয়ারের পাতার একই সংকেত, সাথে আপনার কেনার দাম। তালিকা আর পরের পদক্ষেপ এটাই পড়ে; নিজে থেকে কিছু বানায় না।",
      ),
    },
    {
      k: L("Buy ideas", "কেনার আইডিয়া"),
      v: L("Buy signal only", "শুধু কেনার সংকেত"),
      rule: L(
        "A stock must carry a Buy today: rated good or excellent, a good price, at least ৳10 lakh traded a day, accounts under 2 years old, not Z, profit not down 25%+, not near its yearly high. Then: not in your heaviest sector, ranked on price first and quality second; the example size is about 10% of your money.",
        "আজ কেনার সংকেত থাকতে হবে: ভালো বা চমৎকার রেটিং, ভালো দাম, দিনে অন্তত ৳10 লাখ লেনদেন, 2 বছরের কম পুরোনো হিসাব, Z নয়, লাভ 25%+ কমেনি, বছরের সর্বোচ্চ দামের কাছে নয়। তারপর: আপনার সবচেয়ে ভারী খাতের বাইরে, আগে দাম তারপর মান ধরে সাজানো; উদাহরণের পরিমাণ আপনার টাকার প্রায় 10%।",
      ),
    },
  ];

  return (
    <details className="soft-card mk-why" data-card="how-we-decide">
      <summary className={bn ? "font-bn" : ""}>
        {L("How we decide", "আমরা কীভাবে ঠিক করি")}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <div className={`mk-why-body ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
        <p className="text-sm text-text-muted">
          {scoresAt
            ? L(
                `Based on scores and closing prices from ${formatDate(scoresAt)}. Company figures are the latest each company has published.`,
                `${formatDate(scoresAt)}-এর স্কোর আর ক্লোজিং দামের ভিত্তিতে। কোম্পানির হিসাব প্রতিটির সর্বশেষ প্রকাশিত হিসাব।`,
              )
            : L("Based on the latest scores and closing prices.", "সর্বশেষ স্কোর আর ক্লোজিং দামের ভিত্তিতে।")}
        </p>
        <ul className="mk-why-list">
          {rows.map((r) => (
            <li key={r.k} className="mk-why-row">
              <span className="mk-why-k">{r.k}</span>
              <span className="mk-why-v">{r.v}</span>
              <span className="mk-why-rule">{r.rule}</span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
