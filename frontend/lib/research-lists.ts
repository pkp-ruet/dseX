import type { ResearchColumn } from "@/lib/api";
import { changePct, changeTone, takaGroup } from "@/lib/formatters";

/**
 * Research lists — the page copy that has to exist before the data does
 * (metadata, FAQ, which free list leads into which). The idea, the checks
 * and every figure come from `GET /api/research-lists/:slug`
 * (backend services/research_lists.py is the one source of the rules).
 *
 * Premium, fully: a free reader sees the idea and the checks (the funnel);
 * every stock, the side-by-side table and "what changed" sit behind
 * PremiumGate.
 */

export interface ResearchListDef {
  slug: string;
  /** The list's name in plain words — hub card, crumbs, page h1 (the backend's
   * title_en / title_bn must say the same). */
  shortName: string;
  shortNameBn: string;
  /** One line for the hub card, in each language. */
  hook: string;
  hookBn: string;
  /** Search-friendly <title> / h1. */
  seoTitle: string;
  description: string;
  keywords: string[];
  faqs: { q: string; a: string }[];
}

const COMMON_FAQ = [
  {
    q: "How often is this list updated?",
    a: "Every trading day, after the market closes and the latest prices and company reports are in. Who joined and who left is recorded each day, so you can see what changed over the past month.",
  },
  {
    q: "Is this list a recommendation to buy?",
    a: "No. It shows which companies pass a set of plain checks today, with each company's own numbers and the main risk we can see. It is research to start from, not advice — read the full stock page before you decide.",
  },
];

