"use client";

import { useEffect, useState } from "react";
import Link from "@/components/ui/Link";
import { useAuth } from "@/context/AuthContext";
import {
  apiGetNotifications,
  apiMarkNotificationsSeen,
  type LetterPart,
  type NotificationItem,
  type NotificationsFeed,
} from "@/lib/api";
import { usePremium, PREMIUM_PATH } from "@/lib/premium";
import { T } from "@/components/i18n/T";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import { IconChevronDown, IconLock } from "@/components/ui/icons";
import { Locked } from "@/components/premium/AnswerLock";
import { dayShort } from "@/components/dividend-calendar/dates";
import { NOTIFICATIONS_SEEN_EVENT } from "@/components/notifications/NotificationBell";
import { trackEvent } from "@/lib/track";
import ComingUp from "@/components/notifications/ComingUp";

type Pair = { en: string; bn: string };

/** What each row is, in two words. */
const KIND: Record<string, Pair> = {
  results: { en: "Results", bn: "আর্থিক ফল" },
  grade: { en: "Grade change", bn: "গ্রেড বদল" },
  red_flag: { en: "Warning", bn: "সতর্কতা" },
  record: { en: "Record date", bn: "রেকর্ড ডেট" },
  category: { en: "Category change", bn: "ক্যাটাগরি বদল" },
  drop: { en: "Big fall", bn: "বড় দরপতন" },
  low52: { en: "Yearly low", bn: "বছরের সর্বনিম্ন" },
  breakeven: { en: "Back to your price", bn: "কেনা দামে ফেরা" },
  alert: { en: "Price alert", bn: "প্রাইস অ্যালার্ট" },
  brief: { en: "9 AM brief", bn: "সকাল 9টার খবর" },
  letter: { en: "Friday letter", bn: "শুক্রবারের চিঠি" },
  screen: { en: "Saved screen", bn: "সেভ করা স্ক্রিন" },
  rule: { en: "Your rule", bn: "আপনার নিয়ম" },
};

/** The watcher's kinds: the "your shares" layer of THE Premium line. A free
 *  reader sees the week's one marked `free`; the rest are counted. */
const WATCH_KINDS = new Set(["results", "grade", "red_flag", "record", "category", "drop", "low52", "breakeven"]);

/** Counted words: [one, many, Bengali]. */
const COUNT_WORDS: Record<string, [string, string, string]> = {
  results: ["results report", "results reports", "আর্থিক ফল"],
  grade: ["grade change", "grade changes", "গ্রেড বদল"],
  red_flag: ["warning", "warnings", "সতর্কতা"],
  record: ["record date", "record dates", "রেকর্ড ডেট"],
  category: ["category change", "category changes", "ক্যাটাগরি বদল"],
  drop: ["big fall", "big falls", "বড় দরপতন"],
  low52: ["yearly low", "yearly lows", "বছরের সর্বনিম্ন দাম"],
  breakeven: ["return to your price", "returns to your price", "কেনা দামে ফেরা"],
};

