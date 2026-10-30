import { T } from "@/components/i18n/T";
import Button from "@/components/ui/Button";
import type { Testimonial } from "@/lib/api";

/**
 * Block 7 — the close (2026-10-31): real reviews when there are any, then one
 * ask — a free account, or look up a share first. The quotes come from the feedback an admin has
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
  const quotes = testimonials.slice(0, 3);

  return (
    <section aria-labelledby="close-title">
      {quotes.length > 0 && (
        <div className="mb-14">
          <p className="text-sm font-semibold text-text-main">
            <T en="What our readers say" bn="পাঠকেরা যা বলছেন" />
          </p>
          <ul className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            {quotes.map((q, i) => (
              <li key={`${q.name ?? "user"}-${i}`} className="soft-card flex flex-col p-5">
                {q.rating != null && <Stars n={q.rating} />}
                <p className="mt-3 flex-1 text-base leading-relaxed text-text-main">{q.comment}</p>
                <p className="mt-3 text-sm font-semibold text-text-main">
                  {q.name ?? <T en="A reader" bn="একজন পাঠক" />}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="py-6 text-center sm:py-10">
        <h2 id="close-title" className="mx-auto max-w-2xl text-balance text-3xl font-bold leading-tight tracking-tight text-text-main sm:text-4xl">
          <T en="Start with one share you care about." bn="আপনার পছন্দের একটি শেয়ার দিয়ে শুরু করুন।" />
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-lg leading-relaxed text-text-main">
          <T
            en="Look it up now, or create a free account and follow it every day."
            bn="এখনই দেখে নিন, অথবা ফ্রি অ্যাকাউন্ট খুলে প্রতিদিন নজর রাখুন।"
          />
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Button href="#signup" variant="primary" size="lg">
            <T en="Create free account" bn="ফ্রি অ্যাকাউন্ট খুলুন" />
          </Button>
          <Button href="#landing-lookup" variant="quiet" size="lg">
            <T en="Check a share" bn="একটি শেয়ার দেখুন" />
          </Button>
        </div>
      </div>
    </section>
  );
}
