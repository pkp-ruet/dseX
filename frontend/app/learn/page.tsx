import type { Metadata } from "next";
import LearnHub from "@/components/learn/LearnHub";

const DESCRIPTION =
  "Free lessons in plain words on investing in the Dhaka Stock Exchange: open a BO account, choose a broker, buy your first share, then learn to judge a company.";

export const metadata: Metadata = {
  title: "Learn the Share Market, Step by Step",
  description: DESCRIPTION,
  keywords: [
    "how to invest in Bangladesh stock market",
    "DSE beginner guide",
    "Dhaka Stock Exchange for beginners",
    "how to open BO account Bangladesh",
    "how to buy shares in Bangladesh",
    "stock market basics Bangladesh",
    "share market lessons Bangladesh",
  ],
  alternates: { canonical: "/learn", languages: { en: "/learn", bn: "/blog", "x-default": "/learn" } },
  openGraph: {
    title: "Learn the Share Market, Step by Step — TopStockBD",
    description: DESCRIPTION,
    url: "/learn",
    type: "website",
  },
};

export default function LearnPage() {
  return <LearnHub lang="en" />;
}
