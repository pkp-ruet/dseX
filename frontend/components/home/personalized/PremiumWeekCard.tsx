"use client";

import Link from "next/link";
import type { Lang } from "@/context/LangContext";
import type { PortfolioWatchEvent, WeekWatch } from "@/lib/api";
import DashHeader from "@/components/home/personalized/DashHeader";
import AnswerLock, { JobTag } from "@/components/premium/AnswerLock";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import { T } from "@/components/i18n/T";
import { PREMIUM_PATH } from "@/lib/premium";

/** The watcher's kinds (backend portfolio_watch.KIND_WORDS), one / many / Bengali. */
const KIND: Record<string, [string, string, string]> = {
  red_flag: ["red flag", "red flags", "বড় সতর্কতা"],
  answer: ["change in our answer", "changes in our answer", "আমাদের উত্তরে বদল"],
  results: ["results report", "results reports", "আর্থিক ফল"],
  grade: ["grade change", "grade changes", "গ্রেড বদল"],
  record: ["record date", "record dates", "রেকর্ড ডেট"],
  category: ["category change", "category changes", "ক্যাটাগরি বদল"],
  drop: ["big one-day fall", "big one-day falls", "একদিনে বড় দরপতন"],
  low52: ["fall to a yearly low", "falls to a yearly low", "বছরের সর্বনিম্ন দাম"],
};

/** "1 results report, 2 record dates and 1 grade change" in both languages. */
function kindsPhrase(kinds: WeekWatch["kinds"]): { en: string; bn: string } {
  const top = [...kinds].sort((a, b) => b.count - a.count).slice(0, 3).filter((k) => KIND[k.kind]);
  const en = top.map((k) => `${k.count} ${KIND[k.kind][k.count === 1 ? 0 : 1]}`);
  const bn = top.map((k) => `${k.count}টি ${KIND[k.kind][2]}`);
  const join = (p: string[], last: string) => (p.length < 2 ? p.join("") : `${p.slice(0, -1).join(", ")}${last}${p[p.length - 1]}`);
  return { en: join(en, " and "), bn: join(bn, " ও ") };
}

const DOT: Record<PortfolioWatchEvent["level"], string> = {
  good: "pf-dot pf-dot--good",
  watch: "pf-dot pf-dot--watch",
  bad: "pf-dot pf-dot--bad",
};

function EventRow({ e }: { e: PortfolioWatchEvent }) {
  return (
    <li>
      <Link
        href={`/stock/${encodeURIComponent(e.code)}`}
        prefetch={false}
        className="flex items-start gap-3 py-3 hover:bg-surface-2 active:bg-surface-2"
      >
        <span className={`${DOT[e.level]} mt-2`} aria-hidden />
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-text-main">
            <span className="text-text-muted">{e.code} · </span>
            <T en={e.title_en} bn={e.title_bn || e.title_en} />
          </span>
          <span className="mt-0.5 block text-sm leading-snug text-text-muted">
            <T en={e.body_en} bn={e.body_bn || e.body_en} />
          </span>
        </span>
      </Link>
    </li>
  );
}

/**
 * THE one Premium pitch on the dashboard (2026-10-29, the Free vs Premium
 * plan, step 5 — it replaced the pitch lines on the results, screener and
 * research cards). It shows the Watch job instead of describing it, built
 * from the bundle's `week_watch` (what the daily watcher spotted on the
 * reader's holdings ∪ watchlist in the last 7 days):
 *  - a free reader: the counts, kinds and tickers (free), the week's free
 *    event open, every other event behind one `AnswerLock`;
 *  - a Premium reader: the same card as a plain weekly summary, no ask;
 *  - a quiet week: one line ("nothing needed your attention");
 *  - no stocks yet: what the watcher would do, with the add buttons.
 * Sits at the end of the Your money chapter.
 */
