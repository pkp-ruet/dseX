import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: false,
  env: {
    API_URL: process.env.API_URL || "https://dsex.onrender.com",
  },
  async headers() {
    // Deterministic, non-personalized machine routes — identical for every
    // visitor and change at most once/day. Let CDNs (Cloudflare/Vercel) cache
    // them so crawler/bot hits don't keep reaching the origin.
    const CDN_DAILY = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
      {
        source: "/sitemap.xml",
        headers: [{ key: "Cache-Control", value: CDN_DAILY }],
      },
      {
        source: "/robots.txt",
        headers: [{ key: "Cache-Control", value: CDN_DAILY }],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/dse-top-20",
        destination: "/dse-trending-stocks",
        permanent: true,
      },
      // Every stock list is gone: twelve retired 2026-10-24, then the four free
      // rankings and the six research lists on 2026-11-05 (user decision, the
      // hub became Premium research). Each old URL goes to the closest page
      // left: a screener ready-made screen, a sector, the ranking or the hub.
      ...([
        ["top-stocks-bangladesh-2025", "/screener?ready=biggest"],
        ["largest-companies-dse", "/screener?ready=biggest"],
        ["top-dividend-stocks-bangladesh", "/screener?ready=high_dividend"],
        ["most-traded-stocks-dse", "/screener?ready=most_traded"],
        ["top-performing-stocks-dse", "/screener?sort=ret_1y&dir=desc"],
        ["dividend-cash-machines-dse", "/screener?ready=a_payers"],
        ["cheap-quality-stocks-dse", "/screener?ready=low_pe"],
        ["profits-rising-stocks-dse", "/screener?ready=profit_up"],
        ["debt-free-growth-stocks-dse", "/screener?ready=no_loans"],
        ["fallen-strong-stocks-dse", "/screener?ready=near_low"],
        ["sponsors-buying-stocks-dse", "/stock-insights"],
        ["highest-eps-stocks-bangladesh", "/stock-insights"],
        ["most-profitable-companies-bangladesh", "/screener?ready=biggest"],
        ["best-growth-stocks-bangladesh", "/screener?ready=profit_up"],
        ["high-growth-stocks-2026", "/screener?ready=profit_up"],
        ["undervalued-stocks-2026", "/screener?ready=low_pe"],
        ["best-bank-stocks-bangladesh", "/sector/bank"],
        ["best-bank-stocks-2026", "/sector/bank"],
        ["best-pharma-stocks-bangladesh", "/sector/pharmaceuticals-and-chemicals"],
        ["best-dse-stocks-2026", "/dsestockranking"],
        ["best-stocks-this-month", "/dsestockranking"],
        ["best-sector-this-month", "/sectors"],
      ] as const).flatMap(([slug, destination]) => [
        { source: `/stock-insights/${slug}`, destination, permanent: true },
        { source: `/stock-lists/${slug}`, destination, permanent: true },
      ]),
      // Merged 2026-10-25: five "what should I buy?" pages became Buy signals
      // (tips folded in) + the Trending / Popular / Find-my-stocks tabs, and
      // Market Intelligence's condition tables overlapped /market-analysis.
      { source: "/top-picks", destination: "/dsestockranking", permanent: true },
      { source: "/daily-tips", destination: "/dsestockranking", permanent: true },
      // Hidden 2026-11-01 (user decision): Buy / Sell signals now live only
      // inside the stock report and the portfolio's Premium sections. The page
      // code stays; a temporary redirect keeps it out of reach until it returns.
      { source: "/buy-sell-signals", destination: "/dsestockranking", permanent: false },
      // One market page (2026-11-05): DSE today, Market analysis and the
      // Bengali daily page (/share-bazar) merged into /dse-today, "Market today".
      { source: "/market-analysis", destination: "/dse-today", permanent: true },
      { source: "/share-bazar", destination: "/dse-today", permanent: true },
      { source: "/market-intelligence", destination: "/dse-today", permanent: true },
      // The in-depth analysis sub-page folded into the stock report as its
      // analyst note (2026-10-28); since 2026-11-05 (the note's data-room tab
      // was removed) it lands on our analysis.
      { source: "/stock/:code/analysis", destination: "/stock/:code#ch-analysis", permanent: true },
      // The quiz gave way to the screener's goal starts and the list builder
      // became its Saved tab (2026-10-26). The incoming query rides along, so a
      // saved-list push's ?list= still opens it.
      { source: "/stock-recommendation", destination: "/screener", permanent: true },
      { source: "/my-lists", destination: "/screener?tab=saved", permanent: true },
      {
        source: "/stock-lists",
        destination: "/stock-insights",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
