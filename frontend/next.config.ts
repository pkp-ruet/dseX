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
      {
        // Retired 2026-10-24: same market-cap data as largest-companies-dse, stale year in the title.
        source: "/stock-insights/top-stocks-bangladesh-2025",
        destination: "/stock-insights/largest-companies-dse",
        permanent: true,
      },
      {
        source: "/stock-lists/top-stocks-bangladesh-2025",
        destination: "/stock-insights/largest-companies-dse",
        permanent: true,
      },
      // Retired 2026-10-24: twelve overlapping lists cut to 4 free rankings + 6
      // Premium research lists. Each old URL goes to the closest page left.
      ...([
        ["highest-eps-stocks-bangladesh", "/stock-insights"],
        ["most-profitable-companies-bangladesh", "/stock-insights/largest-companies-dse"],
        ["best-growth-stocks-bangladesh", "/stock-insights/profits-rising-stocks-dse"],
        ["high-growth-stocks-2026", "/stock-insights/profits-rising-stocks-dse"],
        ["undervalued-stocks-2026", "/stock-insights/cheap-quality-stocks-dse"],
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
      { source: "/top-picks", destination: "/buy-sell-signals", permanent: true },
      { source: "/daily-tips", destination: "/buy-sell-signals", permanent: true },
      { source: "/market-intelligence", destination: "/market-analysis", permanent: true },
      {
        source: "/stock-lists/:slug*",
        destination: "/stock-insights/:slug*",
        permanent: true,
      },
      {
        source: "/stock-lists",
        destination: "/stock-insights",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
