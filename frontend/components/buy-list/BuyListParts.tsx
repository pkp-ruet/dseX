import Link from "@/components/ui/Link";
import { T } from "@/components/i18n/T";
import { dayShort } from "@/components/dividend-calendar/dates";
import { IconCheck } from "@/components/ui/icons";
import { companyShort } from "@/lib/formatters";
import { QUESTIONS, type BuyList } from "@/lib/buy-list";

/** "How we choose": the six questions in order, the caps, the order, and
 *  what we never do. Free for every reader. */
export function HowWeChoose({ rules }: { rules: BuyList["rules"] }) {
  return (
    <section className="bl-how soft-card" aria-labelledby="bl-how-t">
      <h2 id="bl-how-t" className="bl-h2">
        <T en="How we choose" bn="আমরা কীভাবে বাছাই করি" />
      </h2>
      <p className="bl-note">
        <T en="Every share on the list says yes to all six." bn="তালিকার প্রতিটি শেয়ার ছয়টি প্রশ্নেরই উত্তরে হ্যাঁ।" />
      </p>
      <ol className="bl-qs">
        {QUESTIONS.map((q) => (
          <li key={q.title.en}>
            <b>
              <T en={q.title.en} bn={q.title.bn} />
            </b>
            <span>
              <T en={q.line.en} bn={q.line.bn} />
            </span>
          </li>
        ))}
      </ol>
      <div className="bl-how-more">
        <p className="bl-k">
          <T en="Then" bn="তারপর" />
        </p>
        <p>
          <T
            en={`At most ${rules.sector_cap} from one sector, and ${rules.financial_cap} banks, finance companies and insurers together. Up to ${rules.max_rows} shares.`}
            bn={`এক সেক্টর থেকে সর্বোচ্চ ${rules.sector_cap}টি, আর ব্যাংক, আর্থিক প্রতিষ্ঠান ও বিমা মিলিয়ে সর্বোচ্চ ${rules.financial_cap}টি। মোট সর্বোচ্চ ${rules.max_rows}টি শেয়ার।`}
          />
        </p>
        <p className="bl-k">
          <T en="In what order" bn="কোন ক্রমে" />
        </p>
        <p>
          <T
            en="The strongest case first: the company counts most, then the price, how safe it is, which way profit is going and how far it is under its highest price of the year. The same list for every reader."
            bn="যার কারণ সবচেয়ে জোরালো, সে আগে: সবচেয়ে বেশি গুরুত্ব কোম্পানির, তারপর দাম, কতটা নিরাপদ, মুনাফা কোন দিকে যাচ্ছে, আর বছরের সর্বোচ্চ দামের চেয়ে কত নিচে। সব পাঠকের জন্য একই তালিকা।"
          />
        </p>
        <p className="bl-k">
          <T en="We never" bn="আমরা কখনো" />
        </p>
        <ul className="bl-never">
          <li>
            <T en="Fill the list to reach a number" bn="সংখ্যা পূরণ করতে তালিকা ভরাই না" />
          </li>
          <li>
            <T en="Show past returns or price targets" bn="আগের লাভ বা লক্ষ্য দাম দেখাই না" />
          </li>
          <li>
            <T en="Change it for one reader" bn="কারও জন্য আলাদা করে বদলাই না" />
          </li>
        </ul>
        <p className="bl-k">
          <T en="Matched to your shares" bn="আপনার শেয়ারের সাথে মিলিয়ে" />
        </p>
        <p>
          <T
            en="Looking for strong companies to read about, matched to the shares you own and follow? That is Discover. It never repeats a share from this list."
            bn="আপনার কেনা ও ফলো করা শেয়ারের সাথে মিলিয়ে পড়ে দেখার মতো শক্তিশালী কোম্পানি খুঁজছেন? সেটি খুঁজে দেখুন পেজ। এই তালিকার কোনো শেয়ার সেখানে আবার আসে না।"
          />{" "}
          <Link prefetch={false} href="/discover" className="font-semibold text-primary-ink hover:underline">
            <T en="Open Discover" bn="খুঁজে দেখুন পেজে যান" /> →
          </Link>
        </p>
      </div>
    </section>
  );
}

