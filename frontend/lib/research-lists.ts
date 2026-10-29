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
 * `RowLock` (`components/research/ResearchLock.tsx`).
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
  /** The FAQ JSON-LD reads `q` / `a` (English); the page shows the reader's language. */
  faqs: { q: string; a: string; qBn: string; aBn: string }[];
}

const COMMON_FAQ = [
  {
    q: "How often is this list updated?",
    a: "Every trading day, after the market closes and the latest prices and company reports are in. Who joined and who left is recorded each day, so you can see what changed over the past month.",
    qBn: "এই তালিকা কত দিন পর পর হালনাগাদ হয়?",
    aBn: "প্রতি কার্যদিবসে, বাজার বন্ধ হওয়ার পর সর্বশেষ দাম আর কোম্পানির প্রতিবেদন এলে। কে যোগ হলো আর কে বাদ পড়ল, তা প্রতিদিন রেকর্ড হয়, তাই গত এক মাসে কী বদলেছে দেখতে পারবেন।",
  },
  {
    q: "Is this list a recommendation to buy?",
    a: "No. It shows which companies pass a set of plain checks today, with each company's own numbers and the main risk we can see. It is research to start from, not advice, so please read the full stock page before you decide.",
    qBn: "এই তালিকা কি কেনার পরামর্শ?",
    aBn: "না। এটি দেখায় আজ কোন কোম্পানিগুলো কিছু সহজ যাচাইয়ে পাস করেছে, প্রতিটির নিজের সংখ্যা আর আমরা যে প্রধান ঝুঁকি দেখি, তা সহ। এটি শুরু করার মতো গবেষণা, পরামর্শ নয়, তাই সিদ্ধান্তের আগে শেয়ারের পুরো পেজ পড়ে নিন।",
  },
];

