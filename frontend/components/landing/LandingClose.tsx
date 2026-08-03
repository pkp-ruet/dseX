"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Bn from "@/components/i18n/Bn";
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
    <span className="inline-flex gap-0.5" aria-label={`${n} out of 5`}>
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
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.14em]"
            style={{
              color: "var(--gold-ink)",
              background: "color-mix(in srgb, var(--gold) 15%, transparent)",
              border: "1px solid color-mix(in srgb, var(--gold) 32%, transparent)",
            }}
          >
            What users say
          </span>
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {quotes.map((q, i) => (
              <li
                key={`${q.name ?? "user"}-${i}`}
                className="acc-card acc-top flex flex-col p-4"
                style={{ "--acc": "var(--gold)" } as CSSProperties}
              >
                {q.rating != null && <Stars n={q.rating} />}
                <p className="mt-2.5 flex-1 text-[0.85rem] leading-relaxed text-[var(--text)]">
                  {q.comment}
                </p>
                <p className="mt-3 text-[0.72rem] font-semibold text-[var(--text-muted)]">
                  {q.name ?? "A user"}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        className="relative overflow-hidden rounded-[var(--radius-xl)] border px-5 py-10 text-center sm:px-10 sm:py-14"
        style={{
          borderColor: "color-mix(in srgb, var(--primary) 24%, var(--border))",
          background:
            "radial-gradient(90% 120% at 12% 0%, color-mix(in srgb, var(--primary) 13%, transparent) 0%, transparent 62%), radial-gradient(80% 110% at 92% 8%, color-mix(in srgb, var(--info) 13%, transparent) 0%, transparent 60%), var(--surface)",
        }}
      >
        {/* Gradient hairline across the top */}
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-1"
          style={{
            background:
              "linear-gradient(90deg, var(--primary), var(--gold) 45%, var(--info))",
          }}
        />
        <h2
          id="close-title"
          className="font-display text-[clamp(1.6rem,5.2vw,2.5rem)] font-bold leading-[1.1] tracking-tight text-[var(--text)]"
        >
          Check before your{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(100deg, var(--primary), var(--info) 90%)" }}
          >
            next buy.
          </span>
        </h2>
        <Bn className="font-bn mx-auto mt-3 max-w-xl text-[1rem] font-semibold leading-relaxed text-[var(--text)]">
          পরের শেয়ারটা কেনার আগে একবার দেখে নিন।
        </Bn>
        <p className="mx-auto mt-3 max-w-xl text-[0.9rem] leading-relaxed text-[var(--text-muted)]">
          No payment and no card. You can read every score and ranking without an account
          at all.
        </p>
        <Bn className="mx-auto mt-1 max-w-xl text-[0.88rem] leading-relaxed text-[var(--text-muted)]">
          কোনো টাকা লাগে না, কার্ড লাগে না। অ্যাকাউন্ট না খুলেও সব স্কোর আর র‍্যাঙ্কিং দেখতে পারবেন।
        </Bn>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          {isLoggedIn ? (
            <>
              <Button href="/portfolio" variant="primary">
                My portfolio
              </Button>
              <Button href="/dsestockranking" variant="ghost">
                See the rankings
              </Button>
            </>
          ) : (
            <>
              <Button href="/register" variant="primary">
                Open a free account
              </Button>
              <div className="[color-scheme:light]">
                <GoogleSignInButton onSuccess={handleGoogleSuccess} onError={setGoogleError} />
              </div>
              <Link
                href="/dsestockranking"
                className="w-full text-[0.88rem] font-bold text-[var(--primary-ink)] underline-offset-4 hover:underline sm:w-auto"
              >
                Just look around first
              </Link>
            </>
          )}
        </div>
        {googleError && !isLoggedIn && (
          <p className="mt-3 text-xs text-[var(--negative)]">{googleError}</p>
        )}
      </div>
    </section>
  );
}
