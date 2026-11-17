import Link from "@/components/ui/Link";
import { T } from "@/components/i18n/T";
import { dayShort } from "@/components/dividend-calendar/dates";
import { IconCheck, IconChevronDown, IconChevronRight } from "@/components/ui/icons";
import { companyShort } from "@/lib/formatters";
import { QUESTIONS, type BuyList } from "@/lib/buy-list";

export const HOW_ANCHOR = "bl-how";

/** The six questions at a glance, under the header: every share on the list
 *  passed all six. Free for every reader; "How we check" jumps to the rules. */
export function SixChecks() {
  return (
    <section className="bl-checks" aria-labelledby="bl-checks-t">
      <div className="bl-checks-head">
        <p id="bl-checks-t">
          <T en="Every share on the list passed all six of our questions" bn="তালিকার প্রতিটি শেয়ার আমাদের ছয়টি প্রশ্নেই পাস করেছে" />
        </p>
        <a href={`#${HOW_ANCHOR}`}>
          <T en="How we check" bn="কীভাবে যাচাই করি" />
          <IconChevronRight size={14} />
        </a>
      </div>
      <ol>
        {QUESTIONS.map((q) => (
          <li key={q.short.en}>
            <span className="bl-tick" aria-hidden="true">
              <IconCheck size={12} />
            </span>
            <T en={q.short.en} bn={q.short.bn} />
          </li>
        ))}
      </ol>
    </section>
  );
}

/** "How we choose": each question with one plain line, the full rule folded
 *  under it, then one line on the limits and order, one on what we never do,
 *  and Discover. Free for every reader. */
export function HowWeChoose({ rules }: { rules: BuyList["rules"] }) {
  return (
    <section id={HOW_ANCHOR} className="bl-how soft-card" aria-labelledby="bl-how-t">
      <h2 id="bl-how-t" className="bl-h2">
        <T en="How we choose" bn="আমরা কীভাবে বাছাই করি" />
      </h2>
      <p className="bl-note">
        <T
          en="Every share on the list says yes to all six. Tap a question for the full rule."
          bn="তালিকার প্রতিটি শেয়ার ছয়টি প্রশ্নেরই উত্তরে হ্যাঁ। পুরো নিয়ম দেখতে প্রশ্নে চাপুন।"
        />
      </p>
      <ol className="bl-qs">
        {QUESTIONS.map((q, i) => (
          <li key={q.title.en}>
            <details className="bl-q">
              <summary>
                <span className="bl-q-n" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <b>
                    <T en={q.title.en} bn={q.title.bn} />
                  </b>
                  <T en={q.plain.en} bn={q.plain.bn} />
                </span>
                <span className="bl-q-chev" aria-hidden="true">
                  <IconChevronDown size={14} />
                </span>
              </summary>
              <p className="bl-q-full">
                <T en={q.line.en} bn={q.line.bn} />
              </p>
            </details>
          </li>
        ))}
      </ol>
      <div className="bl-how-more">
        <p>
          <T
            en={`Then: at most ${rules.sector_cap} from one sector, ${rules.financial_cap} banks, finance companies and insurers together, and up to ${rules.max_rows} shares. The strongest first.`}
            bn={`তারপর: এক সেক্টর থেকে সর্বোচ্চ ${rules.sector_cap}টি, ব্যাংক, আর্থিক প্রতিষ্ঠান ও বিমা মিলিয়ে সর্বোচ্চ ${rules.financial_cap}টি, আর মোট সর্বোচ্চ ${rules.max_rows}টি শেয়ার। সবচেয়ে জোরালোটি আগে।`}
          />
        </p>
        <p>
          <T
            en="We never fill the list to reach a number, and never show past returns or price targets. Every reader sees the same list."
            bn="সংখ্যা পূরণ করতে আমরা কখনো তালিকা ভরাই না, আর আগের লাভ বা লক্ষ্য দাম দেখাই না। সব পাঠক একই তালিকা দেখেন।"
          />
        </p>
        <p>
          <T en="Want companies matched to your own shares?" bn="আপনার নিজের শেয়ারের সাথে মিলিয়ে কোম্পানি চান?" />{" "}
          <Link prefetch={false} href="/discover" className="font-semibold text-primary-ink hover:underline">
            <T en="Open Discover" bn="খুঁজে দেখুন পেজে যান" /> →
          </Link>
        </p>
      </div>
    </section>
  );
}

