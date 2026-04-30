import type { Metadata } from "next";
import LoginForm from "./LoginForm";

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const metadata: Metadata = {
  title: "Sign In — TopStockBD",
  description:
    "Sign in to your TopStockBD account to sync your DSE watchlist across all your devices.",
  alternates: { canonical: `${BASE_URL}/login` },
  robots: { index: false, follow: false },
  openGraph: {
    title: "Sign In — TopStockBD",
    description:
      "Sign in to sync your DSE stock watchlist across devices.",
    url: `${BASE_URL}/login`,
    type: "website",
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Sign In — TopStockBD",
  url: `${BASE_URL}/login`,
  description: "Sign in to your TopStockBD account.",
};

export default function LoginPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <LoginForm />
    </>
  );
}
