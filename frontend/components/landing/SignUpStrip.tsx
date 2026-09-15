import Link from "next/link";
import type { ReactNode, CSSProperties } from "react";
import Bn from "@/components/i18n/Bn";
import SectionHead from "@/components/i18n/SectionHead";

/**
 * What an account adds, as one compact strip — placed *after* the live market
 * blocks, on purpose.
 *
 * This is the remains of the old four-card `CoreFeatures` block (rankings /
 * portfolio / watchlist / alerts, each with a title, two lines and a mockup).
 * That block sat at position 3 and sold the tools before the visitor had seen
 * any of them work. Now the whole market is on the page above this, so the ask
 * comes after the proof and only has to answer one question: what changes if I
 * sign in? Answer: this page stops being the market's and starts being yours.
 *
 * Rankings is deliberately absent from the list — everything above is already
 * the no-account half, and repeating it here would blunt the point.
 */

interface Perk {
  title: string;
  line: string;
  bn: string;
  accent: string;
  icon: ReactNode;
}

const PERKS: Perk[] = [
  {
    title: "Your money at the top",
    line: "Add what you bought. Profit or loss, every day, without a calculator.",
    bn: "কী কিনেছেন লিখে রাখুন — প্রতিদিন লাভ-ক্ষতি নিজেই হিসেব হয়ে যাবে।",
    accent: "var(--positive)",
    icon: (
      <>
        <path d="M3 17l5-5 4 3 5-7 4 4" />
        <path d="M3 21h18" />
      </>
    ),
  },
  {
    title: "Your stocks, marked everywhere",
    line: "Follow a company and it stands out in every list on the site.",
    bn: "যে শেয়ার নজরে রাখবেন, সাইটের সব তালিকায় সেটা আলাদা করে দেখাবে।",
    accent: "var(--warm)",
    icon: <path d="M12 3.5l2.7 5.5 6 .9-4.35 4.24 1.03 6L12 17.3 6.62 20.14l1.03-6L3.3 9.9l6-.9z" />,
  },
  {
    title: "A price alert that finds you",
    line: "Pick a price. We tell you the day the stock reaches it.",
    bn: "একটা দাম ঠিক করে দিন — সেই দামে পৌঁছালেই জানিয়ে দেব।",
    accent: "var(--primary)",
    icon: (
      <>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </>
    ),
  },
  {
    title: "The whole thing in Bangla",
    line: "One switch turns every sentence on your page into Bangla.",
    bn: "একটা বোতামে আপনার পুরো পাতা বাংলায় — খবর, কারণ, সবকিছু।",
    accent: "var(--info)",
    icon: (
      <>
        <path d="M3 5h11M9 3v2c0 5-2.5 8-6 9" />
        <path d="M6 10c1.5 3 4 5 8 6M13 21l4.5-11 4.5 11M15 17h6" />
      </>
    ),
  },
];

export default function SignUpStrip() {
  return (
    <section aria-labelledby="account-title">
      <SectionHead
        eyebrow="Free account"
        id="account-title"
        title="Everything above is free. Sign up and it becomes"
        highlight="yours."
        accent="var(--primary)"
        icon={<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>}
        bn="উপরের সবকিছু ফ্রি — অ্যাকাউন্ট খুললে এই পাতাটাই হয়ে যাবে আপনার নিজের।"
      />

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PERKS.map((p) => (
          <div
            key={p.title}
            className="acc-card flex items-start gap-3 p-4"
            style={{ "--acc": p.accent } as CSSProperties}
          >
            <span className="icon-tile-sm" aria-hidden>
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {p.icon}
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-[0.95rem] font-bold leading-snug text-[var(--text)]">{p.title}</h3>
              <p className="mt-1 text-[0.82rem] leading-relaxed text-[var(--text-muted)]">{p.line}</p>
              <Bn className="mt-1 text-[0.82rem] leading-relaxed text-[var(--text)]">{p.bn}</Bn>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link href="/register" className="btn-primary">
          Create a free account
        </Link>
        <Link href="/dsestockranking" className="btn-quiet">
          Keep looking around
        </Link>
      </div>
      <p className="mt-2.5 text-[0.78rem] font-semibold text-[var(--text-muted)]">
        No payment, no tips by SMS, no phone calls.
      </p>
      <Bn className="mt-0.5 text-[0.82rem] leading-relaxed text-[var(--text-muted)]">
        কোনো টাকা লাগে না, এসএমএসে টিপস আসে না, ফোনও করা হয় না।
      </Bn>
    </section>
  );
}