/** One line on what changed this week, with company names, and why each
 *  share left at the last close. */
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
  const names = new Map<string, string>();
  for (const i of [...data.items, ...data.also, ...data.almost]) names.set(i.code, companyShort(i.name) || i.code);
  for (const l of [...ch.week_left, ...ch.left]) names.set(l.code, companyShort(l.name) || l.code);
  const list = (codes: string[]) => codes.map((c) => names.get(c) || c).join(", ");
  const joined = ch.week_joined;
  const left = ch.week_left.map((l) => l.code);
  const en = [
    joined.length ? `This week ${list(joined)} joined.` : "No share joined this week.",
    left.length ? `${list(left)} left.` : "None left.",
  ].join(" ");
  const bn = [
    joined.length ? `এই সপ্তাহে এসেছে ${list(joined)}।` : "এই সপ্তাহে নতুন কেউ আসেনি।",
    left.length ? `বাদ পড়েছে ${list(left)}।` : "কেউ বাদ পড়েনি।",
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
              <b>{names.get(l.code) || l.code}</b>{" "}
              <T en={`left at the last close. ${l.reason.en}`} bn={`শেষ লেনদেনের দিনে বাদ পড়েছে। ${l.reason.bn}`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * "Almost made it", in two groups: shares that passed all six but were left
 * out to keep the list spread (one sector, the banks and finance cap, the
 * size), then strong companies that missed one question, named by the
 * question they missed, and what would bring them in.
 */
export function AlmostList({ data }: { data: BuyList }) {
  if (!data.also.length && !data.almost.length) return null;
  return (
    <section className="bl-almost soft-card" aria-labelledby="bl-almost-t">
      <div className="bl-almost-head">
        <h2 id="bl-almost-t" className="bl-h2">
          <T en="Almost made it" bn="অল্পের জন্য বাদ" />
        </h2>
        <p className="bl-note">
          <T
            en="Strong companies that came close, and what would bring them in."
            bn="যে শক্তিশালী কোম্পানিগুলো কাছে এসেছিল, আর কী হলে তালিকায় আসবে।"
          />
        </p>
      </div>

      {data.also.length > 0 && (
        <div className="bl-al-group">
          <p className="bl-al-gh">
            <T en="Passed all six, left out to keep the list spread" bn="ছয়টিতেই পাস, তালিকা ছড়িয়ে রাখতে বাদ" />
          </p>
          <ul className="bl-al-list">
            {data.also.map((a) => (
              <li key={a.code} className="bl-al">
                <div className="bl-al-top">
                  <Link prefetch={false} href={`/stock/${a.code}#ch-analysis`} className="bl-al-name">
                    {companyShort(a.name) || a.code}
                  </Link>
                </div>
                <p className="bl-al-sub">
                  {a.code} · <T en={a.group.en} bn={a.group.bn} />
                  {a.margin_pct > 0 && (
                    <>
                      {" · "}
                      <T en={`${a.margin_pct}% under its usual price`} bn={`স্বাভাবিক দামের চেয়ে ${a.margin_pct}% কম`} />
                    </>
                  )}
                </p>
                <p className="bl-al-miss">
                  <T en={a.why.en} bn={a.why.bn} />
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.almost.length > 0 && (
        <div className="bl-al-group">
          <p className="bl-al-gh">
            <T en="Missed one question" bn="একটি প্রশ্নে আটকেছে" />
          </p>
          <ul className="bl-al-list">
            {data.almost.map((a) => {
              const d = a.fix.date ? dayShort(a.fix.date) : null;
              const q = QUESTIONS[a.question - 1];
              return (
                <li key={a.code} className="bl-al">
                  <div className="bl-al-top">
                    <Link prefetch={false} href={`/stock/${a.code}#ch-analysis`} className="bl-al-name">
                      {companyShort(a.name) || a.code}
                    </Link>
                    {q && (
                      <span className="bl-qtag">
                        <T en={`Missed: ${q.miss.en}`} bn={`আটকেছে: ${q.miss.bn}`} />
                      </span>
                    )}
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
        </div>
      )}
    </section>
  );
}