export default function PremiumWeekCard({
  week,
  hasStocks,
  premium,
  lang = "en",
}: {
  week: WeekWatch | null | undefined;
  hasStocks: boolean;
  premium: boolean;
  lang?: Lang;
}) {
  const bn = lang === "bn";
  const total = week?.total ?? 0;

  if (!hasStocks) {
    return (
      <section className="soft-card dash-box p-4 sm:p-5" lang={bn ? "bn" : undefined}>
        {!premium && <JobTag job="watch" />}
        <h3 className="mt-1 text-base font-bold text-text-main">
          {premium ? (
            <T en="Add your shares and we check them every day" bn="আপনার শেয়ার যোগ করুন, আমরা প্রতিদিন যাচাই করব" />
          ) : (
            <T en="Add your shares and Premium checks them every day" bn="আপনার শেয়ার যোগ করুন, প্রিমিয়াম প্রতিদিন যাচাই করবে" />
          )}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-text-muted">
          <T
            en="After every close we look for new results, record dates, grade changes, red flags and big falls on the shares you own or follow."
            bn="প্রতিদিন বাজার বন্ধের পর আপনার কেনা বা অনুসরণ করা শেয়ারে নতুন ফল, রেকর্ড ডেট, গ্রেড বদল, বড় সতর্কতা আর বড় দরপতন খুঁজি।"
          />
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button href="/portfolio" variant="primary">
            <T en="Add your portfolio" bn="পোর্টফোলিও যোগ করুন" />
          </Button>
          <Button href="/watchlist" variant="quiet">
            <T en="Build your watchlist" bn="ওয়াচলিস্ট বানান" />
          </Button>
        </div>
      </section>
    );
  }

  if (!week || total === 0) {
    return (
      <section className="soft-card dash-box p-4 sm:p-5" lang={bn ? "bn" : undefined}>
        <h3 className="text-base font-bold text-text-main">
          <T en="This week on your shares" bn="এ সপ্তাহে আপনার শেয়ারে" />
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-text-muted">
          {premium ? (
            <T
              en="Nothing needed your attention in the last 7 days. We check again after every close."
              bn="গত 7 দিনে নজর দেওয়ার মতো কিছু ঘটেনি। প্রতিদিন বাজার বন্ধের পর আবার দেখি।"
            />
          ) : (
            <T
              en="Nothing needed your attention in the last 7 days. Premium checks your shares after every close and tells you the same day."
              bn="গত 7 দিনে নজর দেওয়ার মতো কিছু ঘটেনি। প্রিমিয়াম প্রতিদিন বাজার বন্ধের পর আপনার শেয়ার দেখে, আর সেদিনই জানায়।"
            />
          )}
        </p>
        {!premium && (
          <Link href={PREMIUM_PATH} prefetch={false} className="mt-2 inline-flex min-h-10 items-center text-sm font-bold text-gold-ink hover:underline">
            <T en="See what Premium watches" bn="প্রিমিয়াম কী দেখে, দেখুন" />
            <span aria-hidden="true">&nbsp;→</span>
          </Link>
        )}
      </section>
    );
  }

  const phrase = kindsPhrase(week.kinds);
  const freeIds = new Set((week.free_items ?? []).map((e) => e.id));
  const open = premium ? week.items : week.items.filter((e) => freeIds.has(e.id));
  const rest = premium ? [] : week.items.filter((e) => !freeIds.has(e.id));
  const restCount = Math.max(0, total - open.length);

  return (
    <section className="soft-card dash-box overflow-hidden" lang={bn ? "bn" : undefined}>
      <DashHeader
        title={
          premium ? (
            <T en="This week on your shares" bn="এ সপ্তাহে আপনার শেয়ারে" />
          ) : (
            <T en="This week Premium caught" bn="এ সপ্তাহে প্রিমিয়াম যা ধরেছে" />
          )
        }
        href="/portfolio#pf-stocks"
        linkLabel={<T en="Your updates" bn="আপনার খবর" />}
      />
      <div className="px-4 pb-4 sm:px-5">
        <p className="text-sm leading-relaxed text-text-main">
          {premium ? (
            <T
              en={`We flagged ${total} ${total === 1 ? "thing" : "things"} on your shares in the last 7 days: ${phrase.en}.`}
              bn={`গত 7 দিনে আপনার শেয়ারে ${total}টি বিষয় চোখে পড়েছে: ${phrase.bn}।`}
            />
          ) : (
            <T
              en={`Premium flagged ${total} ${total === 1 ? "thing" : "things"} on your shares in the last 7 days: ${phrase.en}.`}
              bn={`গত 7 দিনে প্রিমিয়াম আপনার শেয়ারে ${total}টি বিষয় ধরেছে: ${phrase.bn}।`}
            />
          )}
          {week.bad > 0 && (
            <>
              {" "}
              <b>
                <T
                  en={`${week.bad} ${week.bad === 1 ? "is" : "are"} worth a look today.`}
                  bn={`এর ${week.bad}টি আজ দেখে নেওয়া ভালো।`}
                />
              </b>
            </>
          )}
        </p>
        {week.codes.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {week.codes.slice(0, 8).map((c) => (
              <Chip key={c} href={`/stock/${encodeURIComponent(c)}`}>
                {c}
              </Chip>
            ))}
          </div>
        )}

        {open.length > 0 && (
          <ul className="mt-2 divide-y divide-cell-rule">
            {open.slice(0, premium ? 4 : 1).map((e) => (
              <EventRow key={e.id} e={e} />
            ))}
          </ul>
        )}

        {!premium && restCount > 0 && (
          <AnswerLock
            job="watch"
            lock="Dashboard: this week Premium caught"
            what={{ en: "This week on your shares", bn: "এ সপ্তাহে আপনার শেয়ারে" }}
            lines={[
              {
                en: `What happened in the other ${restCount} ${restCount === 1 ? "update" : "updates"}, and what each means for you`,
                bn: `বাকি ${restCount}টি খবরে কী ঘটেছে, আর আপনার জন্য প্রতিটির মানে`,
              },
              { en: "A phone alert the same day, every time it happens", bn: "প্রতিবার সেদিনই ফোনে অ্যালার্ট" },
            ]}
          >
            <ul className="divide-y divide-cell-rule">
              {rest.slice(0, 4).map((e) => (
                <EventRow key={e.id} e={e} />
              ))}
            </ul>
          </AnswerLock>
        )}
      </div>
    </section>
  );
}
