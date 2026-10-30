"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { apiGetDesk, type Desk, type DeskItem, type LetterPart, type MorningBriefItem } from "@/lib/api";
import { usePremium, PREMIUM_PATH } from "@/lib/premium";
import { T } from "@/components/i18n/T";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import { IconBell, IconCalendar, IconNews, IconSun } from "@/components/ui/icons";
import { Locked } from "@/components/premium/AnswerLock";
import PageQuestions, { type PageQuestion } from "@/components/premium/PageQuestions";
import { dayShort } from "@/components/dividend-calendar/dates";

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

const things = (n: number) => ({ en: `${n} ${n === 1 ? "thing" : "things"}`, bn: `${n}টি বিষয়` });

/**
 * Your Desk (`/desk`, 2026-10-31, the Premium Desk plan): today's edition of
 * what happened and what is coming on the reader's shares, by time of day —
 * Before the bell (9 AM brief) · After the close (the watcher + Buy more /
 * Sell flips) · Friday letter · Watching (what they have set up) — from one
 * `GET /api/user/desk`. Every push, the renewal reminder and the dashboard's
 * Desk card open here.
 *
 * Free readers: every after-close item is open (the same facts the dashboard
 * stories and the watchlist show free); the letter's parts 2–4 sit under
 * `Locked` (screen-only), and ONE `PageQuestions` card
 * (`#desk-premium`) names what Premium adds, from their own counts. The 9 AM
 * brief is only built for Premium readers, so a free reader's section says
 * what it is instead of showing made-up items.
 */
