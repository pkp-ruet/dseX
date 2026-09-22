import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import ChatSurface from "@/components/assistant/ChatSurface";
import { PERSONA } from "@/lib/assistant/persona";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const metadata: Metadata = {
  title: "Stock Chat Assistant — Ask About DSE Stocks",
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
      <div className="page-narrow space-y-5">
        <PageHeader
          eyebrow="TopStock AI"
          title={<>Ask {PERSONA.name} about DSE stocks</>}
          bn="শেয়ার নিয়ে যে কোনো প্রশ্ন সহজ ভাষায় করুন — উত্তর পাবেন সঙ্গে সঙ্গে।"
          lead="Your free stock helper. Get suggestions that fit you, see how the market is doing today, or ask a quick question about any share — just tap a button or type."
        />

        <ChatSurface variant="page" />

        <p className="text-center text-xs leading-relaxed text-text-muted">
          Ideas for learning, not financial advice. Always do your own research.{" "}
          <Link href="/dsestockranking" className="text-primary hover:underline">
            See the full rankings
          </Link>
          .
        </p>
      </div>
    </>
  );
}
