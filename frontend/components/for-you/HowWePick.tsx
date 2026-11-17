import type { ForYouFunnel } from "@/lib/api";
import { T } from "@/components/i18n/T";
import { IconCheck, IconChevronDown } from "@/components/ui/icons";

/**
 * "How we pick" on /for-you, folded into one line at the bottom (the method is
 * public; the names are Premium). Mirrors backend services/for_you.py: the
 * explore gate with today's counts, the three kinds of share we read (owned,
 * followed, opened on 2+ days in 30 or once in 14), the ties (stronger · like
 * it · like it in another business only when its own has no match · gaps),
 * and the caps (3 a share, 2 a gap, 3 a sector, 5 financials, 15 in all).
 * Change both together.
 */
export default function HowWePick({ funnel }: { funnel: ForYouFunnel | null }) {
  const checks = funnel?.checks ?? [];
  return (
    <details id="how" className="fu-how soft-card group">
      <summary>
        <span className="min-w-0 flex-1">
          <b>
            <T en="How we pick" bn="কীভাবে বাছাই করি" />
          </b>
          <span className="fu-how-sub">
            <T en="The checks, your shares, and today's counts" bn="যাচাই, আপনার শেয়ার আর আজকের সংখ্যা" />
          </span>
        </span>
        <span className="fu-how-chev transition-transform group-open:rotate-180" aria-hidden="true">
          <IconChevronDown size={18} />
        </span>
      </summary>

      <ol className="fu-steps">
        <li>
          <h3>
            {funnel ? (
              <T
                en={`1. We check all ${funnel.rated} companies we grade`}
                bn={`1. আমাদের গ্রেড করা ${funnel.rated}টি কোম্পানির সবগুলো যাচাই করি`}
              />
            ) : (
              <T en="1. We check every company we grade" bn="1. আমাদের গ্রেড করা প্রতিটি কোম্পানি যাচাই করি" />
            )}
          </h3>
          <p>
            <T
              en="Only strong companies with no serious warnings can be picked. The number beside each check is how many were still in after it today."
              bn="শুধু গুরুতর সতর্কতা নেই এমন শক্তিশালী কোম্পানিই বাছাই হতে পারে। প্রতিটি যাচাইয়ের পাশের সংখ্যাটি আজ এর পর কতগুলো টিকে ছিল।"
            />
          </p>
          {checks.length > 0 && (
            <ul className="fu-gate">
              {checks.map((c) => (
                <li key={c.key}>
                  <span className="fu-gate-tick" aria-hidden="true">
                    <IconCheck size={13} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <T en={c.en} bn={c.bn} />
                  </span>
                  <span className="nums font-semibold">{c.left}</span>
                </li>
              ))}
            </ul>
          )}
        </li>
        <li>
          <h3>
            <T en="2. We look at your shares" bn="2. আপনার শেয়ার দেখি" />
          </h3>
          <p>
            <T
              en="The shares you own (the most money first), the ones you follow, and the stock pages you opened on 2 or more days this month or once in the last 2 weeks."
              bn="আপনার কেনা শেয়ার (যেটিতে বেশি টাকা, সেটি আগে), যেগুলো ফলো করেন, আর এ মাসে 2 বা বেশি দিন অথবা গত 2 সপ্তাহে একবার যে শেয়ারের পেজ খুলেছেন।"
            />
          </p>
        </li>
        <li>
          <h3>
            <T en="3. We find what each one leads to" bn="3. প্রতিটি শেয়ার থেকে কী পাওয়া যায়, খুঁজি" />
          </h3>
          <ul className="fu-bullets">
            <li>
              <T
                en="A weak or mixed share of yours: a stronger company in the same business, named by the checks it is stronger on (profit, finances, business strength, dividends)."
                bn="আপনার দুর্বল বা মাঝারি শেয়ার: একই ব্যবসার আরও শক্তিশালী কোম্পানি, কোন যাচাইয়ে বেশি শক্তিশালী তা বলে (মুনাফা, আর্থিক অবস্থা, ব্যবসার শক্তি, ডিভিডেন্ড)।"
              />
            </li>
            <li>
              <T
                en="A strong share of yours: the most alike company in the same business, by size, cash dividend, loans and profit growth. Another business only when its own has no strong match, and only when they share 2 or more of these."
                bn="আপনার শক্তিশালী শেয়ার: একই ব্যবসার সবচেয়ে মিল থাকা কোম্পানি, আকার, নগদ ডিভিডেন্ড, ঋণ আর মুনাফা বৃদ্ধি দেখে। নিজের ব্যবসায় শক্তিশালী মিল না থাকলে তবেই অন্য ব্যবসা, আর তখন এর 2টি বা বেশি মিলতে হবে।"
              />
            </li>
            <li>
              <T
                en="Your money: a strong company in a new business when one business holds over 40% of it, and a steady cash payer when none of your 3 or more shares pays cash every year."
                bn="আপনার টাকা: এক ব্যবসায় 40%-এর বেশি থাকলে নতুন ব্যবসার একটি শক্তিশালী কোম্পানি, আর আপনার 3টি বা বেশি শেয়ারের কোনোটিই প্রতি বছর নগদ না দিলে নিয়মিত নগদ দেয় এমন একটি।"
              />
            </li>
          </ul>
        </li>
        <li>
          <h3>
            <T en="4. Rules we keep" bn="4. যে নিয়ম মেনে চলি" />
          </h3>
          <ul className="fu-bullets">
            <li>
              <T
                en="Every company is tied to one of your shares. We never fill the list with others: a shorter list is a truer one."
                bn="প্রতিটি কোম্পানি আপনার কোনো একটি শেয়ারের সাথে যুক্ত। অন্য কিছু দিয়ে তালিকা ভরাই না: ছোট তালিকাই বেশি সত্যি।"
              />
            </li>
            <li>
              <T
                en="At most 3 from one share of yours, taken in turns. At most 3 from one sector, 5 banks, finance companies and insurers together, 15 in all."
                bn="আপনার একটি শেয়ার থেকে সর্বোচ্চ 3টি, পালা করে। এক সেক্টর থেকে সর্বোচ্চ 3টি, ব্যাংক, আর্থিক প্রতিষ্ঠান ও বিমা মিলিয়ে 5টি, সব মিলিয়ে 15টি।"
              />
            </li>
            <li>
              <T
                en="Never a share you own, follow or have been reading about, and never one on today's Buy List. “Not for me” hides a company for 90 days."
                bn="আপনার কেনা, ফলো করা বা পড়ে দেখা শেয়ার কখনো আসে না, আজকের কেনার তালিকার কোনোটিও না। “আমার জন্য নয়” চাপলে কোম্পানিটি 90 দিন আসবে না।"
              />
            </li>
            <li>
              <T
                en="No shuffling and no popularity: the list changes only when the figures or your shares change."
                bn="এলোমেলো সাজানো বা জনপ্রিয়তা নয়: সংখ্যা বা আপনার শেয়ার বদলালেই কেবল তালিকা বদলায়।"
              />
            </li>
          </ul>
        </li>
      </ol>
      <p className="fu-advice">
        <T
          en="These are companies to get to know, not advice and not a list to buy from. Never put money you need soon into shares."
          bn="এগুলো চিনে রাখার মতো কোম্পানি, পরামর্শ বা কেনার তালিকা নয়। শিগগিরই লাগবে এমন টাকা শেয়ারে রাখবেন না।"
        />
      </p>
    </details>
  );
}
