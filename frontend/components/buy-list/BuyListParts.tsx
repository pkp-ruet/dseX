import Link from "@/components/ui/Link";
import BuyBelowAlert from "@/components/stock/report/BuyBelowAlert";
import { T } from "@/components/i18n/T";
import { dayShort } from "@/components/dividend-calendar/dates";
import { IconCheck, IconChevronDown, IconChevronRight } from "@/components/ui/icons";
import { companyShort, money } from "@/lib/formatters";
import { QUESTIONS, type BuyList } from "@/lib/buy-list";

export const HOW_ANCHOR = "bl-how";

function HowLink() {
  return (
    <a href={`#${HOW_ANCHOR}`} className="bl-howlink">
      <T en="How we check" bn="কীভাবে যাচাই করি" />
      <IconChevronRight size={14} />
    </a>
  );
}

/** The five checks as one line of ticks under the header, no box (phones and
 *  tablets; from 1024px the side card says it). Free for every reader. */
export function ChecksLine() {
  return (
    <div className="bl-checks-line">
      <ol aria-label="The five checks every share on the list passed">
        {QUESTIONS.map((q) => (
          <li key={q.short.en}>
            <span className="bl-tick" aria-hidden="true">
              <IconCheck size={10} />
            </span>
            <T en={q.short.en} bn={q.short.bn} />
          </li>
        ))}
      </ol>
      <HowLink />
    </div>
  );
}

/** From 1024px, beside the list and in view while it scrolls: how many
 *  passed, the five checks and the link to the rules. Counts only, so it is
 *  free for every reader. */
export function GlanceCard({ data }: { data: BuyList }) {
  const close = data.also.length + data.almost.length;
  return (
    <section className="bl-glance soft-card" aria-labelledby="bl-glance-t">
      <h2 id="bl-glance-t" className="bl-k">
        <T en="Today, at a glance" bn="এক নজরে আজ" />
      </h2>
      <p className="bl-glance-n nums">
        <b>{data.count}</b>
        <T en={`of ${data.universe} companies passed all five`} bn={`${data.universe}টি কোম্পানির মধ্যে পাঁচটিতেই পাস`} />
      </p>
      <ol className="bl-glance-checks">
        {QUESTIONS.map((q) => (
          <li key={q.short.en}>
            <span className="bl-tick" aria-hidden="true">
              <IconCheck size={10} />
            </span>
            <T en={q.short.en} bn={q.short.bn} />
          </li>
        ))}
      </ol>
      {close > 0 && (
        <p className="bl-glance-close">
          <T
            en={`${close} more strong ${close === 1 ? "company is" : "companies are"} close to joining.`}
            bn={`আরও ${close}টি শক্তিশালী কোম্পানি তালিকার কাছাকাছি।`}
          />
        </p>
      )}
      <HowLink />
    </section>
  );
}

/** "How we choose", at the bottom of the page: each question with one plain
 *  line, the full rule folded under it (two columns from 900px), then one
 *  line on the limits and order, one on what we never do, and "Based on
 *  your shares". Free for every reader. */
export function HowWeChoose({ rules }: { rules: BuyList["rules"] }) {
  return (
    <section id={HOW_ANCHOR} className="bl-how soft-card" aria-labelledby="bl-how-t">
      <h2 id="bl-how-t" className="bl-h2">
        <T en="How we choose" bn="আমরা কীভাবে বাছাই করি" />
      </h2>
      <p className="bl-note">
        <T en="Tap a question for the full rule." bn="পুরো নিয়ম দেখতে প্রশ্নে চাপুন।" />
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
          <T en="Want companies to look at next, picked from your own shares?" bn="আপনার নিজের শেয়ার দেখে পরে দেখে রাখার মতো কোম্পানি চান?" />{" "}
          <Link prefetch={false} href="/for-you" className="font-semibold text-primary-ink hover:underline">
            <T en="Open Based on your shares" bn="আপনার শেয়ার দেখে বাছাই পেজে যান" /> →
          </Link>
        </p>
      </div>
    </section>
  );
}

/** This week's changes as two chips (who joined, who left), and why each
 *  share left at the last close. Inside the Premium gate: it names companies. */
