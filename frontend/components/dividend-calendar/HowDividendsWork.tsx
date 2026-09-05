import Link from "next/link";
import Bn from "@/components/i18n/Bn";
import type { DividendCalendarData } from "@/lib/api";

const STEPS = [
  {
    n: 1,
    title: "Declaration",
    body:
      "The board announces the dividend — a cash percentage of face value, a bonus (stock) percentage, or neither.",
    bn: "বোর্ড লভ্যাংশ ঘোষণা করে — নগদ, বোনাস শেয়ার, বা কিছুই না।",
    accent: "var(--info)",
  },
  {
    n: 2,
    title: "Record date",
    body:
      "Whoever holds the share on this date gets the dividend. Buy after it and the dividend goes to the seller, not you.",
    bn: "এই দিনে যার কাছে শেয়ার থাকবে, সে-ই লভ্যাংশ পাবে।",
    accent: "var(--positive)",
  },
  {
    n: 3,
    title: "AGM",
    body:
      "Shareholders vote to approve a final dividend. Interim dividends skip this step — the board pays them directly.",
    bn: "AGM-তে চূড়ান্ত লভ্যাংশ অনুমোদন হয়; অন্তর্বর্তী লভ্যাংশে AGM লাগে না।",
    accent: "var(--gold)",
  },
  {
    n: 4,
    title: "Payment",
    body:
      "Cash reaches your bank account or BEFTN, usually within 30 days of approval. Bonus shares land in your BO account.",
    bn: "অনুমোদনের সাধারণত 30 দিনের মধ্যে টাকা ব্যাংকে আসে; বোনাস শেয়ার বিও অ্যাকাউন্টে জমা হয়।",
    accent: "var(--primary)",
  },
];

/**
 * How a DSE dividend actually reaches you, in four steps.
 *
 * The FAQ copy here is mirrored by the FAQPage JSON-LD on the page — keep the two
 * in sync if you edit either.
 */
export default function HowDividendsWork({ data }: { data: DividendCalendarData }) {
  const lead = data.settlement.normal_buy_lead_trading_days;

  return (
    <section className="mb-8" id="how-it-works">
      <div className="section-rule-modern">
        <span className="section-rule-text">How a Dividend Reaches You</span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {STEPS.map((s) => (
          <div
            key={s.n}
            className="rounded-xl border p-3.5"
            style={{
              background: `color-mix(in srgb, ${s.accent} 5%, var(--surface))`,
              borderColor: `color-mix(in srgb, ${s.accent} 22%, var(--border))`,
            }}
          >
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[0.82rem] font-extrabold text-white"
                style={{ background: s.accent }}
              >
                {s.n}
              </span>
              <h3 className="text-[0.95rem] font-extrabold tracking-tight text-[var(--text)]">
                {s.title}
              </h3>
            </div>
            <p className="mt-2 text-[0.82rem] font-medium leading-relaxed text-[var(--text)]">
              {s.body}
            </p>
            <Bn className="mt-1.5 text-[0.85rem] font-medium leading-[1.85] text-[var(--text-muted)]">
              {s.bn}
            </Bn>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
          <h3 className="text-[0.9rem] font-extrabold text-[var(--text)]">
            If I buy today, do I get the dividend?
          </h3>
          <p className="mt-2 text-[0.82rem] font-medium leading-relaxed text-[var(--text)]">
            Only if the shares are in your BO account on the record date. Normal-market
            trades settle on T+2, so buying about {lead} trading days before the record date
            is the safe side. In the last couple of days DSE switches the stock to the spot
            market, where settlement is faster — your broker can confirm the exact cut-off.
          </p>
          <Bn className="mt-2 text-[0.85rem] font-medium leading-[1.85] text-[var(--text-muted)]">
            রেকর্ড ডেটের দিন শেয়ার বিও অ্যাকাউন্টে থাকলেই লভ্যাংশ পাবেন। T+2 সেটেলমেন্টের কারণে
            রেকর্ড ডেটের অন্তত {lead} কার্যদিবস আগে কেনা নিরাপদ।
          </Bn>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
          <h3 className="text-[0.9rem] font-extrabold text-[var(--text)]">
            Cash vs bonus, and what tax takes
          </h3>
          <p className="mt-2 text-[0.82rem] font-medium leading-relaxed text-[var(--text)]">
            A 25% cash dividend on a ৳10 face value pays ৳2.50 per share — it has nothing
            to do with the market price. A 25% bonus gives you 25 extra shares per 100 held and
            no money; the price adjusts down for the new shares. Cash dividends are taxed at
            10% with a TIN, 15% without.
          </p>
          <Bn className="mt-2 text-[0.85rem] font-medium leading-[1.85] text-[var(--text-muted)]">
            25% নগদ লভ্যাংশ মানে 10 টাকা ফেসভ্যালুতে প্রতি শেয়ারে 2.50 টাকা। 25% বোনাস মানে
            প্রতি 100 শেয়ারে 25টি নতুন শেয়ার, টাকা নয়।
          </Bn>
        </div>
      </div>

      <p className="mt-3 text-[0.78rem] font-semibold text-[var(--text-muted)]">
        Dates come from DSE company announcements and can be revised by a later notice —
        always confirm with your broker before trading on one. New to this?{" "}
        <Link href="/blog" className="text-[var(--primary)] underline">
          Read the Bengali beginner guides
        </Link>
        .
      </p>
    </section>
  );
}
