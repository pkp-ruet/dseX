import type { MetadataRoute } from "next";
import { getAllCodes } from "@/lib/api";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://dsex.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const codes = await getAllCodes().catch(() => [] as string[]);

  const stockPages = codes.map((code) => ({
    url: `${BASE_URL}/stock/${code}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1.0,
    },
    ...stockPages,
  ];
}
