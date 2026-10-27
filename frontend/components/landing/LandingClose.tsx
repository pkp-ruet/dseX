"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { T } from "@/components/i18n/T";
import Button from "@/components/ui/Button";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import type { AuthApiResponse, Testimonial } from "@/lib/api";
import { loadWatchlist } from "@/lib/watchlist";

/**
 * Block 8b — the close.
 *
 * Real reviews, then one ask. The quotes come from the feedback an admin has
 * approved for publication (`featured` in the feedback collection) — never
 * straight from whatever a visitor last typed into the homepage form. When
 * nothing is approved yet the section simply renders the ask, which is the right
 * failure mode: an empty testimonial rail is better than an invented one.
 */

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${n} / 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill={i <= n ? "var(--gold)" : "none"}
          stroke={i <= n ? "var(--gold)" : "var(--border)"}
          strokeWidth="1.8"
          aria-hidden
        >
          <path
            d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.1 6.47L12 17.4l-5.8 3.05 1.1-6.47-4.7-4.58 6.5-.95z"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  );
}

export default function LandingClose({ testimonials }: { testimonials: Testimonial[] }) {
  const router = useRouter();
  const { isLoggedIn, login } = useAuth();
  const [googleError, setGoogleError] = useState("");
  const quotes = testimonials.slice(0, 3);

  async function handleGoogleSuccess(data: AuthApiResponse) {
    login(data.access_token, data.user);
    await loadWatchlist().catch(() => {});
    router.refresh();
  }

  return (
    <section aria-labelledby="close-title">
      {quotes.length > 0 && (
        <div className="mb-12">
          <p className="text-sm font-semibold text-text-muted">
            <T en="What our readers say" bn="পাঠকেরা যা বলছেন" />
          </p>
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {quotes.map((q, i) => (
              <li
                key={`${q.name ?? "user"}-${i}`}
                className="acc-card flex flex-col p-4"
              >
                {q.rating != null && <Stars n={q.rating} />}
                <p className="mt-2.5 flex-1 text-sm leading-relaxed text-text-main">
                  {q.comment}
                </p>
                <p className="mt-3 text-xs font-semibold text-text-muted">
                  {q.name ?? <T en="A reader" bn="একজন পাঠক" />}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="soft-card relative overflow-hidden px-5 py-10 text-center sm:px-10 sm:py-14">
        <h2
          id="close-title"
          className="font-display text-[clamp(1.6rem,5.2vw,2.5rem)] font-bold leading-[1.1] tracking-tight text-text-main"
        >
          <T en="Check before your next buy." bn="পরের শেয়ার কেনার আগে একবার দেখে নিন।" />
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-text-muted">
          <T
            en="No payment and no card are needed. You can read every score and ranking without an account."
            bn="কোনো টাকা বা কার্ড লাগে না। অ্যাকাউন্ট না খুলেও সব স্কোর আর র‍্যাঙ্কিং দেখতে পারবেন।"
          />
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          {isLoggedIn ? (
            <>
              <Button href="/portfolio" variant="primary">
                <T en="My portfolio" bn="আমার পোর্টফোলিও" />
              </Button>
              <Button href="/dsestockranking" variant="quiet">
                <T en="See the rankings" bn="র‍্যাঙ্কিং দেখুন" />
              </Button>
            </>
          ) : (
            <>
              <Button href="/register" variant="primary">
                <T en="Open a free account" bn="ফ্রি অ্যাকাউন্ট খুলুন" />
              </Button>
              <div className="[color-scheme:light]">
                <GoogleSignInButton onSuccess={handleGoogleSuccess} onError={setGoogleError} />
              </div>
              <Link
                href="/dsestockranking"
                className="w-full text-sm font-bold text-primary-ink underline-offset-4 hover:underline sm:w-auto"
              >
                <T en="Just look around first" bn="আগে একটু ঘুরে দেখুন" />
              </Link>
            </>
          )}
        </div>
        {googleError && !isLoggedIn && (
          <p className="mt-3 text-xs text-negative">{googleError}</p>
        )}
      </div>
    </section>
  );
}
