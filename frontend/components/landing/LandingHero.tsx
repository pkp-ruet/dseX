"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import Bn from "@/components/i18n/Bn";
import Button from "@/components/ui/Button";
import MiniReport from "@/components/landing/MiniReport";
import StockLookup from "@/components/landing/StockLookup";
import type { LandingStock } from "@/lib/landing";

/**
 * Block 1 — the hero.
 *
 * The claim and its proof sit side by side: a plain English promise with its
 * Bengali explanation on the left, and on the right a real report for a company
 * the visitor recognises, already on screen before they do anything. Typing a
 * different name swaps the card on the same keystroke. No quiz, no signup wall —
 * the page's first move is to answer a question, not ask one.
 */
export default function LandingHero({
  stocks,
  initialCode,
  totalCount,
}: {
  stocks: LandingStock[];
  initialCode: string | null;
  totalCount: number;
}) {
  const { isLoggedIn, user } = useAuth();
  const [code, setCode] = useState(initialCode);

  const byCode = useMemo(() => new Map(stocks.map((s) => [s.code, s])), [stocks]);
  const stock = code ? byCode.get(code) ?? null : null;

  return (
    <section className="relative pt-6 sm:pt-10">
      {/* Soft colour wash behind the first screen */}
      <div aria-hidden className="hero-glow" />

      <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[1fr_minmax(0,26rem)] md:gap-12">
        {/* Left — the promise */}
        <div className="flex flex-col">
          <span
            className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--surface)] px-3 py-1.5 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] shadow-sm"
            style={{ border: "1px solid color-mix(in srgb, var(--positive) 28%, var(--border))" }}
          >
            <span className="live-dot" aria-hidden />
            <span style={{ color: "var(--positive)" }}>Updated every trading day</span>
          </span>

          <h1 className="font-display mt-5 text-[clamp(2rem,6.5vw,3.1rem)] font-bold leading-[1.08] tracking-tight text-[var(--text)]">
            See{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(100deg, var(--primary), var(--info) 85%)" }}
            >
              the real numbers
            </span>{" "}
            before you buy.
          </h1>
          <Bn className="mt-3.5 max-w-xl text-[1.05rem] font-semibold leading-relaxed text-[var(--text)]">
            কোন শেয়ার ভালো, কোনটা নয় — কোম্পানির নিজের হিসাব দেখে বুঝে নিন।
          </Bn>

          <p className="mt-4 max-w-xl text-[0.92rem] leading-relaxed text-[var(--text-muted)]">
            No tips, no rumours. Every score is built from what {totalCount} companies
            actually reported — updated each trading day, free for everyone.
          </p>
          <Bn className="mt-2 max-w-xl text-[0.9rem] leading-relaxed text-[var(--text-muted)]">
            কারও টিপস নয়, গুজব নয়। {totalCount}টি কোম্পানির প্রকাশিত হিসাব থেকে তৈরি — প্রতি
            কার্যদিবসে আপডেট, পুরোপুরি ফ্রি।
          </Bn>

          {/* The lookup is the primary action. It costs nothing and proves
              everything, so it comes before any ask. */}
          <div className="mt-7">
            <StockLookup stocks={stocks} selected={code} onSelect={setCode} />
          </div>

          {isLoggedIn ? (
            <div className="mt-7 flex flex-col gap-3">
              <p className="text-[0.85rem] font-semibold text-[var(--text)]">
                Welcome back{user?.display_name ? `, ${user.display_name}` : ""}.
              </p>
              <div className="flex flex-wrap gap-2.5">
                <Button href="/portfolio" variant="primary" size="sm">
                  My portfolio
                </Button>
                <Button href="/watchlist" variant="ghost" size="sm">
                  My watchlist
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-3">
              <Button href="/dsestockranking" variant="primary">
                See every company ranked
              </Button>
              <Link
                href="/register"
                className="text-[0.85rem] font-bold text-[var(--primary-ink)] underline-offset-4 hover:underline"
              >
                Open a free account
              </Link>
            </div>
          )}
        </div>

        {/* Right — the proof */}
        <div className="w-full">
          {stock ? (
            <MiniReport stock={stock} />
          ) : (
            <div className="soft-card flex min-h-[18rem] items-center justify-center p-6 text-center">
              <p className="text-[0.85rem] text-[var(--text-muted)]">
                Today&apos;s data is loading — one moment.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