/** One line on what changed since the last close and this week. */
export function ListChanges({ data }: { data: BuyList }) {
  const ch = data.changes;
  if (ch.first_day) {
    return (
      <p className="bl-change">
        <span className="bl-change-dot" aria-hidden="true" />
        <T en="We start counting what joins and leaves from today." bn="আজ থেকে কোন শেয়ার এল আর গেল, তার হিসাব শুরু।" />
      </p>
    );
  }
  const names = (codes: string[]) => codes.join(", ");
  const joined = ch.week_joined;
  const left = ch.week_left.map((l) => l.code);
  const en = [
    joined.length ? `This week: ${names(joined)} joined.` : "This week: none joined.",
    left.length ? `${names(left)} left.` : "None left.",
  ].join(" ");
  const bn = [
    joined.length ? `এই সপ্তাহে এসেছে ${names(joined)}।` : "এই সপ্তাহে নতুন কেউ আসেনি।",
    left.length ? `বাদ পড়েছে ${names(left)}।` : "কেউ বাদ পড়েনি।",
  ].join(" ");
  return (
    <div className="bl-change-wrap">
      <p className="bl-change">
        <span className="bl-change-dot" aria-hidden="true" />
        <T en={en} bn={bn} />
      </p>
      {ch.left.length > 0 && (
        <ul className="bl-left">
          {ch.left.map((l) => (
            <li key={l.code}>
              <b>{l.code}</b>{" "}
              <T en={`left at the last close. ${l.reason.en}`} bn={`শেষ লেনদেনের দিনে বাদ পড়েছে। ${l.reason.bn}`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Shares that passed every question but a cap left out. */
export function AlsoPassed({ data }: { data: BuyList }) {
  if (!data.also.length) return null;
  return (
    <div className="bl-also soft-card">
      {data.also.map((a) => (
        <p key={a.code} className="bl-also-row">
          <span className="bl-also-ic" aria-hidden="true">
            <IconCheck size={12} />
          </span>
          <span className="min-w-0">
            <b>
              <Link prefetch={false} href={`/stock/${a.code}#ch-analysis`}>
                {companyShort(a.name) || a.code}
              </Link>{" "}
              ({a.code}).
            </b>{" "}
            <T en={`${a.margin_pct}% under our fair price. ${a.why.en}`} bn={`ন্যায্য দামের চেয়ে ${a.margin_pct}% কম। ${a.why.bn}`} />
          </span>
        </p>
      ))}
    </div>
  );
}

/** Strong companies that missed one question, and what would bring them in. */
export function AlmostList({ data }: { data: BuyList }) {
  if (!data.almost.length) return null;
  return (
    <section className="bl-almost soft-card" aria-labelledby="bl-almost-t">
      <div className="bl-almost-head">
        <h2 id="bl-almost-t" className="bl-h2">
          <T en="Almost made it" bn="অল্পের জন্য বাদ" />
        </h2>
        <p className="bl-note">
          <T
            en="Strong companies that missed one question, and what would bring them in."
            bn="শক্তিশালী কোম্পানি, যারা একটি প্রশ্নে আটকে গেছে, আর কী হলে তালিকায় আসবে।"
          />
        </p>
      </div>
      <ul className="bl-al-list">
        {data.almost.map((a) => {
          const d = a.fix.date ? dayShort(a.fix.date) : null;
          return (
            <li key={a.code} className="bl-al">
              <div className="bl-al-top">
                <Link prefetch={false} href={`/stock/${a.code}#ch-analysis`} className="bl-al-name">
                  {companyShort(a.name) || a.code}
                </Link>
                <span className="bl-qtag">
                  <T en={`Question ${a.question}`} bn={`প্রশ্ন ${a.question}`} />
                </span>
              </div>
              <p className="bl-al-sub">
                {a.code} · <T en={a.group.en} bn={a.group.bn} />
              </p>
              <p className="bl-al-miss">
                <T en={a.miss.en} bn={a.miss.bn} />
              </p>
              <p className="bl-al-fix">
                {d && <T en={`Its results are due ${d.en}. `} bn={`আর্থিক ফল আসবে ${d.bn}। `} />}
                <T en={a.fix.en} bn={a.fix.bn} />
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
