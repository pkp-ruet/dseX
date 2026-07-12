import Link from "next/link";
import Reveal from "@/components/ui/Reveal";

/**
 * Plain-language "how it works" — three jargon-free steps, English + Bengali.
 * Server component: all copy is in the SSR HTML (SEO). Each card reveals with a
 * staggered rise via <Reveal> (client wrapper); under reduced-motion they simply
 * fade in. This section self-reveals, so it is NOT wrapped again at the page level.
 */

const STEPS = [
  {
    n: 1,
    title: "Search any stock",
    en: "Type any company name or trading code — every DSE stock is covered.",
    bn: "যেকোনো কোম্পানির নাম বা কোড লিখুন — সব শেয়ার এখানে আছে।",
    color: "var(--primary)",
    icon: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
  },
  {
    n: 2,
    title: "See its grade + plain verdict",
    en: "Get a 0–100 score, an easy A–D grade, and a clear Buy or Sell — in plain words.",
    bn: "০–১০০ স্কোর, সহজ গ্রেড আর পরিষ্কার সিদ্ধান্ত — সহজ বাংলায়।",
    color: "var(--positive)",
    icon: (
      <>
        <path d="M12 3a9 9 0 1 0 9 9" />
        <path d="M12 12l5-5" />
      </>
    ),
  },
  {
    n: 3,
    title: "Track it & get pinged",
    en: "Save it to your watchlist, track your profit, and we'll ping you the day it hits your price.",
    bn: "ওয়াচলিস্টে সেভ করুন, লাভ-ক্ষতি দেখুন — দাম ছুঁলে আমরা জানিয়ে দেব।",
    color: "var(--warm)",
    icon: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </>
    ),
  },
];

export default function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works-title">
      <Reveal>
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] px-3.5 py-1 text-[0.7rem] font-extrabold uppercase tracking-[0.14em] text-[var(--primary-ink)]">
            How it works
          </span>
          <h2
            id="how-it-works-title"
            className="font-display mt-3 text-[clamp(1.6rem,4.5vw,2.4rem)] font-bold tracking-tight text-[var(--text)]"
          >
            Understand any stock in three simple steps
          </h2>
          <p className="mt-2.5 text-[0.95rem] text-[var(--text-muted)]">
            No finance background needed. If you can search, you can invest smarter.
          </p>
        </div>
      </Reveal>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {STEPS.map((s, i) => (
          <Reveal
            key={s.n}
            delay={i * 0.1}
            className="soft-card hover-lift relative flex flex-col p-5 sm:p-6"
          >
            {/* top accent */}
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-1 rounded-t-[var(--radius-lg)]"
              style={{ background: `linear-gradient(90deg, ${s.color}, transparent)` }}
            />
            <div className="flex items-center gap-3">
              <span
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-sm"
                style={{ background: `linear-gradient(135deg, ${s.color}, color-mix(in srgb, ${s.color} 72%, #000))` }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  {s.icon}
                </svg>
              </span>
              <span
                className="font-display text-2xl font-bold tabular-nums"
                style={{ color: `color-mix(in srgb, ${s.color} 55%, var(--text-muted))` }}
              >
                0{s.n}
              </span>
            </div>

            <h3 className="mt-4 text-lg font-extrabold text-[var(--text)] leading-snug">{s.title}</h3>
            <p className="mt-1.5 text-[0.9rem] leading-relaxed text-[var(--text-muted)]">{s.en}</p>
            <p lang="bn" className="font-bn mt-2 text-[0.9rem] leading-relaxed text-[var(--text)]">
              {s.bn}
            </p>
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-6 text-center">
        <Link
          href="/dsestockranking"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--primary)] hover:underline underline-offset-2"
        >
          See how every DSE stock ranks →
        </Link>
      </Reveal>
    </section>
  );
}