export function ListChanges({ data }: { data: BuyList }) {
  const ch = data.changes;
  if (ch.first_day) {
    return (
      <p className="bl-week">
        <T en="We start counting what joins and leaves from today." bn="আজ থেকে কোন শেয়ার এল আর গেল, তার হিসাব শুরু।" />
      </p>
    );
  }
  const names = new Map<string, string>();
  for (const i of [...data.items, ...data.also, ...data.almost]) names.set(i.code, companyShort(i.name) || i.code);
  for (const l of [...ch.week_left, ...ch.left]) names.set(l.code, companyShort(l.name) || l.code);
  const name = (c: string) => names.get(c) || c;
  if (!ch.week_joined.length && !ch.week_left.length) {
    return (
      <p className="bl-week">
        <T en="No change this week." bn="এই সপ্তাহে কোনো বদল নেই।" />
      </p>
    );
  }
  return (
    <div className="bl-week-wrap">
      <p className="bl-week">
        <T en="This week" bn="এই সপ্তাহে" />
        {ch.week_joined.map((c) => (
          <span key={`in-${c}`} className="bl-wchip bl-wchip--in">
            + {name(c)}
          </span>
        ))}
        {ch.week_left.map((l) => (
          <span key={`out-${l.code}`} className="bl-wchip">
            − {name(l.code)}
          </span>
        ))}
      </p>
      {ch.left.length > 0 && (
        <ul className="bl-left">
          {ch.left.map((l) => (
            <li key={l.code}>
              <b>{name(l.code)}</b>{" "}
              <T en={`left at the last close. ${l.reason.en}`} bn={`শেষ লেনদেনের দিনে বাদ পড়েছে। ${l.reason.bn}`} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function names(list: { code: string; name: string | null }[], lang: "en" | "bn") {
  const n = list.map((a) => companyShort(a.name) || a.code);
  if (n.length < 2) return n[0] ?? "";
  return `${n.slice(0, -1).join(", ")} ${lang === "en" ? "and" : "ও"} ${n[n.length - 1]}`;
}

/** "Also passed today": shares that passed all five but were left out to keep
 *  the list spread. As good as the list, so right under it, in one line when
 *  they share the reason. */
export function AlsoPassed({ data }: { data: BuyList }) {
  if (!data.also.length) return null;
  const reasons = Array.from(new Set(data.also.map((a) => a.why.en)));
  return (
    <section className="bl-also soft-card" aria-labelledby="bl-also-t">
      <h2 id="bl-also-t" className="bl-h3">
        <T en="Also passed today" bn="আজ আরও যারা পাস করেছে" />
      </h2>
      {reasons.length === 1 ? (
        <p className="bl-note">
          <T
            en={`${names(data.also, "en")} passed all five. ${data.also[0].why.en}`}
            bn={`${names(data.also, "bn")} পাঁচটিতেই পাস করেছে। ${data.also[0].why.bn}`}
          />
        </p>
      ) : (
        <ul className="bl-also-list">
          {data.also.map((a) => (
            <li key={a.code}>
              <Link prefetch={false} href={`/stock/${a.code}#ch-analysis`} className="bl-al-name">
                {companyShort(a.name) || a.code}
              </Link>{" "}
              <T en={a.why.en} bn={a.why.bn} />
            </li>
          ))}
        </ul>
      )}
      {reasons.length === 1 && (
        <p className="bl-also-links">
          {data.also.map((a) => (
            <Link key={a.code} prefetch={false} href={`/stock/${a.code}#ch-analysis`} className="bl-al-link">
              {a.code} ›
            </Link>
          ))}
        </p>
      )}
    </section>
  );
}

/**
 * "Close, not yet": strong companies that missed one question. The price that
 * brings one in is its figure, with a bell that sets a price alert there;
 * one waiting on its results shows the day.
 */
export function CloseNotYet({ data }: { data: BuyList }) {
  if (!data.almost.length) return null;
  return (
    <section className="bl-close soft-card" aria-labelledby="bl-close-t">
      <div className="bl-close-head">
        <h2 id="bl-close-t" className="bl-h3">
          <T en="Close, not yet" bn="কাছাকাছি, এখনো নয়" />
        </h2>
        <p className="bl-note">
          <T
            en="Strong companies one step away, and what would bring them in."
            bn="এক ধাপ দূরের শক্তিশালী কোম্পানি, আর কী হলে তালিকায় আসবে।"
          />
        </p>
      </div>
      <ul className="bl-close-list">
        {data.almost.map((a) => {
          const d = a.fix.date ? dayShort(a.fix.date) : null;
          const price = a.fix.price ?? null;
          return (
            <li key={a.code} className="bl-cl">
              <div className="bl-cl-id">
                <Link prefetch={false} href={`/stock/${a.code}#ch-analysis`} className="bl-al-name">
                  {companyShort(a.name) || a.code}
                </Link>
                <p className="bl-cl-miss">
                  <T en={a.miss.en} bn={a.miss.bn} />
                  {price == null && (
                    <>
                      {" "}
                      <T en={a.fix.en} bn={a.fix.bn} />
                    </>
                  )}
                </p>
              </div>
              {price != null ? (
                <div className="bl-cl-trig nums">
                  <span>
                    <small>
                      <T en="Comes in under" bn="এর নিচে এলে আসবে" />
                    </small>
                    <b>{money(price)}</b>
                  </span>
                  <BuyBelowAlert code={a.code} target={price} ltp={null} compact />
                </div>
              ) : d ? (
                <div className="bl-cl-trig nums">
                  <span>
                    <small>
                      <T en="Results" bn="আর্থিক ফল" />
                    </small>
                    <b>
                      <T en={d.en} bn={d.bn} />
                    </b>
                  </span>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
