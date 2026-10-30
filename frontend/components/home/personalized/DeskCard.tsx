"use client";

import Link from "next/link";
import type { Lang } from "@/context/LangContext";
import type { DeskSummary } from "@/lib/api";
import Button from "@/components/ui/Button";
import { IconBell, IconCalendar, IconNews, IconSun } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { dayShort } from "@/components/dividend-calendar/dates";

/**
 * Your Desk on the dashboard (2026-10-31, the Premium Desk plan — it replaced
 * `PremiumWeekCard`): today's edition in three lines — before the bell, after
 * the close, the Friday letter — each with its count and its first item, and
 * one button to `/desk`. Facts on the reader's own shares are free; the
 * morning brief is Premium (it is only built for Premium readers), so a free
 * reader's first line says what it is instead. Sits at the end of the Your
 * money chapter; a reader with no shares gets the add buttons.
 */
export default function DeskCard({
  desk,
  hasStocks,
  premium,
  lang = "en",
}: {
  desk: DeskSummary | null | undefined;
  hasStocks: boolean;
  premium: boolean;
  lang?: Lang;
}) {
  const bn = lang === "bn";

  if (!hasStocks) {
    return (
      <section className="soft-card dash-box p-4 sm:p-5" lang={bn ? "bn" : undefined}>
        <h3 className="text-base font-bold text-text-main">
          <T en="Your Desk" bn="আপনার ডেস্ক" />
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-text-main">
          <T
            en="Add the shares you own or follow, and your Desk fills up every day: what happened after the close, what is coming, and a letter every Friday."
            bn="আপনার কেনা বা অনুসরণ করা শেয়ার যোগ করুন, তাহলে আপনার ডেস্ক প্রতিদিন ভরে উঠবে: বাজার বন্ধের পর কী ঘটল, সামনে কী আসছে, আর প্রতি শুক্রবার একটি চিঠি।"
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

  const d = desk;
  const ac = d?.after_close_n ?? 0;
  const acDay = d?.after_close_day ? dayShort(d.after_close_day) : null;

  return (
    <section className="soft-card dash-box overflow-hidden" lang={bn ? "bn" : undefined}>
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 sm:px-5">
        <h3 className="text-base font-bold text-text-main">
          <T en="Your Desk today" bn="আজ আপনার ডেস্কে" />
        </h3>
        <Link href="/desk" prefetch={false} className="inline-flex min-h-10 shrink-0 items-center text-sm font-semibold text-primary-ink hover:underline active:opacity-70">
          <T en="Open" bn="খুলুন" />
          <span aria-hidden="true">&nbsp;→</span>
        </Link>
      </div>
      <ul className="desk-card-rows">
        <DeskLine
          icon={<IconSun size={16} />}
          when={<T en="Before the bell" bn="বাজার খোলার আগে" />}
          href="/desk#brief"
        >
          {premium ? (
            d?.brief_n ? (
              <>
                <b><T en={`${d.brief_n} ${d.brief_n === 1 ? "thing" : "things"} before today's open`} bn={`আজ বাজার খোলার আগে ${d.brief_n}টি খবর`} /></b>
                {d.brief_first && <span className="block"><T en={d.brief_first.title_en} bn={d.brief_first.title_bn || d.brief_first.title_en} /></span>}
              </>
            ) : (
              <T en="Nothing to tell you before the open today." bn="আজ বাজার খোলার আগে জানানোর মতো কিছু নেই।" />
            )
          ) : (
            <T
              en="Premium sends a short brief at 9 AM on the days something is about your shares."
              bn="আপনার শেয়ারে কিছু থাকলে প্রিমিয়াম সকাল 9টায় একটি ছোট খবর পাঠায়।"
            />
          )}
        </DeskLine>
        <DeskLine icon={<IconBell size={16} />} when={<T en="After the close" bn="বাজার বন্ধের পর" />} href="/desk#after">
          {ac > 0 && acDay ? (
            <>
              <b>
                <T
                  en={`${ac} ${ac === 1 ? "thing" : "things"} on your shares, ${acDay.en}`}
                  bn={`আপনার শেয়ারে ${ac}টি খবর, ${acDay.bn}`}
                />
              </b>
              {d?.after_close_first && (
                <span className="block">
                  <T en={d.after_close_first.title_en} bn={d.after_close_first.title_bn || d.after_close_first.title_en} />
                </span>
              )}
            </>
          ) : (
            <T en="Nothing new on your shares in the last few days." bn="গত কয়েক দিনে আপনার শেয়ারে নতুন কিছু নেই।" />
          )}
        </DeskLine>
        <DeskLine icon={<IconNews size={16} />} when={<T en="Friday letter" bn="শুক্রবারের চিঠি" />} href="/desk#letter">
          {d?.letter_first ? (
            <T en={d.letter_first.en} bn={d.letter_first.bn || d.letter_first.en} />
          ) : (
            <T en="Your first letter comes on Friday." bn="আপনার প্রথম চিঠি আসবে শুক্রবার।" />
          )}
        </DeskLine>
      </ul>
      <div className="px-4 pb-4 sm:px-5">
        <Button href="/desk" variant="quiet" block>
          <IconCalendar size={16} />
          <T en="Open your Desk" bn="আপনার ডেস্ক খুলুন" />
        </Button>
      </div>
    </section>
  );
}

function DeskLine({
  icon,
  when,
  href,
  children,
}: {
  icon: React.ReactNode;
  when: React.ReactNode;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link href={href} prefetch={false} className="desk-card-row">
        <span className="desk-card-icon" aria-hidden="true">{icon}</span>
        <span className="min-w-0">
          <span className="desk-card-when">{when}</span>
          <span className="desk-card-text">{children}</span>
        </span>
      </Link>
    </li>
  );
}
