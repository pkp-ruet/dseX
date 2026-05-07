// Curated sample portfolios shown on the homepage and at /sample-portfolio/[slug].
// Tickers are chosen to produce a stable contrast between an Excellent (Grade A/B) and
// a Very Risky (Grade D/F) portfolio when run through analyzePortfolio() against live
// scores. Re-tune these picks if a holding's tier shifts and the contrast weakens.

export type SampleSlug = "diversified" | "risky";

export interface SamplePortfolio {
  slug: SampleSlug;
  name: string;
  tagline: string;
  narrative: string;
  holdings: { trading_code: string; qty: number; buy_price: number }[];
}

// Diversified — 7 well-known DSE blue chips across 6 different sectors.
// Buy prices are illustrative; chosen to land in "fair" / "good" entry territory
// against typical recent LTPs, so the entry-price analysis stays positive even as
// prices drift.
const DIVERSIFIED: SamplePortfolio = {
  slug: "diversified",
  name: "Diversified DSE Portfolio",
  tagline: "Spread across 6 sectors with strong-rated DSE blue chips.",
  narrative:
    "This sample portfolio demonstrates what a well-built holding looks like for a Bangladeshi retail investor. Seven blue-chip companies are spread across telecom, pharma, FMCG, paints, banking, and consumer goods — no single stock dominates and no single sector controls the outcome. Buy prices were placed close to fair value, so the analysis flags a healthy mix of strong companies and reasonable entry points.",
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
  name: "Risky DSE Portfolio",
  tagline: "Everything in one mid-tier stock, bought at the peak.",
  narrative:
    "This sample portfolio mirrors a common Bangladeshi retail mistake: putting almost everything into a single mid-tier stock at a price near its recent peak. There's no diversification, no fallback, and the entry price leaves little room for upside. The analyzer reads this exactly the way it should — concentrated, fragile, and vulnerable to a single bad quarter.",
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