export const RESEARCH_LISTS: ResearchListDef[] = [
  {
    slug: "dividend-cash-machines-dse",
    shortName: "Pays cash every year",
    shortNameBn: "প্রতি বছর নগদ লভ্যাংশ দেয়",
    hook: "Pays a dividend every year, out of real profit — and can keep paying.",
    hookBn: "প্রতি বছর আসল লাভ থেকে লভ্যাংশ দেয় — আর দিয়ে যেতে পারবে।",
    seoTitle: "Dividend Stocks That Can Keep Paying — DSE Cash Machines",
    description:
      "DSE companies that pay a cash dividend every year, pay it out of real profit and real cash, and are not expensive. Every check shown, with each company's own numbers.",
    keywords: [
      "best dividend stocks Bangladesh",
      "safe dividend stocks DSE",
      "regular dividend paying companies Bangladesh",
      "high dividend yield DSE",
      "ডিভিডেন্ড শেয়ার",
    ],
    faqs: [
      {
        q: "Why not just rank by the highest dividend yield?",
        a: "A very high yield is often a warning: the price has fallen because the company is in trouble, or it paid more than it earned. This list only keeps companies that paid every year for five years, paid out no more than 70% of profit, and backed it with real cash.",
      },
      ...COMMON_FAQ,
    ],
  },
  {
    slug: "cheap-quality-stocks-dse",
    shortName: "Good companies at a low price",
    shortNameBn: "কম দামে ভালো কোম্পানি",
    hook: "Cheaper than usual — and not because something is wrong.",
    hookBn: "স্বাভাবিকের চেয়ে সস্তা — কিন্তু কোনো সমস্যার কারণে নয়।",
    seoTitle: "Undervalued Quality Stocks on DSE — Cheap, but Not Broken",
    description:
      "Good DSE companies priced below their own usual level and below their sector, after removing shares that are cheap for a reason: falling profit, heavy loans, Z category.",
    keywords: [
      "undervalued stocks Bangladesh",
      "cheap good stocks DSE",
      "low PE stocks Bangladesh",
      "value stocks Dhaka Stock Exchange",
      "কম দামের ভালো শেয়ার",
    ],
    faqs: [
      {
        q: "What does 'cheap for a reason' mean?",
        a: "A share can look cheap because profit is about to fall, the company owes too much, or it stopped holding AGMs. The list drops any company whose profit fell by a quarter or more, whose loans are bigger than its savings, or that sits in category Z.",
      },
      ...COMMON_FAQ,
    ],
  },
  {
    slug: "profits-rising-stocks-dse",
    shortName: "Profit up, price still low",
    shortNameBn: "লাভ বাড়ছে, দাম এখনো কম",
    hook: "Profit is clearly up this year, but the share price hasn't caught up.",
    hookBn: "এ বছর লাভ স্পষ্টভাবে বেড়েছে, কিন্তু শেয়ারের দাম এখনো তেমন বাড়েনি।",
    seoTitle: "DSE Stocks With Rising Profits — Latest Quarterly Results",
    description:
      "DSE companies whose latest quarterly report shows profit up at least 15% on last year, with real cash coming in — while the share price is still in the lower half of its yearly range.",
    keywords: [
      "profit growth stocks DSE",
      "quarterly results Bangladesh stocks",
      "EPS growth DSE 2026",
      "earnings growth stocks Bangladesh",
      "লাভ বাড়ছে শেয়ার",
    ],
    faqs: [
      {
        q: "Why only companies that made a profit last year too?",
        a: "Going from a tiny profit to a slightly bigger one can read as +500%. Requiring a real profit in the same months last year keeps the list to growth that means something.",
      },
      ...COMMON_FAQ,
    ],
  },
  {
    slug: "debt-free-growth-stocks-dse",
    shortName: "No loans, still growing",
    shortNameBn: "ঋণ নেই, তবু বাড়ছে",
    hook: "Almost no loans, good earnings, and profit rising year after year.",
    hookBn: "প্রায় কোনো ঋণ নেই, ভালো আয়, আর লাভ বছরের পর বছর বাড়ছে।",
    seoTitle: "Debt-Free Growth Stocks on DSE",
    description:
      "DSE businesses that grow on their own money: almost no loans, at least 10% a year earned on shareholders' money, and profit that has risen steadily over five years.",
    keywords: [
      "debt free companies Bangladesh",
      "zero debt stocks DSE",
      "high ROE stocks Bangladesh",
      "growth stocks without debt DSE",
      "ঋণমুক্ত কোম্পানি",
    ],
    faqs: [
      {
        q: "Why are banks and insurers left out?",
        a: "Borrowing is how a bank does business, and insurers don't borrow at all, so 'debt-free' tells you nothing about either. This list looks only at regular businesses.",
      },
      ...COMMON_FAQ,
    ],
  },
  {
    slug: "fallen-strong-stocks-dse",
    shortName: "Price fell, company still good",
    shortNameBn: "দাম পড়েছে, কোম্পানি এখনো ভালো",
    hook: "The share price is 20% or more below its high, but the business is still sound.",
    hookBn: "শেয়ারের দাম সর্বোচ্চ থেকে 20% বা তার বেশি কম, কিন্তু ব্যবসা এখনো মজবুত।",
    seoTitle: "Good DSE Stocks Trading Well Below Their 1-Year High",
    description:
      "DSE companies whose share price is at least 20% below its 1-year high while the business still grades Good or better — with no auditor, regulator or meeting warnings in the last year.",
    keywords: [
      "stocks near 52 week low Bangladesh",
      "beaten down good stocks DSE",
      "quality stocks on sale DSE",
      "stock price fallen Bangladesh",
      "দাম পড়া ভালো শেয়ার",
    ],
    faqs: [
      {
        q: "A falling price usually means bad news. Why look at these?",
        a: "Sometimes it does, which is why the list checks the business, not the chart: profit still holding, loans under control, no auditor or regulator warnings. Prices also fall with the whole market, taking good companies down with the rest.",
      },
      ...COMMON_FAQ,
    ],
  },
  {
    slug: "sponsors-buying-stocks-dse",
    shortName: "Owners are buying more",
    shortNameBn: "মালিকরা আরও কিনছেন",
    hook: "The company's own sponsors and directors are buying more of its shares.",
    hookBn: "কোম্পানির উদ্যোক্তা ও পরিচালকরা নিজেরাই আরও শেয়ার কিনছেন।",
    seoTitle: "DSE Stocks Where Sponsors Are Buying",
    description:
      "DSE companies whose sponsors and directors raised their own stake over the last six months — checked against reclassifications, losses and weak fundamentals.",
    keywords: [
      "sponsor director buying DSE",
      "insider buying Bangladesh stocks",
      "sponsor shareholding increase DSE",
      "director share purchase Bangladesh",
      "উদ্যোক্তা শেয়ার কিনছেন",
    ],
    faqs: [
      {
        q: "Why are very large jumps left out?",
        a: "A rise of more than 5 points in a few months is usually a reclassification of holders on paper, not owners buying with their own money. Those are left out; check the company's disclosure on its stock page.",
      },
      ...COMMON_FAQ,
    ],
  },
];

export function getResearchListDef(slug: string): ResearchListDef | undefined {
  return RESEARCH_LISTS.find((l) => l.slug === slug);
}

/** Free list → the research list that goes deeper on the same idea. Free
 * lists without a match point at the research block on the hub instead. */
export const DEEPER: Record<string, string> = {
  "top-dividend-stocks-bangladesh": "dividend-cash-machines-dse",
};

/** Columns whose number is a change, printed signed and coloured. */
const SIGNED = new Set(["profit_change_pct", "interim_eps_yoy_pct", "interim_q_yoy_pct"]);

/** A list figure printed the one way (comparison table, homepage rail). */
export function formatResearchMetric(
  col: Pick<ResearchColumn, "key" | "fmt">,
  v: number | null | undefined,
): { text: string; cls: string } {
  if (v == null) return { text: "—", cls: "text-text-muted" };
  if (SIGNED.has(col.key)) return { text: changePct(v, 0), cls: changeTone(v) };
  switch (col.fmt) {
    case "pct": return { text: `${v.toFixed(1)}%`, cls: "" };
    case "x": return { text: `${v.toFixed(1)}×`, cls: "" };
    case "pp": return { text: `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)} pts`, cls: changeTone(v) };
    case "taka": return { text: takaGroup(v), cls: "" };
    default: return { text: v.toFixed(0), cls: "" };
  }
}
