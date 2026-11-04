// Curated sample portfolios shown on the homepage and at /sample-portfolio/[slug].
// Chosen to produce a stable contrast between a well-built (Grade A/B) and a
// risky (Grade D/F) portfolio when run through analyzePortfolio() against live
// scores. Re-tune these picks if a holding's group shifts and the contrast weakens.

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

// Diversified — 7 well-known DSE companies in 7 different businesses, about
// ৳20,000 in each at the 4 Nov 2026 close, bought 5–10% below that price.
// Re-tune when a holding's group or price drifts far enough that one share
// passes ~25% of the money or a company stops being mostly strong (the
// 2026-11-02 set had MARICO at 45% of the money even at its buy prices).
const DIVERSIFIED: SamplePortfolio = {
  slug: "diversified",
  name: "Diversified DSE portfolio",
  nameBn: "ছড়ানো ডিএসই পোর্টফোলিও",
  tagline: "Spread across 7 businesses, with strong, well-known DSE companies.",
  taglineBn: "7টি ব্যবসায় ছড়ানো, পরিচিত ও শক্তিশালী ডিএসই কোম্পানি নিয়ে।",
  narrative:
    "This sample shows what a well-built portfolio can look like for an investor in Bangladesh. Seven large, established companies are spread across telecom, medicine, banking, food, engineering, cement and paints, with about the same money in each. No single share dominates, and no single business decides the outcome. The buy prices are a little below today's, so the check finds strong companies bought at sensible prices.",
  narrativeBn:
    "এই নমুনাটি দেখায়, বাংলাদেশের একজন বিনিয়োগকারীর জন্য একটি ভালোভাবে সাজানো পোর্টফোলিও কেমন হতে পারে। সাতটি বড়, প্রতিষ্ঠিত কোম্পানি টেলিকম, ওষুধ, ব্যাংক, খাদ্য, প্রকৌশল, সিমেন্ট আর রং ব্যবসায় ছড়ানো, প্রতিটিতে প্রায় সমান টাকা। কোনো একটি শেয়ার বা ব্যবসা একাই ফল ঠিক করে না। কেনার দাম আজকের দামের চেয়ে একটু কম, তাই যাচাইয়ে দেখা যায় শক্তিশালী কোম্পানি যুক্তিসংগত দামে কেনা হয়েছে।",
  holdings: [
    { trading_code: "GP",         qty: 87,  buy_price: 215 },  // Telecom
    { trading_code: "SQURPHARMA", qty: 92,  buy_price: 205 },  // Medicine
    { trading_code: "BRACBANK",   qty: 300, buy_price: 58 },   // Bank
    { trading_code: "OLYMPIC",    qty: 146, buy_price: 130 },  // Food
    { trading_code: "WALTONHIL",  qty: 63,  buy_price: 300 },  // Engineering
    { trading_code: "LHB",        qty: 420, buy_price: 45 },   // Cement
    { trading_code: "BERGERPBL",  qty: 14,  buy_price: 1380 }, // Paints (DSE "Miscellaneous")
  ],
};

// Risky — everything in one company, bought well above today's price. The
// single holding alone forces the concentration warning, whatever the
// company's group; the narrative doesn't name its group, which moves.
const RISKY: SamplePortfolio = {
  slug: "risky",
  name: "Risky DSE portfolio",
  nameBn: "ঝুঁকিপূর্ণ ডিএসই পোর্টফোলিও",
  tagline: "Everything in one company, bought well above today's price.",
  taglineBn: "সব টাকা একটি কোম্পানিতে, আজকের দামের চেয়ে অনেক বেশি দামে কেনা।",
  narrative:
    "This sample shows a common mistake: putting all the money into one company, at a price well above where it trades today. Nothing else holds the portfolio up, and one company's bad news moves everything. The check reads it as it should: everything in one place, and easily hurt by a single bad quarter.",
  narrativeBn:
    "এই নমুনাটি একটি সাধারণ ভুল দেখায়: সব টাকা একটি কোম্পানিতে, আজকের দামের চেয়ে অনেক বেশি দামে রাখা। পোর্টফোলিওকে ধরে রাখার মতো আর কিছু নেই, আর এক কোম্পানির খারাপ খবরেই সব নড়ে যায়। যাচাইয়েও তা-ই দেখা যায়: সব টাকা এক জায়গায়, আর একটি খারাপ প্রান্তিকেই বড় ক্ষতির ঝুঁকি।",
  holdings: [
    { trading_code: "BEACONPHAR", qty: 1500, buy_price: 125 }, // bought well above today's ~৳89
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