export default function DeskClient() {
  const { isLoggedIn, isLoading } = useAuth();
  const { isPremium, daysLeft, premiumSource } = usePremium();
  const [desk, setDesk] = useState<Desk | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) return;
    let live = true;
    apiGetDesk()
      .then((d) => live && setDesk(d))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [isLoggedIn]);

  if (isLoading || (isLoggedIn && !desk && !failed)) return <DeskSkeleton />;
  if (!isLoggedIn) return <GuestDesk />;
  if (failed || !desk) {
    return (
      <ErrorState
        title={<T en="Your Desk didn't load" bn="আপনার ডেস্ক লোড হয়নি" />}
        message={<T en="Please try again in a moment." bn="একটু পরে আবার চেষ্টা করুন।" />}
        reload
      />
    );
  }
  if (!desk.has_shares) {
    return (
      <EmptyState
        title={<T en="Add your shares to fill your Desk" bn="ডেস্ক ভরাতে আপনার শেয়ার যোগ করুন" />}
        message={
          <T
            en="Your Desk shows what happens on the shares you own or follow: after every close, before the open, and in a letter every Friday."
            bn="আপনার কেনা বা অনুসরণ করা শেয়ারে কী ঘটছে, তা দেখায় আপনার ডেস্ক: প্রতিদিন বাজার বন্ধের পর, বাজার খোলার আগে, আর প্রতি শুক্রবার একটি চিঠিতে।"
          />
        }
        actions={[
          { href: "/portfolio", label: <T en="Add your portfolio" bn="পোর্টফোলিও যোগ করুন" />, primary: true },
          { href: "/watchlist", label: <T en="Build your watchlist" bn="ওয়াচলিস্ট বানান" /> },
        ]}
      />
    );
  }

  const premium = isPremium || desk.premium;
  const today = dayShort(desk.day);
  const ending = premium && premiumSource === "paid" && daysLeft > 0 && daysLeft <= 7;

  return (
    <div className="desk">
      <p className="desk-date">
        <T en={today.en} bn={today.bn} />
      </p>

      {ending && (
        <p className="desk-renew">
          <T
            en={`Your Premium ends in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}. It never renews by itself.`}
            bn={`আপনার প্রিমিয়াম শেষ হতে আর ${daysLeft} দিন বাকি। এটি নিজে থেকে নবায়ন হয় না।`}
          />{" "}
          <Link href={`${PREMIUM_PATH}#pay`} className="font-semibold text-primary-ink hover:underline">
            <T en="Choose a plan" bn="প্ল্যান বেছে নিন" />
          </Link>
        </p>
      )}

      {desk.month.total > 0 && (
        <p className="desk-month">
          <T
            en={`In the last 30 days your Desk flagged ${things(desk.month.total).en} on your shares${desk.month.phrase_en ? `: ${desk.month.phrase_en}` : ""}.`}
            bn={`গত 30 দিনে আপনার ডেস্ক আপনার শেয়ারে ${things(desk.month.total).bn} পেয়েছে${desk.month.phrase_bn ? `: ${desk.month.phrase_bn}` : ""}।`}
          />
        </p>
      )}

      <ol className="desk-rows">
        <DeskSection
          id="brief"
          icon={<IconSun size={18} />}
          when={<T en="9:00 AM" bn="সকাল 9টা" />}
          title={<T en="Before the bell" bn="বাজার খোলার আগে" />}
          count={
            !premium ? (
              <T
                en="A short brief on the mornings something is about your shares: results out overnight, a meeting today, the last day to buy before a record date."
                bn="আপনার শেয়ারে কিছু থাকলে সকালে একটি ছোট খবর: রাতে আসা ফল, আজকের সভা, রেকর্ড ডেটের আগে কেনার শেষ দিন।"
              />
            ) : desk.brief?.items.length ? (
              <T en={`${things(desk.brief.items.length).en} before today's open.`} bn={`আজ বাজার খোলার আগে ${things(desk.brief.items.length).bn}।`} />
            ) : (
              <T en="Nothing to tell you before the open today." bn="আজ বাজার খোলার আগে জানানোর মতো কিছু নেই।" />
            )
          }
        >
          {premium && desk.brief?.items.length ? (
            <ul className="desk-items">
              {desk.brief.items.map((i, k) => (
                <BriefRow key={`${i.kind}-${i.code}-${k}`} i={i} />
              ))}
            </ul>
          ) : null}
        </DeskSection>

        <DeskSection
          id="after"
          icon={<IconBell size={18} />}
          when={<T en="After the close" bn="বাজার বন্ধের পর" />}
          title={<T en="What happened on your shares" bn="আপনার শেয়ারে যা ঘটেছে" />}
          count={
            desk.after_close ? (
              <T
                en={`${things(desk.after_close.items.length).en} on ${dayShort(desk.after_close.day).en}.`}
                bn={`${dayShort(desk.after_close.day).bn}: ${things(desk.after_close.items.length).bn}।`}
              />
            ) : (
              <T en="Nothing new on your shares in the last few days. We check after every close." bn="গত কয়েক দিনে আপনার শেয়ারে নতুন কিছু নেই। প্রতিদিন বাজার বন্ধের পর আমরা দেখি।" />
            )
          }
        >
          {desk.after_close && desk.after_close.items.length > 0 && (
            <ul className="desk-items">
              {desk.after_close.items.map((i) => <ItemRow key={i.id} i={i} />)}
            </ul>
          )}
        </DeskSection>

        <DeskSection
          id="letter"
          icon={<IconNews size={18} />}
          when={<T en="Friday" bn="শুক্রবার" />}
          title={<T en="Your weekly letter" bn="আপনার সাপ্তাহিক চিঠি" />}
          count={
            desk.letter ? (
              <T
                en={`The week from ${dayShort(desk.letter.week).en}, in four parts.`}
                bn={`${dayShort(desk.letter.week).bn} থেকে শুরু সপ্তাহ, চার ভাগে।`}
              />
            ) : (
              <T en="Your first letter comes on Friday." bn="আপনার প্রথম চিঠি আসবে শুক্রবার।" />
            )
          }
        >
          {desk.letter && (
            <div className="desk-letter">
              {desk.letter.parts.map((p) => (
                <LetterBlock key={p.key} part={p} premium={premium} />
              ))}
            </div>
          )}
        </DeskSection>

        <DeskSection
          id="watching"
          icon={<IconCalendar size={18} />}
          when={<T en="Watching" bn="নজরে আছে" />}
          title={<T en="What you have set up" bn="আপনি যা চালু রেখেছেন" />}
          count={
            <T
              en={`${desk.watching.holdings} shares you own and ${desk.watching.watchlist} you follow.`}
              bn={`আপনার কেনা ${desk.watching.holdings}টি আর অনুসরণ করা ${desk.watching.watchlist}টি শেয়ার।`}
            />
          }
        >
          <ul className="desk-watch">
            <WatchRow n={desk.watching.alerts} href="/alerts" label={{ en: "price alerts on", bn: "প্রাইস অ্যালার্ট চালু" }} />
            <WatchRow n={desk.watching.dividend_reminders} href="/dividend-calendar" label={{ en: "dividend reminders", bn: "ডিভিডেন্ড রিমাইন্ডার" }} />
            <WatchRow n={desk.watching.rank_alerts} href="/dsestockranking" label={{ en: "rank alerts", bn: "র‍্যাঙ্ক অ্যালার্ট" }} />
          </ul>
        </DeskSection>
      </ol>

      <PageQuestions
        id="desk-premium"
        area="desk"
        className="mt-8"
        title={{ en: "Your Desk shows what happened. Premium tells you the same day, and what it means.", bn: "আপনার ডেস্ক দেখায় কী ঘটেছে। প্রিমিয়াম সেদিনই জানায়, আর এর মানে কী।" }}
        rows={deskQuestions(desk)}
        label={{ en: "Your Desk in full", bn: "পুরো ডেস্ক" }}
      />
    </div>
  );
}

