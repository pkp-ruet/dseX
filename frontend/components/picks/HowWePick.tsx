import type { ForYouFunnel } from "@/lib/api";
import { T } from "@/components/i18n/T";
import { IconCheck } from "@/components/ui/icons";

/**
 * "How we pick" on /picked-for-you — the method in four plain steps, with
 * today's counts, so a reader can see exactly what every pick had to clear.
 * Mirrors backend services/recommend.py: the gate (GATE), the conviction
 * weights (grade 45 · price 20 · safety 15 · profit direction 12 · room
 * under the yearly high 8), the fit kinds and the caps (SECTOR_CAP 3,
 * FINANCIAL_CAP 5, HEAVY_PCT 40, ADD_MORE_MAX_PCT 20, FEW_PASS). Change both
 * together. Free: the method is public, the picks are Premium.
 */
export default function HowWePick({ funnel }: { funnel: ForYouFunnel | null }) {
  const checks = funnel?.checks ?? [];
  return (
    <section id="how" className="pk-how" aria-labelledby="pk-how-title">
      <h2 id="pk-how-title" className="pk-section-title">
        <T en="How we pick" bn="কীভাবে বাছাই করি" />
      </h2>
      <p className="pk-section-lead">
        <T
          en="The same steps run for every reader after every close. Only the last step, the match to your own shares, is different for you."
          bn="প্রতিদিন বাজার বন্ধের পর সব পাঠকের জন্য একই ধাপগুলো চলে। শুধু শেষ ধাপটি, আপনার নিজের শেয়ারের সাথে মেলানো, আপনার জন্য আলাদা।"
        />
      </p>

      <ol className="pk-steps">
        <li className="pk-step">
          <span className="pk-step-n" aria-hidden="true">1</span>
          <div className="min-w-0">
            <h3 className="pk-step-title">
              {funnel ? (
                <T
                  en={`We check all ${funnel.rated} companies we grade`}
                  bn={`আমাদের গ্রেড করা ${funnel.rated}টি কোম্পানির সবগুলো যাচাই করি`}
                />
              ) : (
                <T en="We check every company we grade" bn="আমাদের গ্রেড করা প্রতিটি কোম্পানি যাচাই করি" />
              )}
            </h3>
            <p className="pk-step-text">
              <T
                en="A company has to pass all of these. The number beside each is how many were still in after it today."
                bn="একটি কোম্পানিকে এর সবগুলো পার হতে হয়। পাশের সংখ্যাটি আজ ওই যাচাইয়ের পর কতগুলো টিকে ছিল।"
              />
            </p>
            {checks.length > 0 && (
              <ul className="pk-gate">
                {checks.map((c) => (
                  <li key={c.key}>
                    <span className="pk-gate-tick" aria-hidden="true">
                      <IconCheck size={14} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <T en={c.en} bn={c.bn} />
                    </span>
                    <span className="nums shrink-0 font-semibold">{c.left}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </li>

        <li className="pk-step">
          <span className="pk-step-n" aria-hidden="true">2</span>
          <div className="min-w-0">
            <h3 className="pk-step-title">
              <T en="We rank what passes" bn="যেগুলো টিকে যায়, সেগুলো সাজাই" />
            </h3>
            <p className="pk-step-text">
              <T
                en="Out of 100 points: how strong the company is counts most (45), then its price against its profit (20), how safe it is to hold (15), which way profit is going (12) and how far it sits under its yearly high (8)."
                bn="100 নম্বরের মধ্যে: কোম্পানি কতটা শক্তিশালী, সেটিই সবচেয়ে বেশি (45), তারপর মুনাফার তুলনায় দাম (20), ধরে রাখা কতটা নিরাপদ (15), মুনাফা কোন দিকে যাচ্ছে (12), আর বছরের সর্বোচ্চ দামের চেয়ে কতটা নিচে (8)।"
              />
            </p>
          </div>
        </li>

        <li className="pk-step">
          <span className="pk-step-n" aria-hidden="true">3</span>
          <div className="min-w-0">
            <h3 className="pk-step-title">
              <T en="We match them to your shares" bn="আপনার শেয়ারের সাথে মেলাই" />
            </h3>
            <p className="pk-step-text">
              <T
                en="A pick moves up when it is tied to what you own or follow: a share you can add to, one on your watchlist, a stronger company in the same business as a weak one of yours, the same business as a good one, what your shares have in common, or a sector you don't have yet."
                bn="আপনার কেনা বা ফলো করা শেয়ারের সাথে মিল থাকলে একটি বাছাই ওপরে ওঠে: যে শেয়ার আরও কেনা যায়, আপনার ওয়াচলিস্টের শেয়ার, আপনার দুর্বল শেয়ারের একই ব্যবসার আরও শক্তিশালী কোম্পানি, ভালো শেয়ারের মতো একই ব্যবসা, আপনার শেয়ারগুলোর মিল, বা যে সেক্টর আপনার এখনো নেই।"
              />
            </p>
          </div>
        </li>

        <li className="pk-step">
          <span className="pk-step-n" aria-hidden="true">4</span>
          <div className="min-w-0">
            <h3 className="pk-step-title">
              <T en="Rules we never break" bn="যে নিয়ম আমরা কখনো ভাঙি না" />
            </h3>
            <ul className="pk-rules">
              <li>
                <T
                  en="We never lower the bar to fill the list. If only a few pass, you see only a few."
                  bn="তালিকা ভরাতে আমরা কখনো মান কমাই না। অল্প কয়েকটি টিকলে, আপনি অল্প কয়েকটিই দেখবেন।"
                />
              </li>
              <li>
                <T
                  en="At most 3 picks from one sector, and at most 5 banks, finance companies and insurers together, because they tend to move together."
                  bn="এক সেক্টর থেকে সর্বোচ্চ 3টি, আর ব্যাংক, আর্থিক প্রতিষ্ঠান ও বিমা মিলিয়ে সর্বোচ্চ 5টি, কারণ এরা সাধারণত একসঙ্গে ওঠানামা করে।"
                />
              </li>
              <li>
                <T
                  en="No more picks in a sector that already holds over 40% of your money, and nothing that would add to banks, finance and insurers once they are over half of it."
                  bn="যে সেক্টরে আপনার টাকার 40%-এর বেশি আছে, সেখান থেকে আর বাছাই নয়; আর ব্যাংক, আর্থিক প্রতিষ্ঠান ও বিমা মিলে অর্ধেকের বেশি হলে সেগুলোও নয়।"
                />
              </li>
              <li>
                <T
                  en="A share you own appears only while it is under a fifth of your money."
                  bn="আপনার কেনা কোনো শেয়ার তখনই আসে, যখন সেটি আপনার টাকার পাঁচ ভাগের এক ভাগের কম।"
                />
              </li>
              <li>
                <T
                  en="No shuffling and no popularity: the list changes only when the figures change."
                  bn="কোনো এলোমেলো সাজানো বা জনপ্রিয়তা নয়: সংখ্যা বদলালেই কেবল তালিকা বদলায়।"
                />
              </li>
            </ul>
          </div>
        </li>
      </ol>

      <p className="pk-advice">
        <T
          en="These are ideas to look into, not advice. Read a share's full report before you buy, and never put money you need soon into shares."
          bn="এগুলো খতিয়ে দেখার মতো আইডিয়া, পরামর্শ নয়। কেনার আগে শেয়ারের পুরো রিপোর্ট পড়ুন, আর শিগগিরই লাগবে এমন টাকা শেয়ারে রাখবেন না।"
        />
      </p>
    </section>
  );
}
