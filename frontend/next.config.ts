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
