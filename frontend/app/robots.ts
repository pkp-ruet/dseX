import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: "AhrefsBot", crawlDelay: 10 },
      { userAgent: "SemrushBot", crawlDelay: 10 },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
