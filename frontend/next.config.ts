import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: false,
  env: {
    API_URL: process.env.API_URL || "https://dsex.onrender.com",
  },
  async headers() {
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
    ];
  },
  async redirects() {
    return [
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