/** "2 results reports, 1 warning and 1 big fall" in both languages. */
function kindsPhrase(items: NotificationItem[]): Pair {
  const by = new Map<string, number>();
  for (const i of items) by.set(i.kind, (by.get(i.kind) ?? 0) + 1);
  const top = [...by.entries()].sort((a, b) => b[1] - a[1]);
  const en = top.map(([k, n]) => `${n} ${(COUNT_WORDS[k] ?? ["update", "updates"])[n === 1 ? 0 : 1]}`);
  const bn = top.map(([k, n]) => `${n}টি ${(COUNT_WORDS[k] ?? ["", "", "খবর"])[2]}`);
  const join = (xs: string[], and: string) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} ${and} ${xs[xs.length - 1]}`);
  return { en: join(en, "and"), bn: join(bn, "ও") };
}

const DHAKA_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" });
const DHAKA_TIME = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", hour: "numeric", minute: "2-digit" });
const DHAKA_HOUR = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", hour: "2-digit", hour12: false });

function dhakaDay(iso: string): string {
  return DHAKA_DAY.format(new Date(iso));
}

/** "4:05 PM" / "বিকেল 4:05". */
function timeWords(iso: string): Pair {
  const d = new Date(iso);
  const en = DHAKA_TIME.format(d);
  const h = Number(DHAKA_HOUR.format(d));
  const part = h < 5 ? "রাত" : h < 12 ? "সকাল" : h < 15 ? "দুপুর" : h < 18 ? "বিকেল" : h < 20 ? "সন্ধ্যা" : "রাত";
  const bn = `${part} ${en.replace(/\s?[AP]M$/, "")}`;
  return { en, bn };
}

/** "Today" / "Yesterday" / "Tue 4 Nov". */
function dayHead(day: string): Pair {
  const today = DHAKA_DAY.format(new Date());
  const yest = DHAKA_DAY.format(new Date(Date.now() - 86_400_000));
  if (day === today) return { en: "Today", bn: "আজ" };
  if (day === yest) return { en: "Yesterday", bn: "গতকাল" };
  return dayShort(day);
}

/**
 * Updates (`/notifications`, named "Updates" since 2026-11-20, the app map —
 * the one feed of news on the reader's shares; it took in the watchlist's
 * "Coming up" card and the Price alerts page). Coming up first, then
 * everything
 * we noticed on the reader's shares in the last 30 days, newest first, grouped
 * by day — results, grade changes, warnings, record dates, big falls, price
 * alerts that hit, the 9 AM brief (Premium) and the Friday letter. Rows that
 * came after the last visit are marked new; opening the page marks them read
 * (the navbar bell clears). Every multi-thing push opens here.
 */
export default function NotificationsClient() {
  const { isLoggedIn, isLoading } = useAuth();
  const { isPremium, sharesOpen } = usePremium();
  const [feed, setFeed] = useState<NotificationsFeed | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;
    let live = true;
    apiGetNotifications()
      .then((f) => {
        if (!live) return;
        setFeed(f);
        // The rows keep their "new" mark for this visit; the bell clears now.
        apiMarkNotificationsSeen()
          .then(() => window.dispatchEvent(new Event(NOTIFICATIONS_SEEN_EVENT)))
          .catch(() => {});
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [isLoggedIn]);

  // `#letter` opens the newest letter, `#letter-2026-11-01` that one.
  useEffect(() => {
    if (!feed) return;
    const hash = window.location.hash.slice(1);
    if (!hash.startsWith("letter")) return;
    const letters = feed.items.filter((i) => i.kind === "letter");
    const hit = hash === "letter" ? letters[0] : letters.find((i) => i.id === hash);
    if (!hit) return;
    setOpen(hit.id);
    requestAnimationFrame(() => document.getElementById(hit.id)?.scrollIntoView({ block: "start" }));
  }, [feed]);

  if (isLoading || (isLoggedIn && !feed && !failed)) return <NotificationsSkeleton />;
  if (!isLoggedIn) {
    return (
      <EmptyState
        title={<T en="Sign in to see your notifications" bn="নোটিফিকেশন দেখতে সাইন ইন করুন" />}
        message={
          <T
            en="Once you tell us the shares you own or follow, we list here everything we notice on them."
            bn="আপনার কেনা বা অনুসরণ করা শেয়ার জানালে, সেগুলোতে যা কিছু আমরা দেখি, সব এখানে থাকে।"
          />
        }
        actions={[
          { href: "/login", label: <T en="Sign in" bn="সাইন ইন" />, primary: true },
          { href: "/register", label: <T en="Create a free account" bn="ফ্রি অ্যাকাউন্ট খুলুন" /> },
        ]}
      />
    );
  }
  if (failed || !feed) {
    return (
      <ErrorState
        title={<T en="Your notifications didn't load" bn="নোটিফিকেশন লোড হয়নি" />}
        message={<T en="Please try again in a moment." bn="একটু পরে আবার চেষ্টা করুন।" />}
        reload
      />
    );
  }

  const premium = isPremium || sharesOpen || feed.premium;
  // THE Premium line, step 3 (2026-11-22): what the watcher caught on a free
  // reader's shares is counted by kind; the week's one marked `free` stays
  // open. Screen-only, like every lock (the API still sends every row).
  const hidden = premium ? [] : feed.items.filter((i) => WATCH_KINDS.has(i.kind) && !i.free);
  const hiddenIds = new Set(hidden.map((i) => i.id));
  // A paused rule that fires is told once a day at most (step 6): the
  // first one each day stays, the rest are left out.
  const pausedDays = new Set<string>();
  const shown = feed.items.filter((i) => {
    if (hiddenIds.has(i.id)) return false;
    if (!premium && i.kind === "rule" && i.paused) {
      const d = dhakaDay(i.at);
      if (pausedDays.has(d)) return false;
      pausedDays.add(d);
    }
    return true;
  });

  if (feed.items.length === 0) {
    return feed.has_shares ? (
      <div className="nt">
      <ComingUp />
      <EmptyState
        title={<T en="Nothing in the last 30 days" bn="গত 30 দিনে কিছু নেই" />}
        message={
          <T
            en="We check your shares after every close: results, grade changes, warnings, record dates and big moves. They will show up here."
            bn="প্রতিদিন বাজার বন্ধের পর আমরা আপনার শেয়ার দেখি: আর্থিক ফল, গ্রেড বদল, সতর্কতা, রেকর্ড ডেট আর বড় ওঠানামা। সেগুলো এখানে দেখাবে।"
          />
        }
      />
      </div>
    ) : (
      <EmptyState
        title={<T en="Add your shares to get notifications" bn="নোটিফিকেশন পেতে আপনার শেয়ার যোগ করুন" />}
        message={
          <T
            en="We watch the shares you own or follow and tell you what happens on them."
            bn="আপনার কেনা বা অনুসরণ করা শেয়ারে আমরা নজর রাখি, আর সেগুলোতে কী ঘটে তা জানাই।"
          />
        }
        actions={[
          { href: "/portfolio", label: <T en="Add your portfolio" bn="পোর্টফোলিও যোগ করুন" />, primary: true },
          { href: "/watchlist", label: <T en="Build your watchlist" bn="ওয়াচলিস্ট বানান" /> },
        ]}
      />
    );
  }

  const groups: { day: string; items: NotificationItem[] }[] = [];
  for (const it of shown) {
    const day = dhakaDay(it.at);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(it);
    else groups.push({ day, items: [it] });
  }
  const unread = feed.items.filter((i) => i.new).length;

  return (
    <div className="nt">
      <p className="nt-summary">
        {unread > 0 ? (
          <T
            en={`${unread} new since your last visit.`}
            bn={`আপনার আগের ভিজিটের পর ${unread}টি নতুন।`}
          />
        ) : (
          <T en="Nothing new since your last visit." bn="আগের ভিজিটের পর নতুন কিছু নেই।" />
        )}
      </p>

      <ComingUp />

      {hidden.length > 0 && <LockedUpdates items={hidden} />}

      {groups.map((g) => {
        const head = dayHead(g.day);
        return (
          <section key={g.day} className="nt-day" aria-label={head.en}>
            <h2 className="nt-day-head">
              <T en={head.en} bn={head.bn} />
            </h2>
            <ul className="nt-list soft-card">
              {g.items.map((i) => (
                <Row
                  key={i.id}
                  i={i}
                  premium={premium}
                  open={open === i.id}
                  onToggle={() => setOpen((o) => (o === i.id ? null : i.id))}
                />
              ))}
            </ul>
          </section>
        );
      })}

      {!premium && hidden.length === 0 && (
        <p className="nt-premium">
          <T
            en="Premium sends each of these to your phone the same day, and adds a 9 AM brief on the mornings something is about your shares, and the whole Friday letter."
            bn="প্রিমিয়াম এর প্রতিটি সেদিনই আপনার ফোনে পাঠায়, আপনার শেয়ারে কিছু থাকলে সকাল 9টায় একটি ছোট খবর দেয়, আর পুরো শুক্রবারের চিঠি।"
          />{" "}
          <Link
            href={PREMIUM_PATH}
            className="font-semibold text-primary-ink hover:underline"
            onClick={() => trackEvent("premium_lock_tap", { area: "notifications", lock: "notifications-line" })}
          >
            <T en="See Premium" bn="প্রিমিয়াম দেখুন" />
          </Link>
        </p>
      )}
    </div>
  );
}

