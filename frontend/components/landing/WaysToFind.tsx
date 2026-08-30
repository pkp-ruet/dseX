import Link from "next/link";
import type { CSSProperties } from "react";
import Bn from "@/components/i18n/Bn";
import SectionHead from "@/components/i18n/SectionHead";
import FindMyStocks from "@/components/landing/FindMyStocks";
import MotionProvider from "@/components/motion/MotionProvider";

/**
 * Block 5 — the route in for someone who doesn't have a company in mind.
 *
 * One guided path instead of a wall of doors: the three-question picker leads,
 * and every other way in is a plain link under it. The 2026-08-30 cut: the
 * three door cards (Signals / Lists / A–Z) became links, and Daily tips /
 * Trending / Most traded left the row entirely — nine competing choices became
 * one picker + five links.
 */

// Rankings is deliberately absent — it's promoted to the core-features block
// higher up the page, and repeating it here would just split the tap.
const LINKS = [
  { href: "/buy-sell-signals", label: "Today's buy and sell calls" },
  { href: "/stock-insights", label: "Ready-made lists" },
  { href: "/stocks", label: "Every stock, A–Z" },
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
        bn="কোন শেয়ার দেখবেন জানেন না? নিচের তিনটে প্রশ্নের উত্তর দিয়ে শুরু করুন।"
      />

      {/* The picker — real, and it runs without an account */}
      <div
        className="acc-panel mt-8 p-5 sm:p-6"
        style={{ "--acc": "var(--primary)" } as CSSProperties}
      >
        <h3 className="text-[1.05rem] font-bold text-[var(--text)]">
          Let us narrow it down for you
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

      {/* Everything else, as links — not more cards competing for a tap */}
      <div className="mt-8 border-t border-[var(--border)] pt-5">
        <span className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          Or go straight to
        </span>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2.5">
          {LINKS.map((m) => (
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
