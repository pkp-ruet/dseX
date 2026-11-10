"use client";

import Link from "@/components/ui/Link";
import { useEffect, useState } from "react";
import type { ScreenerReadyCard, ScreenerSaved } from "@/lib/api";
import { usePremium } from "@/lib/premium";
import FindCard from "@/components/home/personalized/FindCard";
import { T } from "@/components/i18n/T";
import { IconArrowRight, IconCheck, IconTune } from "@/components/ui/icons";

/** The screen the picture shows: the one most readers start from. */
const FEATURED = "high_dividend";
/** Ready-made screens offered as a place to start. */
const STARTS = 4;

/**
 * "Stock screener" on the dashboard (2026-11-06, user: "only featured card
 * and link to screener. no screener here"): what the screener does in three
 * lines, a picture of one ready-made screen (its filters in words and how
 * many shares match today — a picture, not controls), a few ready-made
 * screens to start from, and one link into `/screener`. Nothing filters
 * here. Premium readers with saved screens get one line on who joined at
 * the last daily check.
 *
 * Replaced `ScreenerCard` (chips that ran the screens on the dashboard + the
 * top three rows of the chosen one).
 */
export default function ScreenerFeature({
  ready,
  saved = [],
}: {
  ready: ScreenerReadyCard[] | null | undefined;
  saved?: ScreenerSaved[];
}) {
  const { isPremium } = usePremium();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const list = ready ?? [];
  const featured = list.find((g) => g.id === FEATURED) ?? list[0] ?? null;
  const universe = featured?.universe ?? 0;
  const starts = list.slice(0, STARTS);
  const joined =
    mounted && isPremium ? saved.reduce((n, s) => n + (s.new_today?.length ?? 0), 0) : 0;

  return (
    <FindCard
      id="fc-screener"
      icon={<IconTune size={14} />}
      eyebrow={<T en="Stock screener" bn="স্টক স্ক্রিনার" />}
      tag={<T en="Free" bn="ফ্রি" />}
      title={<T en="Find shares by the numbers you care about" bn="যে সংখ্যা আপনার কাছে জরুরি, তা দিয়ে শেয়ার খুঁজুন" />}
      lead={
        universe > 0 ? (
          <T
            en={`Filter all ${universe} DSE shares by price, dividend, profit, loans and more.`}
            bn={`দাম, ডিভিডেন্ড, মুনাফা, ঋণ আর আরও অনেক কিছু দিয়ে ডিএসইর ${universe}টি শেয়ার ছেঁকে নিন।`}
          />
        ) : (
          <T
            en="Filter every DSE share by price, dividend, profit, loans and more."
            bn="দাম, ডিভিডেন্ড, মুনাফা, ঋণ আর আরও অনেক কিছু দিয়ে ডিএসইর প্রতিটি শেয়ার ছেঁকে নিন।"
          />
        )
      }
      href="/screener"
      allLabel={<T en="Open" bn="খুলুন" />}
      footLabel={<T en="Open the stock screener" bn="স্টক স্ক্রিনার খুলুন" />}
    >
      <div className="fcs">
        <ul className="fcs-points">
          <li>
            <IconCheck size={14} />
            <T en="Pick a filter, see how many shares pass" bn="একটি ফিল্টার বাছুন, কতগুলো শেয়ার মেলে দেখুন" />
          </li>
          <li>
            <IconCheck size={14} />
            <T en="Sort by any figure, every row free" bn="যেকোনো সংখ্যায় সাজান, সব সারি ফ্রি" />
          </li>
          <li>
            <IconCheck size={14} />
            <T en="Start from a ready-made screen" bn="তৈরি করা স্ক্রিন থেকে শুরু করুন" />
          </li>
        </ul>

        {featured && (
          <Link
            prefetch={false}
            href={`/screener?ready=${encodeURIComponent(featured.id)}`}
            className="fcs-shot"
            aria-label={`${featured.title_en}: ${featured.passed}`}
          >
            <span className="fcs-shot-label">
              <T en="Example" bn="উদাহরণ" /> · <T en={featured.title_en} bn={featured.title_bn} />
            </span>
            {featured.words.length > 0 && (
              <span className="fcs-chips" aria-hidden="true">
                {featured.words.slice(0, 3).map((w) => (
                  <span key={w.key} className="fcs-chip">
                    <T en={w.en} bn={w.bn} />
                  </span>
                ))}
              </span>
            )}
            <span className="fcs-shot-count">
              <b className="nums">
                <T en={String(featured.passed)} bn={`${featured.passed}টি`} />
              </b>
              <span>
                <T
                  en={`of ${featured.universe} shares match today`}
                  bn={`শেয়ার আজ মিলেছে, মোট ${featured.universe}টির মধ্যে`}
                />
              </span>
            </span>
          </Link>
        )}
      </div>

      {starts.length > 0 && (
        <div className="fcs-starts">
          <p className="fcs-starts-label">
            <T en="Start with" bn="শুরু করুন" />
          </p>
          <ul>
            {starts.map((g) => (
              <li key={g.id}>
                <Link prefetch={false} href={`/screener?ready=${encodeURIComponent(g.id)}`} className="fcs-start">
                  <T en={g.title_en} bn={g.title_bn} />
                  <span className="fcs-start-n nums">{g.passed}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {joined > 0 && (
        <Link prefetch={false} href="/screener?tab=saved" className="fcs-saved">
          <span>
            <T
              en={`Your saved screens: ${joined} new ${joined === 1 ? "share" : "shares"} at the last check`}
              bn={`আপনার সেভ করা স্ক্রিন: শেষ যাচাইয়ে ${joined}টি নতুন শেয়ার`}
            />
          </span>
          <IconArrowRight size={14} />
        </Link>
      )}
    </FindCard>
  );
}