export const RESEARCH_LISTS: ResearchListDef[] = [
  {
    slug: "dividend-cash-machines-dse",
    shortName: "Pays cash every year",
    shortNameBn: "প্রতি বছর নগদ ডিভিডেন্ড দেয়",
    hook: "Pays a dividend every year out of real profit, and can keep paying.",
    hookBn: "প্রতি বছর আসল মুনাফা থেকে ডিভিডেন্ড দেয়, আর দিয়ে যেতে পারবে।",
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
        qBn: "শুধু সবচেয়ে বেশি ডিভিডেন্ড ইল্ড দিয়ে সাজানো হয় না কেন?",
        aBn: "অনেক বেশি ইল্ড প্রায়ই একটি সতর্ক সংকেত: কোম্পানি সমস্যায় আছে বলে দাম পড়েছে, বা যা আয় করেছে তার চেয়ে বেশি দিয়েছে। এই তালিকায় থাকে শুধু সেই কোম্পানিগুলো, যারা পাঁচ বছর ধরে প্রতি বছর দিয়েছে, মুনাফার 70%-এর বেশি দেয়নি, আর পেছনে সত্যিকারের নগদ ছিল।",
      },
      ...COMMON_FAQ,
    ],
  },
  {
    slug: "cheap-quality-stocks-dse",
    shortName: "Good companies at a low price",
    shortNameBn: "কম দামে ভালো কোম্পানি",
    hook: "Cheaper than usual, and not because something is wrong.",
    hookBn: "স্বাভাবিকের চেয়ে কম দাম, তবে কোনো সমস্যার কারণে নয়।",
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
        a: "A share can look cheap because profit is about to fall, the company owes too much, or it stopped holding AGMs. The list drops any company whose profit fell by 25% or more, whose loans are larger than the profit it has saved, or that sits in category Z.",
        qBn: "'কারণেই সস্তা' মানে কী?",
        aBn: "মুনাফা কমতে যাচ্ছে, কোম্পানির ঋণ অনেক বেশি, বা এজিএম করা বন্ধ করেছে বলে একটি শেয়ার সস্তা দেখাতে পারে। যে কোম্পানির মুনাফা 25% বা তার বেশি কমেছে, ঋণ জমানো মুনাফার চেয়ে বেশি, বা যে Z ক্যাটাগরিতে আছে, তালিকা সেগুলো বাদ দেয়।",
      },
      ...COMMON_FAQ,
    ],
  },
  {
    slug: "profits-rising-stocks-dse",
    shortName: "Profit up, price still low",
    shortNameBn: "মুনাফা বাড়ছে, দাম এখনো কম",
    hook: "Profit is clearly up this year, but the share price has not caught up.",
    hookBn: "এ বছর মুনাফা স্পষ্টভাবে বেড়েছে, কিন্তু শেয়ারের দাম এখনো তেমন বাড়েনি।",
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
        qBn: "গত বছরেও মুনাফা ছিল, শুধু এমন কোম্পানি কেন?",
        aBn: "খুব সামান্য মুনাফা থেকে একটু বেশি মুনাফায় গেলেও তা +500% দেখাতে পারে। গত বছরের একই মাসগুলোতে সত্যিকারের মুনাফা থাকার শর্ত তালিকায় শুধু অর্থবহ বৃদ্ধিই রাখে।",
      },
      ...COMMON_FAQ,
    ],
  },
  {
    slug: "debt-free-growth-stocks-dse",
    shortName: "No loans, still growing",
    shortNameBn: "ঋণ নেই, তবু বাড়ছে",
    hook: "Almost no loans, good earnings, and profit rising year after year.",
    hookBn: "প্রায় কোনো ঋণ নেই, ভালো আয়, আর মুনাফা বছরের পর বছর বাড়ছে।",
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
        a: "Borrowing is how a bank does business, and insurers hardly borrow at all, so 'no loans' tells you little about either. This list looks only at regular businesses.",
        qBn: "ব্যাংক আর বিমা কোম্পানি কেন বাদ?",
        aBn: "ঋণ নেওয়াই ব্যাংকের ব্যবসার ধরন, আর বিমা কোম্পানি প্রায় ঋণ নেয়ই না, তাই 'ঋণ নেই' কথাটি এদের সম্পর্কে তেমন কিছু বলে না। এই তালিকা শুধু সাধারণ ব্যবসা দেখে।",
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
        a: "Sometimes it does, which is why the list checks the business, not the chart: profit still holding, loans under control, and no auditor or regulator warnings. Prices also fall with the whole market, taking good companies down with the rest.",
        qBn: "দাম পড়া মানে সাধারণত খারাপ খবর। তাহলে এগুলো দেখব কেন?",
        aBn: "কখনো কখনো তাই, এ কারণেই তালিকা চার্ট নয়, ব্যবসা যাচাই করে: মুনাফা টিকে আছে, ঋণ নিয়ন্ত্রণে, আর নিরীক্ষক বা নিয়ন্ত্রকের কোনো সতর্কতা নেই। পুরো বাজার পড়লে ভালো কোম্পানির দামও বাকিদের সঙ্গে কমে।",
      },
      ...COMMON_FAQ,
    ],
  },
  {
    slug: "sponsors-buying-stocks-dse",
    shortName: "Owners are buying more",
    shortNameBn: "উদ্যোক্তারা আরও কিনছেন",
    hook: "The company's own sponsors and directors are buying more of its shares.",
    hookBn: "কোম্পানির উদ্যোক্তা-পরিচালকরা নিজেরাই আরও শেয়ার কিনছেন।",
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
        a: "A rise of more than 5 points in a few months is usually a change in how holders are listed on paper, not owners buying with their own money. Those are left out; you can check the company's disclosure on its stock page.",
        qBn: "খুব বড় বৃদ্ধি কেন বাদ দেওয়া হয়?",
        aBn: "কয়েক মাসে 5 পয়েন্টের বেশি বৃদ্ধি সাধারণত কাগজে-কলমে শেয়ারধারীদের শ্রেণি বদল, উদ্যোক্তাদের নিজের টাকায় কেনা নয়। এগুলো বাদ দেওয়া হয়; শেয়ারের পেজে কোম্পানির ঘোষণা দেখে নিতে পারেন।",
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
): { text: string; cls: string; /** Bengali twin of `text` (differs only for points). */ textBn: string } {
  const same = (text: string, cls: string) => ({ text, cls, textBn: text });
  if (v == null) return same("—", "text-text-muted");
  if (SIGNED.has(col.key)) return same(changePct(v, 0), changeTone(v));
  switch (col.fmt) {
    case "pct": return same(`${v.toFixed(1)}%`, "");
    case "x": return same(`${v.toFixed(1)}×`, "");
    case "pp": {
      const n = `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)}`;
      return { text: `${n} pts`, cls: changeTone(v), textBn: `${n} পয়েন্ট` };
    }
    case "taka": return same(takaGroup(v), "");
    default: return same(v.toFixed(0), "");
  }
}
