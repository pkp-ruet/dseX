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
        ],
      },
    ];
  },
};

export default nextConfig;
