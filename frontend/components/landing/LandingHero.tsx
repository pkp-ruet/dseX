"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { T } from "@/components/i18n/T";
import Button from "@/components/ui/Button";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import AnswerCard from "@/components/landing/AnswerCard";
import StockLookup from "@/components/landing/StockLookup";
import type { AuthApiResponse } from "@/lib/api";
import { pickQuickCodes, shortName, type LandingStock } from "@/lib/landing";
import { looksNewlyCreated, markJustSignedUp } from "@/lib/welcome";
import { loadWatchlist } from "@/lib/watchlist";
import { bnDate } from "@/lib/bn";
import { formatDate, money } from "@/lib/formatters";

/** The next cash record date, shown as what an account brings you. */
export interface HeroDividend {
  code: string;
  cashPerShare: number;
  buyBy: string | null;
}

/** A round lot to show the cash on, so the sum reads as money, not a ratio. */
const LOT = 100;

/**
 * Block 1 — the hero (rebuilt 2026-10-31).
 *
 * Left: what the site does in one promise and one line, then the ask (a free
 * account, or Google), then — for the visitor not ready to sign up — a lookup
 * that needs no account. Right: the proof, the stock page's answer card for a
 * company they know; a chip or the lookup swaps it on the same keystroke. A
 * small card under it shows the kind of thing an account tells you (cash coming
 * from the next record date). No pricing anywhere on this page.
 */
export default function LandingHero({
  stocks,
  initialCode,
  freeCode,
  dividend,
}: {
  stocks: LandingStock[];
  initialCode: string | null;
  /** Today's free full report (lib/free-report.ts), or null when it has no score. */
  freeCode: string | null;
  dividend: HeroDividend | null;
}) {
  const router = useRouter();
  const { login } = useAuth();
  const [code, setCode] = useState(initialCode);
  const [googleError, setGoogleError] = useState("");

  async function handleGoogleSuccess(data: AuthApiResponse) {
    login(data.access_token, data.user);
    if (looksNewlyCreated(data.user)) markJustSignedUp();
    await loadWatchlist().catch(() => {});
    router.refresh();
  }

  const byCode = useMemo(() => new Map(stocks.map((s) => [s.code, s])), [stocks]);
  const stock = code ? byCode.get(code) ?? null : null;
  const quick = useMemo(() => pickQuickCodes(stocks, 4), [stocks]);
  const free = freeCode ? byCode.get(freeCode) ?? null : null;

  return (
    <section aria-labelledby="hero-title" className="pt-8 sm:pt-14">
      <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-[1fr_minmax(0,27rem)] md:gap-12">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface py-1.5 pl-2.5 pr-3.5 text-sm font-semibold text-text-main">
            <span className="live-dot" aria-hidden />
            <T en="Every DSE company, checked after every trading day" bn="প্রতিদিন বাজার বন্ধের পর ডিএসই-র প্রতিটি কোম্পানি যাচাই" />
          </p>

          <h1 id="hero-title" className="mt-6 text-balance text-4xl font-bold leading-tight tracking-tight text-text-main sm:text-5xl">
            <T en="Know what you’re buying, before you buy it." bn="কেনার আগে জেনে নিন, আসলে কী কিনছেন।" />
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-text-main">
            <T
              en="TopStockBD checks each company on the Dhaka Stock Exchange: its profit, its loans, its price and its dividends. Then it gives you one clear answer, in plain Bangla or English."
              bn="ডিএসই-র প্রতিটি কোম্পানির মুনাফা, ঋণ, দাম আর ডিভিডেন্ড আমরা যাচাই করি। তারপর সহজ বাংলা বা ইংরেজিতে একটি পরিষ্কার উত্তর দিই।"
            />
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button href="/register" variant="primary" size="lg">
              <T en="Create free account" bn="ফ্রি অ্যাকাউন্ট খুলুন" />
              <span aria-hidden>→</span>
            </Button>
            <div className="[color-scheme:light]">
              <GoogleSignInButton onSuccess={handleGoogleSuccess} onError={setGoogleError} />
            </div>
          </div>
          {googleError && <p className="form-error mt-2">{googleError}</p>}
          <p className="mt-3 text-sm text-text-main">
            <T en="A free account. No card. It takes about 30 seconds." bn="ফ্রি অ্যাকাউন্ট। কার্ড লাগবে না। লাগে প্রায় 30 সেকেন্ড।" />
          </p>

          <div className="mt-9 max-w-xl border-t border-border pt-7">
            <StockLookup
              stocks={stocks}
              selected={code}
              onSelect={setCode}
              label={<T en="Or check any share right now, no account needed" bn="অথবা এখনই যেকোনো শেয়ার দেখুন, অ্যাকাউন্ট ছাড়াই" />}
            />
            {quick.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {quick.map((s) => {
                  const on = s.code === code;
                  return (
                    <button
                      key={s.code}
                      type="button"
                      onClick={() => setCode(s.code)}
                      aria-pressed={on}
                      className={`inline-flex min-h-10 max-w-[13rem] items-center rounded-full border px-3.5 text-sm font-semibold transition-colors active:scale-95 ${
                        on
                          ? "border-text-main bg-text-main text-surface"
                          : "border-border bg-surface text-text-main hover:border-primary"
                      }`}
                    >
                      <span className="truncate">{shortName(s)}</span>
                    </button>
                  );
                })}
              </div>
            )}
            {free && (
              <Link
                href={`/stock/${free.code}`}
                className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary-ink hover:underline"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="3" y="8" width="18" height="13" rx="2" />
                  <path d="M12 8v13M3 12h18" />
                  <path d="M12 8c-2-4-6-4-6-1.5S10 8 12 8c2 0 6 1 6-1.5S14 4 12 8z" />
                </svg>
                <T en={`Free full report today: ${shortName(free)}`} bn={`আজ ফ্রি পূর্ণ রিপোর্ট: ${shortName(free)}`} />
              </Link>
            )}
          </div>
        </div>

        {/* The proof, with what an account adds tucked under its corner */}
        <div className="relative min-w-0 md:pb-12">
          {stock ? (
            <AnswerCard stock={stock} />
          ) : (
            <div className="soft-card lp-lift flex min-h-[18rem] items-center justify-center p-6 text-center">
              <p className="text-sm text-text-main">
                <T en="Today's data is loading. One moment, please." bn="আজকের তথ্য আসছে। একটু অপেক্ষা করুন।" />
              </p>
            </div>
          )}
          {dividend && (
            <div className="soft-card relative z-10 mx-4 -mt-4 flex items-center gap-3 p-3 pr-4 shadow-lift md:absolute md:-left-7 md:bottom-0 md:mx-0 md:mt-0">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold-light text-gold-ink" aria-hidden>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="6" width="18" height="12" rx="2" />
                  <circle cx="12" cy="12" r="2.5" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-text-main">
                  <T
                    en={`${LOT} ${dividend.code} shares bring you ${money(dividend.cashPerShare * LOT)}`}
                    bn={`${dividend.code}-এর ${LOT}টি শেয়ারে পাবেন ${money(dividend.cashPerShare * LOT)}`}
                  />
                </p>
                {dividend.buyBy && (
                  <p className="text-sm text-text-main">
                    <T
                      en={`Last day to buy: ${formatDate(dividend.buyBy)}`}
                      bn={`কেনার শেষ দিন: ${bnDate(dividend.buyBy) || formatDate(dividend.buyBy)}`}
                    />
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
