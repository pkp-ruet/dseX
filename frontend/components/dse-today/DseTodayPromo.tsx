import Link from "next/link";
import { T } from "@/components/i18n/T";

/**
 * Promo banner at the top of /dse-today that points readers to the fuller,
 * plain-words /market-analysis page. The whole banner is one clickable link.
 */
export default function DseTodayPromo() {
  return (
    <Link
      href="/market-analysis"
      className="group block mb-6 overflow-hidden rounded-2xl border transition hover:shadow-soft"
      style={{
        borderColor: "color-mix(in srgb, var(--primary) 28%, var(--border))",
        background:
          "linear-gradient(100deg, color-mix(in srgb, var(--primary) 10%, var(--surface)) 0%, var(--surface) 62%)",
      }}
    >
      <div className="flex items-center gap-3 p-4 sm:gap-4 sm:p-5">
        {/* Icon badge — a chart trending up */}
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm sm:h-12 sm:w-12"
          style={{ background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-soft) 100%)" }}
          aria-hidden="true"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 3v18h18" />
            <path d="m19 9-5 5-4-4-3 3" />
          </svg>
        </span>

        {/* Copy */}
        <div className="min-w-0 flex-1">
          <span
            className="text-xs font-semibold text-primary-ink"
          >
            <T en="The bigger picture" bn="পুরো চিত্র" />
          </span>
          <p className="mt-0.5 text-sm font-bold leading-snug text-text-main sm:text-base">
            <T en="Is the market up or down, cheap or expensive?" bn="বাজার বাড়ছে না কমছে, দাম কম না বেশি?" />
          </p>
          <p className="mt-0.5 hidden text-sm leading-snug text-text-muted sm:block">
            <T
              en="See where to look for good shares today, explained in plain words."
              bn="আজ ভালো শেয়ার কোথায় খুঁজবেন, সহজ ভাষায় দেখুন।"
            />
          </p>
        </div>

        {/* CTA */}
        <span
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-extrabold text-white transition-all group-hover:gap-2.5 sm:px-4 sm:text-sm"
          style={{ background: "var(--primary)" }}
        >
          <span className="hidden sm:inline">
            <T en="Market analysis" bn="বাজার বিশ্লেষণ" />
          </span>
          <span className="sm:hidden">
            <T en="Open" bn="খুলুন" />
          </span>
          <span aria-hidden="true">→</span>
        </span>
      </div>
    </Link>
  );
}
