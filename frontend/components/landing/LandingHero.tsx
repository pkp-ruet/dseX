"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Bn from "@/components/i18n/Bn";
import Button from "@/components/ui/Button";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import MiniReport from "@/components/landing/MiniReport";
import StockLookup from "@/components/landing/StockLookup";
import type { AuthApiResponse } from "@/lib/api";
import { pickQuickCodes, shortName, type LandingStock } from "@/lib/landing";
import { loadWatchlist } from "@/lib/watchlist";

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
  const router = useRouter();
  const { isLoggedIn, user, login } = useAuth();
  const [code, setCode] = useState(initialCode);
  const [googleError, setGoogleError] = useState("");

  async function handleGoogleSuccess(data: AuthApiResponse) {
    login(data.access_token, data.user);
    await loadWatchlist().catch(() => {});
    router.refresh();
  }

  const byCode = useMemo(() => new Map(stocks.map((s) => [s.code, s])), [stocks]);
  const stock = code ? byCode.get(code) ?? null : null;
  const quick = useMemo(() => pickQuickCodes(stocks, 5), [stocks]);

  return (
    <section className="relative pt-6 sm:pt-10">
      {/* Soft colour wash behind the first screen */}
      <div aria-hidden className="hero-glow" />

      {/* Three pieces in a grid. On a phone they stack promise → card → asks,
          so the real report is on screen after one scroll instead of after
          every paragraph and button; from md: the card takes the right column
          beside both. */}
      <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[1fr_minmax(0,26rem)] md:grid-rows-[auto_1fr] md:gap-x-12 md:gap-y-7">
        {/* Left, top — the promise */}
        <div className="flex flex-col md:col-start-1 md:row-start-1">
          <span
            className="inline-flex w-fit items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] shadow-sm"
            style={{ border: "1px solid color-mix(in srgb, var(--positive) 28%, var(--border))" }}
          >
            <span className="live-dot" aria-hidden />
            <span style={{ color: "var(--positive)" }}>Updated every trading day</span>
          </span>

          <h1 className="font-display mt-5 text-[clamp(2rem,6.5vw,3.1rem)] font-bold leading-[1.08] tracking-tight text-text-main">
            See{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(100deg, var(--primary), var(--info) 85%)" }}
            >
              the real numbers
            </span>{" "}
            before you buy.
          </h1>
          <Bn className="mt-3.5 max-w-xl text-base font-semibold leading-relaxed text-text-main">
            কোন শেয়ার ভালো, কোনটা নয় — কোম্পানির নিজের হিসাব দেখে বুঝে নিন।
          </Bn>

          {/* The second pair repeats the trust strip, so phones skip it */}
          <p className="mt-4 hidden max-w-xl text-base leading-relaxed text-text-muted sm:block">
            No tips, no rumours. Every score is built from what {totalCount} companies
            actually reported — updated each trading day, free for everyone.
          </p>
          <Bn className="mt-2 hidden max-w-xl text-sm leading-relaxed text-text-muted sm:block">
            কারও টিপস নয়, গুজব নয়। {totalCount}টি কোম্পানির প্রকাশিত হিসাব থেকে তৈরি — প্রতি
            কার্যদিবসে আপডেট, পুরোপুরি ফ্রি।
          </Bn>

          {/* The lookup is the primary action. It costs nothing and proves
              everything, so it comes before any ask. */}
          <div className="mt-7">
            <StockLookup stocks={stocks} selected={code} onSelect={setCode} />
          </div>

          {/* One tap, no typing — most visitors won't type, but they will tap */}
          {quick.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-text-muted">
                Or tap one <Bn as="span">· অথবা একটায় চাপ দিন</Bn>
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {quick.map((s) => {
                  const on = s.code === code;
                  return (
                    <button
                      key={s.code}
                      type="button"
                      onClick={() => setCode(s.code)}
                      aria-pressed={on}
                      className={`inline-flex min-h-10 max-w-[13rem] items-center rounded-full border px-3.5 text-sm font-bold transition-colors active:scale-95 ${
                        on
                          ? "border-primary bg-primary text-white"
                          : "border-border bg-surface text-text-main hover:border-primary hover:text-primary-ink"
                      }`}
                    >
                      <span className="truncate">{shortName(s)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Left, bottom — the asks (below the card on a phone) */}
        <div className="md:col-start-1 md:row-start-2">
          {isLoggedIn ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-semibold text-text-main">
                Welcome back{user?.display_name ? `, ${user.display_name}` : ""}.
              </p>
              <div className="flex flex-wrap gap-2.5">
                <Button href="/portfolio" variant="primary" size="sm">
                  My portfolio
                </Button>
                <Button href="/watchlist" variant="quiet" size="sm">
                  My watchlist
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                <Button href="/dsestockranking" variant="primary">
                  See every company ranked
                </Button>
                <Link
                  href="/register"
                  className="text-sm font-bold text-primary-ink underline-offset-4 hover:underline"
                >
                  Open a free account
                </Link>
                <div className="[color-scheme:light]">
                  <GoogleSignInButton onSuccess={handleGoogleSuccess} onError={setGoogleError} />
                </div>
              </div>
              {googleError && (
                <p className="text-xs text-negative">{googleError}</p>
              )}
            </div>
          )}
        </div>

        {/* Right — the proof */}
        <div className="w-full md:col-start-2 md:row-span-2 md:row-start-1">
          {stock ? (
            <MiniReport stock={stock} />
          ) : (
            <div className="soft-card flex min-h-[18rem] items-center justify-center p-6 text-center">
              <p className="text-sm text-text-muted">
                Today&apos;s data is loading — one moment.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
