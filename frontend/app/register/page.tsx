import type { Metadata } from "next";
import RegisterForm from "./RegisterForm";

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const metadata: Metadata = {
  title: "Create Account — TopStockBD",
  description:
    "Create a free TopStockBD account to sync your DSE stock watchlist across all your devices.",
  alternates: { canonical: `${BASE_URL}/register` },
  robots: { index: false, follow: false },
  openGraph: {
    title: "Create Account — TopStockBD",
    description:
      "Create a free account to sync your DSE watchlist across devices.",
    url: `${BASE_URL}/register`,
    type: "website",
  },
};

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Create Account — TopStockBD",
  url: `${BASE_URL}/register`,
  description: "Create a free TopStockBD account.",
};

export default function RegisterPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <RegisterForm />
    </>
  );
}