/** A free reader's count of what the watcher caught (THE Premium line, step 3). */
function LockedUpdates({ items }: { items: NotificationItem[] }) {
  const n = items.length;
  const kinds = kindsPhrase(items);
  const fresh = items.filter((i) => i.new).length;
  useEffect(() => {
    trackEvent("premium_lock_view", { area: "notifications", lock: "updates-count", n });
  }, [n]);
  return (
    <section className="nt-lock" aria-labelledby="nt-lock-h">
      <p className="nt-lock-k">
        <IconLock size={14} />
        <T en="Premium" bn="প্রিমিয়াম" />
      </p>
      <h2 id="nt-lock-h" className="nt-lock-h">
        <T
          en={`${n} more ${n === 1 ? "update" : "updates"} on your shares in the last 30 days`}
          bn={`গত 30 দিনে আপনার শেয়ারে আরও ${n}টি খবর`}
        />
      </h2>
      <p className="nt-lock-kinds">
        <T en={`${kinds.en}.`} bn={`${kinds.bn}।`} />
        {fresh > 0 && <T en={` ${fresh} since your last visit.`} bn={` আগের ভিজিটের পর ${fresh}টি।`} />}
      </p>
      <p className="nt-lock-line">
        <T
          en="Premium shows which shares, what each one means for you, and sends it to your phone the same evening. Below is this week's one, free."
          bn="কোন শেয়ারে, আপনার জন্য প্রতিটির মানে কী, প্রিমিয়াম দেখায়, আর সেদিন সন্ধ্যায়ই ফোনে পাঠায়। নিচে এ সপ্তাহের একটি, ফ্রি।"
        />
      </p>
      <Button
        href={`${PREMIUM_PATH}?src=updates#pay`}
        size="sm"
        onClick={() => trackEvent("premium_lock_tap", { area: "notifications", lock: "updates-count", n })}
      >
        <T en="See which shares" bn="কোন শেয়ার, দেখুন" />
      </Button>
    </section>
  );
}

