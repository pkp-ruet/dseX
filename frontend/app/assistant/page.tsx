import type { Metadata } from "next";
import Link from "next/link";
import ChatSurface from "@/components/assistant/ChatSurface";
import { PERSONA } from "@/lib/assistant/persona";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const metadata: Metadata = {
  title: "Stock Chat Assistant — Ask About DSE Stocks | TopStockBD",
  description:
    "Chat with TopStock AI, a free DSE stock helper. Get stock suggestions, today's market update, top gainers and losers, and quick answers about any Dhaka Stock Exchange share — no sign-up needed.",
  keywords: [
    "DSE stock screener",
    "stock chatbot Bangladesh",
    "DSE stock assistant",
    "which DSE stock to buy",
    "Dhaka Stock Exchange helper",
    "DSE market update today",
    "best dividend stocks Bangladesh",
    "ask about DSE stocks",
  ],
  alternates: { canonical: "/assistant" },
  openGraph: {
    title: "Stock Chat Assistant — Ask About DSE Stocks",
    description:
      "Chat with TopStock AI for DSE stock suggestions, market updates, and quick answers about any share.",
    url: "/assistant",
    type: "website",
  },
};

export default function AssistantPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${BASE_URL}/assistant`,
        url: `${BASE_URL}/assistant`,
        name: "Stock Chat Assistant — Ask About DSE Stocks",
        description:
          "Chat with TopStock AI for DSE stock suggestions, today's market update, and quick answers about any Dhaka Stock Exchange share.",
        inLanguage: "en",
        isPartOf: { "@id": BASE_URL },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Stock Assistant", item: `${BASE_URL}/assistant` },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="mx-auto max-w-xl px-4 py-6 sm:py-10 space-y-5">
        <header className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text)]">
            Ask {PERSONA.name} about DSE stocks
          </h1>
          <p className="text-sm sm:text-base leading-relaxed text-[var(--text-muted)]">
            Your free stock helper. Get suggestions that fit you, see how the market is doing
            today, or ask a quick question about any share — just tap a button or type.
          </p>
        </header>

        <ChatSurface variant="page" />

        <p className="text-center text-[0.72rem] leading-relaxed text-[var(--text-muted)]">
          Ideas for learning, not financial advice. Always do your own research.{" "}
          <Link href="/dsestockranking" className="text-[var(--primary)] hover:underline">
            See the full rankings
          </Link>
          .
        </p>
      </main>
    </>
  );
}