function deskQuestions(desk: Desk): PageQuestion[] {
  const rows: PageQuestion[] = [];
  const ac = desk.after_close?.items.length ?? 0;
  if (ac > 0) {
    rows.push({
      key: "after",
      fact: { en: `${ac} ${ac === 1 ? "thing" : "things"} after the close`, bn: `বাজার বন্ধের পর ${ac}টি বিষয়` },
      ask: { en: "Would you rather hear it on your phone that evening?", bn: "সেদিন সন্ধ্যায়ই ফোনে জানতে চান?" },
      hint: { en: "Every one, sent to your phone the same day.", bn: "প্রতিটি, সেদিনই ফোনে নোটিফিকেশনসহ।" },
    });
  }
  if (desk.month.total > 0) {
    rows.push({
      key: "month",
      fact: { en: `${desk.month.total} this month`, bn: `এ মাসে ${desk.month.total}টি` },
      ask: { en: "Would you have known the same day?", bn: "আপনি কি সেদিনই জানতেন?" },
      hint: { en: "Premium sends each one after the close.", bn: "প্রিমিয়াম প্রতিটি বাজার বন্ধের পর পাঠায়।" },
    });
  }
  if (desk.letter) {
    rows.push({
      key: "letter",
      fact: { en: "Your letter has 4 parts", bn: "আপনার চিঠির 4টি অংশ" },
      ask: { en: "What happened in the market, and what is next on your shares?", bn: "বাজারে কী ঘটল, আর সামনে আপনার শেয়ারে কী আসছে?" },
      hint: { en: "The market in five lines, new names on our lists, next week's dates.", bn: "পাঁচ লাইনে বাজার, তালিকায় নতুন নাম, আগামী সপ্তাহের তারিখ।" },
    });
  }
  rows.push({
    key: "brief",
    fact: { en: "Before the bell", bn: "বাজার খোলার আগে" },
    ask: { en: "What should you know before 10 AM?", bn: "সকাল 10টার আগে কী জানা দরকার?" },
    hint: { en: "A short brief at 9 AM on the days something is about your shares.", bn: "আপনার শেয়ারে কিছু থাকলে সকাল 9টায় একটি ছোট খবর।" },
  });
  return rows;
}

function DeskSection({
  id,
  icon,
  when,
  title,
  count,
  children,
}: {
  id: string;
  icon: ReactNode;
  when: ReactNode;
  title: ReactNode;
  count: ReactNode;
  children?: ReactNode;
}) {
  return (
    <li id={id} className="desk-row">
      <div className="desk-when">
        <span className="desk-icon" aria-hidden="true">{icon}</span>
        <span>{when}</span>
      </div>
      <section className="desk-body" aria-labelledby={`${id}-h`}>
        <h2 id={`${id}-h`} className="desk-title">{title}</h2>
        <p className="desk-count">{count}</p>
        {children}
      </section>
    </li>
  );
}

