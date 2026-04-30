import type { Metadata } from "next";
import ProfileClient from "./ProfileClient";

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const metadata: Metadata = {
  title: "My Profile — TopStockBD",
  description: "Manage your TopStockBD account and synced DSE watchlist.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "My Profile — TopStockBD",
    description: "Manage your TopStockBD account and synced DSE watchlist.",
    url: `${BASE_URL}/profile`,
    type: "website",
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "My Profile — TopStockBD",
  url: `${BASE_URL}/profile`,
};

export default function ProfilePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <ProfileClient />
    </>
  );
}
