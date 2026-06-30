import Link from "next/link";

/**
 * Clean, single Bengali "learn" entry for the marketing homepage, shown just
 * below the hero. Consolidates the former blog-promo + find-stocks promo pills
 * into one calm resource card → /blog. Emerald accent (learning / growth).
 * Deliberately low-key (hairline border, soft-tinted icon, subtle chevron) so
 * it reads as a helpful resource, not an ad button.
 */
const BookIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const ChevronIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

export default function LearnPromoCard({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/blog"
      lang="bn"
      aria-label="বাংলা ব্লগ — সহজ ভাষায় শেয়ার মার্কেট শিখুন, ফ্রি"
      className={`font-bn group flex items-center gap-3.5 sm:gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 sm:px-5 py-3.5 transition-colors hover:bg-[var(--surface-2)] ${className}`}
    >
      <span
        className="grid place-items-center shrink-0 rounded-xl"
        style={{
          width: 40,
          height: 40,
          background: "color-mix(in srgb, var(--positive) 12%, var(--surface))",
          color: "var(--positive)",
        }}
      >
        {BookIcon}
      </span>

      <span className="flex-1 min-w-0">
        <span className="block text-[0.95rem] sm:text-[1.02rem] font-bold leading-snug tracking-tight text-[var(--text)]">
          নতুন? একদম শুরু থেকে শেয়ার মার্কেট শিখুন
        </span>
        <span className="block mt-0.5 text-[0.8rem] sm:text-[0.84rem] text-[var(--text-muted)]">
          সহজ বাংলায় ধাপে ধাপে গাইড — সম্পূর্ণ ফ্রি
        </span>
      </span>

      <span
        aria-hidden="true"
        className="shrink-0 text-[var(--text-muted)] transition-colors group-hover:text-[var(--positive)]"
      >
        {ChevronIcon}
      </span>
    </Link>
  );
}