function Meta({ i }: { i: NotificationItem }) {
  const kind = KIND[i.kind] ?? { en: "Update", bn: "খবর" };
  const t = timeWords(i.at);
  return (
    <span className="nt-meta">
      {i.new && (
        <span className="nt-new">
          <T en="New" bn="নতুন" />
        </span>
      )}
      <span>
        <T en={kind.en} bn={kind.bn} />
      </span>
      {i.code && <span className="nt-code">{i.code}</span>}
      <span>
        <T en={t.en} bn={t.bn} />
      </span>
    </span>
  );
}

const DOT: Record<string, string> = { good: "nt-dot--good", bad: "nt-dot--bad", watch: "nt-dot--watch" };

function Row({
  i,
  premium,
  open,
  onToggle,
}: {
  i: NotificationItem;
  premium: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  // A paused rule (past a free reader's cap): only that it fired (THE
  // Premium line, step 4). Screen-only, like every lock.
  const paused = i.kind === "rule" && i.paused && !premium;
  const body = (
    <>
      <span className={`nt-dot ${paused ? "" : DOT[i.level] ?? ""}`} aria-hidden="true" />
      <span className="nt-text">
        <Meta i={i} />
        {paused ? (
          <>
            <span className="nt-title">
              <T en={`A rule you set on ${i.code} fired`} bn={`${i.code}-এ আপনার দেওয়া একটি নিয়ম কাজ করেছে`} />
            </span>
            <span className="nt-body">
              <T
                en="This rule is paused on a free account. Premium shows what happened, and tells you the same evening."
                bn="ফ্রি অ্যাকাউন্টে এই নিয়মটি বন্ধ আছে। কী হয়েছে, প্রিমিয়াম দেখায়, আর সেদিন সন্ধ্যায়ই জানায়।"
              />
            </span>
          </>
        ) : (
          <>
            <span className="nt-title">
              <T en={i.title_en} bn={i.title_bn || i.title_en} />
            </span>
            {i.body_en && (
              <span className="nt-body">
                <T en={i.body_en} bn={i.body_bn || i.body_en} />
              </span>
            )}
          </>
        )}
      </span>
    </>
  );
  if (paused) {
    return (
      <li id={i.id} className="nt-item" data-new={i.new || undefined}>
        <Link href={`${PREMIUM_PATH}?src=paused-rule#pay`} prefetch={false} className="nt-row">
          {body}
        </Link>
      </li>
    );
  }

  if (i.kind === "letter" && i.parts?.length) {
    return (
      <li id={i.id} className="nt-item" data-new={i.new || undefined}>
        <button type="button" className="nt-row" aria-expanded={open} onClick={onToggle}>
          {body}
          <span className="nt-chev" data-open={open || undefined} aria-hidden="true">
            <IconChevronDown size={18} />
          </span>
        </button>
        {open && <Letter parts={i.parts} premium={premium} />}
      </li>
    );
  }

  if ((i.kind === "brief" || i.kind === "screen") && i.items?.length) {
    return (
      <li id={i.id} className="nt-item" data-new={i.new || undefined}>
        {i.kind === "screen" ? (
          <Link href={i.url} prefetch={false} className="nt-row">{body}</Link>
        ) : (
          <div className="nt-row nt-row--static">{body}</div>
        )}
        <ul className="nt-sub">
          {i.items.map((s, k) => (
            <li key={k}>
              <Link href={s.url} prefetch={false} className="nt-sub-row">
                <span className={`nt-dot nt-dot--sm ${DOT[s.level] ?? ""}`} aria-hidden="true" />
                <T en={s.title_en} bn={s.title_bn || s.title_en} />
              </Link>
            </li>
          ))}
        </ul>
      </li>
    );
  }

  return (
    <li id={i.id} className="nt-item" data-new={i.new || undefined}>
      <Link href={i.url} prefetch={false} className="nt-row">
        {body}
      </Link>
    </li>
  );
}

function Letter({ parts, premium }: { parts: LetterPart[]; premium: boolean }) {
  const locked = parts.filter((p) => !p.free).length;
  return (
    <div className="nt-letter">
      {parts.map((p) => {
        // Which share the watcher caught is Premium (THE Premium line, step 3).
        const shownLines = premium ? p.lines : p.lines.filter((ln) => !ln.premium);
        const lines = (
          <ul className="nt-letter-lines">
            {shownLines.map((ln, k) => (
              <li
                key={k}
                className={ln.tone === "good" ? "nt-line--good" : ln.tone === "bad" ? "nt-line--bad" : undefined}
              >
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
        if (!p.free && !premium) {
          // Screen-only, like every lock: the text stays in the page, hidden.
          return (
            <Locked key={p.key}>
              <h3 className="nt-letter-title">
                <T en={p.title_en} bn={p.title_bn} />
              </h3>
              {lines}
            </Locked>
          );
        }
        return (
          <div key={p.key}>
            <h3 className="nt-letter-title">
              <T en={p.title_en} bn={p.title_bn} />
            </h3>
            {lines}
          </div>
        );
      })}
      {!premium && locked > 0 && (
        <div className="nt-letter-more">
          <p>
            <T
              en={`${locked} more parts with Premium: the market in five lines, serious problems this week, and next week on your shares.`}
              bn={`প্রিমিয়ামে আরও ${locked}টি অংশ: পাঁচ লাইনে বাজার, এ সপ্তাহের গুরুতর সমস্যা, আর আগামী সপ্তাহে আপনার শেয়ার।`}
            />
          </p>
          <Button href={`${PREMIUM_PATH}#pay`} variant="quiet" size="sm">
            <T en="See Premium" bn="প্রিমিয়াম দেখুন" />
          </Button>
        </div>
      )}
    </div>
  );
}

function NotificationsSkeleton() {
  return (
    <div className="nt" aria-busy="true">
      <Skeleton width="35%" height={16} />
      {[0, 1].map((k) => (
        <div key={k} className="soft-card mt-4 grid gap-3 p-5">
          <Skeleton width="25%" />
          <Skeleton width="85%" />
          <Skeleton width="70%" />
          <Skeleton width="80%" />
        </div>
      ))}
    </div>
  );
}