/** The level dot's colour: good news, worth a look, a warning. */
const DOT: Record<string, string> = { good: "desk-dot--good", bad: "desk-dot--bad", watch: "desk-dot--watch" };

function ItemRow({ i }: { i: DeskItem }) {
  return (
    <li>
      <Link href={i.url} prefetch={false} className="desk-item">
        <span className={`desk-dot ${DOT[i.level] ?? ""}`} aria-hidden="true" />
        <span className="min-w-0">
          <span className="desk-item-title">
            <T en={i.title_en} bn={i.title_bn || i.title_en} />
          </span>
          {i.body_en && (
            <span className="desk-item-body">
              <T en={i.body_en} bn={i.body_bn || i.body_en} />
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}

function BriefRow({ i }: { i: MorningBriefItem }) {
  return (
    <li>
      <Link href={i.url} prefetch={false} className="desk-item">
        <span className={`desk-dot ${DOT[i.level] ?? ""}`} aria-hidden="true" />
        <span className="desk-item-title">
          <T en={i.title_en} bn={i.title_bn || i.title_en} />
        </span>
      </Link>
    </li>
  );
}

function LetterBlock({ part, premium }: { part: LetterPart; premium: boolean }) {
  const lines = (
    <ul className="desk-lines">
      {part.lines.map((ln, k) => (
        <li key={k} className={ln.tone === "good" ? "desk-line--good" : ln.tone === "bad" ? "desk-line--bad" : undefined}>
          {ln.url ? (
            <Link href={ln.url} prefetch={false} className="hover:underline">
              <T en={ln.en} bn={ln.bn || ln.en} />
            </Link>
          ) : (
            <T en={ln.en} bn={ln.bn || ln.en} />
          )}
        </li>
      ))}
    </ul>
  );
  return (
    <div className="desk-part">
      <h3 className="desk-part-title">
        <T en={part.title_en} bn={part.title_bn} />
        {part.free && !premium && (
          <span className="desk-free">
            <T en="Free" bn="ফ্রি" />
          </span>
        )}
      </h3>
      {part.free ? lines : <Locked>{lines}</Locked>}
    </div>
  );
}

function WatchRow({ n, href, label }: { n: number; href: string; label: { en: string; bn: string } }) {
  return (
    <li>
      <Link href={href} prefetch={false} className="desk-watch-row">
        <b className="num">{n}</b>
        <span>
          <T en={label.en} bn={label.bn} />
        </span>
      </Link>
    </li>
  );
}

function GuestDesk() {
  return (
    <div className="soft-card p-5 sm:p-6">
      <h2 className="text-lg font-bold text-text-main">
        <T en="Your Desk fills up once you have an account" bn="অ্যাকাউন্ট খুললেই আপনার ডেস্ক ভরে উঠবে" />
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-text-main">
        <T
          en="Tell us the shares you own or follow. After every close your Desk says what happened on them, before the open it says what is coming, and every Friday it sends you a letter on your week."
          bn="আপনার কেনা বা অনুসরণ করা শেয়ারগুলো জানান। প্রতিদিন বাজার বন্ধের পর ডেস্ক বলে সেগুলোতে কী ঘটল, বাজার খোলার আগে বলে সামনে কী আসছে, আর প্রতি শুক্রবার আপনার সপ্তাহ নিয়ে একটি চিঠি পাঠায়।"
        />
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button href="/register" variant="primary">
          <T en="Create a free account" bn="ফ্রি অ্যাকাউন্ট খুলুন" />
        </Button>
        <Button href="/login" variant="quiet">
          <T en="Sign in" bn="সাইন ইন" />
        </Button>
      </div>
    </div>
  );
}

function DeskSkeleton() {
  return (
    <div className="desk" aria-busy="true">
      <Skeleton width="40%" height={18} />
      {[0, 1, 2].map((k) => (
        <div key={k} className="soft-card mt-4 grid gap-2 p-5">
          <Skeleton width="30%" />
          <Skeleton width="80%" />
          <Skeleton width="60%" />
        </div>
      ))}
    </div>
  );
}
