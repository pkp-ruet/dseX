"use client";

import Link from "@/components/ui/Link";
import { useEffect, useState } from "react";
import type { ScreenerReadyCard, ScreenerSaved } from "@/lib/api";
import { usePremium } from "@/lib/premium";
import FindCard from "@/components/home/personalized/FindCard";
import { T } from "@/components/i18n/T";
import { IconArrowRight, IconCheck, IconTune } from "@/components/ui/icons";

/** The list the picture shows: the one most readers start from. */
const FEATURED = "strong_cheap";
/** Lists offered as a place to start. */
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
 * top three rows of the chosen one). Premium since 2026-11-14 (the screener
 * is): a gold card, the goals with today's counts (counts are free), never a
 * share's name.
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
      tone="gold"
      tag={<T en="Premium" bn="প্রিমিয়াম" />}
      title={<T en="Find the shares that fit what you want" bn="আপনার চাওয়ার সাথে মেলে এমন শেয়ার খুঁজুন" />}
      lead={
        universe > 0 ? (
          <T
            en={`Pick what you are looking for and see how many of the ${universe} DSE shares fit today.`}
            bn={`কী খুঁজছেন বাছুন, দেখুন আজ ডিএসইর ${universe}টি শেয়ারের কতগুলো মেলে।`}
          />
        ) : (
          <T
            en="Pick what you are looking for and see how many DSE shares fit today."
            bn="কী খুঁজছেন বাছুন, দেখুন আজ ডিএসইর কতগুলো শেয়ার মেলে।"
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
            <T en="Six ready lists: strong and cheap, steady dividends and more" bn="তৈরি ছয়টি তালিকা: শক্তিশালী ও কম দামে, নিয়মিত ডিভিডেন্ড আরও অনেক" />
          </li>
          <li>
            <IconCheck size={14} />
            <T en="Or make your own, with our own analysis" bn="বা নিজে বানান, আমাদের নিজের বিশ্লেষণ দিয়ে" />
          </li>
          <li>
            <IconCheck size={14} />
            <T en="Watch a list; we tell you when a share joins" bn="তালিকায় নজর রাখুন; নতুন শেয়ার যোগ হলে জানাব" />
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
            <span className="fcs-line">
              <T en={featured.blurb_en} bn={featured.blurb_bn} />
            </span>
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
