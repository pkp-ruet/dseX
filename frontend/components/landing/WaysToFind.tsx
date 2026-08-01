import Link from "next/link";
import type { CSSProperties } from "react";
import Bn from "@/components/i18n/Bn";
import SectionHead from "@/components/i18n/SectionHead";
import FindMyStocks from "@/components/landing/FindMyStocks";
import MotionProvider from "@/components/motion/MotionProvider";

/**
 * Block 5 — the routes into the product for someone who doesn't have a company
 * in mind. Three doors as quiet cards, the three-question picker inline
 * underneath, and the remaining tools as a plain link row rather than six more
 * competing cards.
 */

// Rankings is deliberately absent — it's promoted to the core-features block
// higher up the page, and repeating it here would just split the tap.
const DOORS = [
  {
    href: "/buy-sell-signals",
    title: "Today's buy and sell calls",
    line: "Only the stocks there is something clear to say about today, with the reason attached.",
    bn: "যেসব শেয়ারে আজ পরিষ্কার কিছু বলার আছে, শুধু সেগুলোই — কারণসহ।",
    forWhom: "If you are deciding today",
    accent: "var(--positive)",
    icon: (
      <>
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </>
    ),
  },
  {
    href: "/stock-insights",
    title: "Ready-made lists",
    line: "Highest dividends, biggest companies, most profitable — already grouped for you.",
    bn: "সবচেয়ে বেশি লভ্যাংশ, সবচেয়ে বড় কোম্পানি, সবচেয়ে বেশি লাভ — গোছানো তালিকা।",
    forWhom: "If you would rather browse",
    accent: "var(--warm)",
    icon: (
      <>
        <path d="M8 6h13M8 12h13M8 18h13" />
        <path d="M3 6h.01M3 12h.01M3 18h.01" />
      </>
    ),
  },
  {
    href: "/stocks",
    title: "Every stock, A–Z",
    line: "Look up any company by name, with its price and score side by side.",
    bn: "নাম ধরে খুঁজুন, দাম আর স্কোর পাশাপাশি দেখুন।",
    forWhom: "If you are after something specific",
    accent: "var(--info)",
    icon: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
  },
];

const MORE = [
  { href: "/daily-tips", label: "Daily tips" },
  { href: "/dse-trending-stocks", label: "Trending this week" },
  { href: "/dse-popular-stocks", label: "Most traded today" },
  { href: "/compare", label: "Compare two companies" },
  { href: "/assistant", label: "Ask a question" },
];

export default function WaysToFind() {
  return (
    <section aria-labelledby="find-title">
      <SectionHead
        eyebrow="Where to start"
        id="find-title"
        title="Not sure which stock"
        highlight="to look at?"
        accent="var(--warm)"
        icon={<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>}
        bn="কোন শেয়ার দেখবেন জানেন না? নিচের যেকোনো একটা দিয়ে শুরু করুন।"
      />

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {DOORS.map((d) => (
          <Link
            key={d.href}
            href={d.href}
            className="acc-card acc-top flex flex-col p-5 no-underline"
            style={{ "--acc": d.accent } as CSSProperties}
          >
            <span className="icon-tile icon-tile-sm" aria-hidden>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                {d.icon}
              </svg>
            </span>
            <span
              className="mt-3.5 text-[0.64rem] font-extrabold uppercase tracking-[0.12em]"
              style={{ color: d.accent }}
            >
              {d.forWhom}
            </span>
            <h3 className="mt-1.5 text-[1rem] font-bold text-[var(--text)]">{d.title}</h3>
            <p className="mt-1.5 text-[0.82rem] leading-relaxed text-[var(--text-muted)]">
              {d.line}
            </p>
            <Bn className="mt-1 flex-1 text-[0.82rem] leading-relaxed text-[var(--text)]">{d.bn}</Bn>
            <span
              className="mt-4 inline-flex items-center gap-1.5 text-[0.78rem] font-bold"
              style={{ color: d.accent }}
            >
              Open
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h13M13 6l6 6-6 6" />
              </svg>
            </span>
          </Link>
        ))}
      </div>

      {/* The picker — real, and it runs without an account */}
      <div
        className="acc-panel mt-10 p-5 sm:p-6"
        style={{ "--acc": "var(--primary)" } as CSSProperties}
      >
        <h3 className="text-[1.05rem] font-bold text-[var(--text)]">
          Or let us narrow it down for you
        </h3>
        <Bn className="mt-1.5 text-[0.88rem] leading-relaxed text-[var(--text-muted)]">
          তিনটে প্রশ্নের উত্তর দিন — আপনার সাথে যায় এমন কোম্পানিগুলো বেছে দেখাব। অ্যাকাউন্ট লাগবে না।
        </Bn>
        {/* The picker is the only part of this page that animates, so the motion
            runtime is scoped to it instead of the whole landing tree. */}
        <div className="mt-4">
          <MotionProvider>
            <FindMyStocks />
          </MotionProvider>
        </div>
      </div>

      {/* Everything else, as links — not six more cards competing for a tap */}
      <div className="mt-9 border-t border-[var(--border)] pt-5">
        <span className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          Other ways in
        </span>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2.5">
          {MORE.map((m) => (
            <li key={m.href}>
              <Link
                href={m.href}
                className="text-[0.85rem] font-semibold text-[var(--text)] underline-offset-4 hover:text-[var(--primary-ink)] hover:underline"
              >
                {m.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
