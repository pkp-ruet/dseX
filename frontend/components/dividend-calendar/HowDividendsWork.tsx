import Link from "next/link";
import { T } from "@/components/i18n/T";
import type { DividendCalendarData } from "@/lib/api";
import SectionHeader from "@/components/ui/SectionHeader";

const STEPS = [
  {
    n: 1,
    title: "Declaration",
    titleBn: "ঘোষণা",
    body:
      "The board announces the dividend: a cash percentage of face value, a bonus share percentage, or neither.",
    bodyBn: "কোম্পানির বোর্ড ডিভিডেন্ড ঘোষণা করে: ফেস ভ্যালুর ওপর নগদ শতাংশ, বোনাস শেয়ারের শতাংশ, অথবা কোনোটিই নয়।",
  },
  {
    n: 2,
    title: "Record date",
    titleBn: "রেকর্ড ডেট",
    body:
      "Whoever holds the share on this date gets the dividend. If you buy after it, the dividend goes to the seller, not to you.",
    bodyBn: "এই তারিখে যার কাছে শেয়ার থাকবে, তিনিই ডিভিডেন্ড পাবেন। এর পরে কিনলে ডিভিডেন্ড পাবেন বিক্রেতা, আপনি নন।",
  },
  {
    n: 3,
    title: "AGM",
    titleBn: "এজিএম",
    body:
      "Shareholders vote to approve a final dividend. An interim dividend skips this step, because the board pays it directly.",
    bodyBn: "শেয়ারহোল্ডাররা ভোট দিয়ে চূড়ান্ত ডিভিডেন্ড অনুমোদন করেন। অন্তর্বর্তী ডিভিডেন্ডে এই ধাপ লাগে না, বোর্ড সরাসরি তা দেয়।",
  },
  {
    n: 4,
    title: "Payment",
    titleBn: "টাকা পাওয়া",
    body:
      "Cash reaches your bank account through BEFTN, usually within 30 days of approval. Bonus shares arrive in your BO account.",
    bodyBn: "অনুমোদনের পর সাধারণত 30 দিনের মধ্যে টাকা বিইএফটিএনের মাধ্যমে আপনার ব্যাংক অ্যাকাউন্টে আসে। বোনাস শেয়ার জমা হয় বিও অ্যাকাউন্টে।",
  },
];

/**
 * The visible answer the page's FAQPage JSON-LD quotes for "If I buy a DSE share
 * today, will I get the dividend?" — exported so the two can't drift apart.
 */
export function buyTodayAnswer(lead: number): string {
  return `Only if the shares are in your BO account on the record date. Normal-market trades on DSE settle on T+2, so buying about ${lead} trading days before the record date is the safe side. In the last couple of days DSE moves the share to the spot market, where settlement is faster. Your broker can confirm the exact cut-off.`;
}

/**
 * How a DSE dividend actually reaches you, in four steps.
 *
 * The FAQ copy here is mirrored by the FAQPage JSON-LD on the page — keep the two
 * in sync if you edit either. The JSON-LD reads the English; Bengali shows in
 * Bengali mode.
 */
export default function HowDividendsWork({ data }: { data: DividendCalendarData }) {
  const lead = data.settlement.normal_buy_lead_trading_days;

  return (
    <section className="dc-section" id="how-it-works">
      <SectionHeader title={<T en="How a dividend reaches you" bn="ডিভিডেন্ড যেভাবে আপনার কাছে আসে" />} />

      {/* One card: the four steps in a hairline grid, then the two questions
          people ask most (the FAQPage JSON-LD quotes them). */}
      <div className="soft-card overflow-hidden">
        <ol className="dc-steps">
          {STEPS.map((s) => (
            <li key={s.n} className="dc-step">
              <span className="dc-step-n" aria-hidden="true">{s.n}</span>
              <h3 className="dc-step-t">
                <T en={s.title} bn={s.titleBn} />
              </h3>
              <p className="dc-step-b">
                <T en={s.body} bn={s.bodyBn} />
              </p>
            </li>
          ))}
        </ol>

        <div className="dc-qa">
          <div>
            <h3>
              <T en="If I buy today, do I get the dividend?" bn="আজ কিনলে কি ডিভিডেন্ড পাব?" />
            </h3>
            <p>
              <T
                en={buyTodayAnswer(lead)}
                bn={`রেকর্ড ডেটে শেয়ার আপনার বিও অ্যাকাউন্টে থাকলে তবেই পাবেন। ডিএসইতে সাধারণ বাজারের লেনদেন নিষ্পত্তি হয় T+2-তে, তাই রেকর্ড ডেটের প্রায় ${lead} কার্যদিবস আগে কেনা নিরাপদ। শেষ দু-এক দিনে ডিএসই শেয়ারটিকে স্পট মার্কেটে নেয়, যেখানে নিষ্পত্তি দ্রুত হয়। ঠিক শেষ দিন কোনটি, তা আপনার ব্রোকার নিশ্চিত করতে পারবেন।`}
              />
            </p>
          </div>
          <div>
            <h3>
              <T en="Cash or bonus, and how much tax is taken" bn="নগদ না বোনাস, আর কত কর কাটা হয়" />
            </h3>
            <p>
              <T
                en="A 25% cash dividend on a ৳10 face value pays ৳2.50 per share, whatever the market price is. A 25% bonus gives you 25 extra shares for every 100 you hold, and no money; the price adjusts down for the new shares. Cash dividends are taxed at 10% with a TIN, and 15% without one."
                bn="৳10 ফেস ভ্যালুর শেয়ারে 25% নগদ ডিভিডেন্ড মানে প্রতি শেয়ারে ৳2.50, বাজারদাম যা-ই হোক। 25% বোনাস মানে প্রতি 100টি শেয়ারে 25টি নতুন শেয়ার, কোনো টাকা নয়; নতুন শেয়ারের হিসাবে দাম কমে সমন্বয় হয়। নগদ ডিভিডেন্ডে টিআইএন থাকলে 10% আর না থাকলে 15% কর কাটা হয়।"
              />
            </p>
          </div>
        </div>
      </div>

      <p className="dc-fine">
        <T
          en="Dates come from DSE company announcements and a later notice can change them, so please confirm with your broker before you trade on one. New to this? "
          bn="তারিখগুলো ডিএসইতে কোম্পানির ঘোষণা থেকে নেওয়া, আর পরের কোনো নোটিশে তা বদলাতে পারে। তাই লেনদেনের আগে ব্রোকারের কাছে নিশ্চিত হয়ে নিন। নতুন? "
        />
        <Link href="/blog">
          <T en="Read the Bengali beginner guides" bn="নতুনদের জন্য বাংলা গাইড পড়ুন" />
        </Link>
        .
      </p>
    </section>
  );
}
