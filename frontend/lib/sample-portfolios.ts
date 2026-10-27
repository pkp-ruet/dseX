// Curated sample portfolios shown on the homepage and at /sample-portfolio/[slug].
// Tickers are chosen to produce a stable contrast between an Excellent (Grade A/B) and
// a Very Risky (Grade D/F) portfolio when run through analyzePortfolio() against live
// scores. Re-tune these picks if a holding's tier shifts and the contrast weakens.

export type SampleSlug = "diversified" | "risky";

export interface SamplePortfolio {
  slug: SampleSlug;
  name: string;
  nameBn: string;
  tagline: string;
  taglineBn: string;
  narrative: string;
  narrativeBn: string;
  holdings: { trading_code: string; qty: number; buy_price: number }[];
}

// Diversified — 7 well-known DSE blue chips across 6 different sectors.
// Buy prices are illustrative; chosen to land in "fair" / "good" entry territory
// against typical recent LTPs, so the entry-price analysis stays positive even as
// prices drift.
const DIVERSIFIED: SamplePortfolio = {
  slug: "diversified",
  name: "Diversified DSE portfolio",
  nameBn: "ছড়ানো ডিএসই পোর্টফোলিও",
  tagline: "Spread across 6 sectors, with strong, well-rated DSE companies.",
  taglineBn: "6টি সেক্টরে ছড়ানো, ভালো রেটিংয়ের শক্তিশালী ডিএসই কোম্পানি নিয়ে।",
  narrative:
    "This sample shows what a well-built portfolio can look like for an investor in Bangladesh. Seven large, established companies are spread across telecom, medicine, consumer goods, paints and banking. No single share dominates, and no single sector decides the outcome. The buy prices are close to fair value, so the check finds strong companies bought at sensible prices.",
  narrativeBn:
    "এই নমুনাটি দেখায়, বাংলাদেশের একজন বিনিয়োগকারীর জন্য একটি ভালোভাবে সাজানো পোর্টফোলিও কেমন হতে পারে। সাতটি বড়, প্রতিষ্ঠিত কোম্পানি টেলিকম, ওষুধ, ভোগ্যপণ্য, রং আর ব্যাংক সেক্টরে ছড়ানো। কোনো একটি শেয়ার বা সেক্টর একাই ফল ঠিক করে না। কেনার দাম ন্যায্য দামের কাছাকাছি, তাই যাচাইয়ে দেখা যায় শক্তিশালী কোম্পানি যুক্তিসংগত দামে কেনা হয়েছে।",
  holdings: [
    { trading_code: "GP",         qty: 80,  buy_price: 280 },  // Telecom
    { trading_code: "SQURPHARMA", qty: 60,  buy_price: 200 },  // Pharma
    { trading_code: "BATBC",      qty: 25,  buy_price: 480 },  // FMCG (tobacco)
    { trading_code: "BERGERPBL",  qty: 12,  buy_price: 1700 }, // Paints / chemicals
    { trading_code: "MARICO",     qty: 30,  buy_price: 2200 }, // FMCG (consumer)
    { trading_code: "BRACBANK",   qty: 200, buy_price: 38 },   // Bank
    { trading_code: "RENATA",     qty: 8,   buy_price: 950 },  // Pharma (specialty)
  ],
};

// Risky — single concentrated holding in a mid-tier stock, bought significantly above
// recent LTP. The single-holding count alone forces a critical concentration warning;
// the high entry price feeds the "paid too much" entry classifier when LTP is below the
// buy_price, which it almost always will be for a mid-tier name purchased at a peak.
const RISKY: SamplePortfolio = {
  slug: "risky",
  name: "Risky DSE portfolio",
  nameBn: "ঝুঁকিপূর্ণ ডিএসই পোর্টফোলিও",
  tagline: "Everything in one average company, bought near its peak price.",
  taglineBn: "সব টাকা একটি মাঝারি কোম্পানিতে, সর্বোচ্চ দামের কাছাকাছি কেনা।",
  narrative:
    "This sample shows a common mistake: putting almost all the money into one average company, at a price near its recent high. Nothing else holds the portfolio up, and the buy price leaves little room to gain. The check reads it as it should: everything in one place, and easily hurt by a single bad quarter.",
  narrativeBn:
    "এই নমুনাটি একটি সাধারণ ভুল দেখায়: প্রায় সব টাকা একটি মাঝারি কোম্পানিতে, সাম্প্রতিক সর্বোচ্চ দামের কাছাকাছি রাখা। পোর্টফোলিওকে ধরে রাখার মতো আর কিছু নেই, আর কেনার দামে লাভের সুযোগও কম। যাচাইয়েও তা-ই দেখা যায়: সব টাকা এক জায়গায়, আর একটি খারাপ প্রান্তিকেই বড় ক্ষতির ঝুঁকি।",
  holdings: [
    { trading_code: "BEACONPHAR", qty: 1500, buy_price: 380 }, // Mid-tier pharma, intentionally inflated entry
  ],
};

export const SAMPLE_PORTFOLIOS: Record<SampleSlug, SamplePortfolio> = {
  diversified: DIVERSIFIED,
  risky: RISKY,
};

export const SAMPLE_SLUGS: SampleSlug[] = ["diversified", "risky"];

export function getSamplePortfolio(slug: string): SamplePortfolio | null {
  return slug === "diversified" || slug === "risky" ? SAMPLE_PORTFOLIOS[slug] : null;
}
