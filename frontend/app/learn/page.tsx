import type { Metadata } from "next";
import Link from "next/link";
import { GUIDES } from "@/lib/guides";

export const metadata: Metadata = {
  title: "Beginner's Guide to Stock Market — TopStockBD",
  description:
    "Everything you need to start investing in the Dhaka Stock Exchange — from opening a BO account to understanding fundamental analysis.",
  keywords: [
    "how to invest in Bangladesh stock market",
    "DSE beginner guide",
    "Dhaka Stock Exchange for beginners",
    "how to open BO account Bangladesh",
    "how to buy shares in Bangladesh",
    "stock market basics Bangladesh",
    "fundamental analysis DSE",
  ],
  alternates: { canonical: "/learn" },
  openGraph: {
    title: "Beginner's Guide to Stock Market — TopStockBD",
    description:
      "Everything you need to start investing in the Dhaka Stock Exchange — from opening a BO account to understanding fundamental analysis.",
    url: "/learn",
    type: "website",
  },
};

export default function LearnPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12 space-y-12">

      {/* Hero */}
      <section className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-[var(--ink)]">
          Beginner&apos;s Guide to Stock Market
        </h1>
        <p className="text-[var(--ink-muted)] text-base leading-relaxed max-w-xl mx-auto">
          New to investing in Bangladesh? Start here. These guides cover everything from
          opening your first account to reading financial statements.
        </p>
      </section>

      {/* Guide cards grid */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {GUIDES.map((guide) => (
            <Link
              key={guide.slug}
              href={`/learn/${guide.slug}`}
              className="group flex flex-col gap-3 p-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--primary)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{guide.icon}</span>
                <span className="text-xs text-[var(--ink-muted)]">{guide.readTime}</span>
              </div>
              <div>
                <h2 className="font-semibold text-[var(--ink)] text-base leading-snug group-hover:text-[var(--primary)] transition-colors">
                  {guide.title}
                </h2>
                <p className="mt-1.5 text-sm text-[var(--ink-muted)] leading-relaxed">
                  {guide.description}
                </p>
              </div>
              <span className="mt-auto text-xs font-medium text-[var(--primary)] group-hover:underline">
                Read guide →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer note */}
      <section className="text-center space-y-4 pt-2">
        <p className="text-[var(--ink-muted)] text-sm">
          Ready to put your knowledge to work?
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/dsestockranking"
            className="px-5 py-2.5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            View Score Leaderboard
          </Link>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-lg border border-[var(--border)] text-[var(--ink)] text-sm font-medium hover:bg-[var(--surface)] transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </section>

    </main>
  );
}
