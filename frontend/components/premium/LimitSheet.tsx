"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { T } from "@/components/i18n/T";
import Button from "@/components/ui/Button";
import Sheet from "@/components/ui/Sheet";
import { IconCheck, IconCrown } from "@/components/ui/icons";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { FREE_LIMITS, PREMIUM_PATH, storedLimit, type LimitKind } from "@/lib/premium";
import { areaOf, savePremiumContext } from "@/lib/premium-context";
import { FROM_MONTH } from "@/lib/premium-plans";
import { trackEvent } from "@/lib/track";
import { LIMIT_EVENT } from "./LimitNotice";

type Bi = { en: string; bn: string };

/** Per limit: the popup's title, what the reader can still do, and the first
 *  thing Premium gives them here. */
const COPY: Record<LimitKind, (n: number) => { title: Bi; line: Bi; gets: Bi }> = {
  watchlist: (n) => ({
    title: { en: `You follow ${n} shares, the most a free account can`, bn: `আপনি ${n}টি শেয়ার অনুসরণ করছেন, ফ্রি অ্যাকাউন্টে এর বেশি যায় না` },
    line: {
      en: "To follow a new share, stop following one first. With Premium you can follow as many as you like.",
      bn: "নতুন শেয়ার অনুসরণ করতে আগে একটি বাদ দিন। প্রিমিয়ামে যত খুশি শেয়ার অনুসরণ করতে পারবেন।",
    },
    gets: { en: "Follow as many shares as you like", bn: "যত খুশি শেয়ার অনুসরণ" },
  }),
  holdings: (n) => ({
    title: { en: `Your portfolio has ${n} shares, the most a free account can`, bn: `আপনার পোর্টফোলিওতে ${n}টি শেয়ার আছে, ফ্রি অ্যাকাউন্টে এর বেশি যায় না` },
    line: {
      en: "You can still buy more of the shares you have. To add a new share, get Premium and keep every share you own in one place.",
      bn: "যে শেয়ারগুলো আছে সেগুলো আরও কেনা যাবে। নতুন শেয়ার যোগ করতে প্রিমিয়াম নিন, আপনার সব শেয়ার এক জায়গায় রাখুন।",
    },
    gets: { en: "Every share you own in your portfolio", bn: "আপনার সব শেয়ার পোর্টফোলিওতে" },
  }),
  alerts: (n) => ({
    title: { en: `${n} price alerts are on, the most a free account can`, bn: `${n}টি প্রাইস অ্যালার্ট চালু আছে, ফ্রি অ্যাকাউন্টে এর বেশি যায় না` },
    line: {
      en: "Turn one off to set a new one. With Premium you can set as many as you like.",
      bn: "নতুন অ্যালার্ট দিতে একটি বন্ধ করুন। প্রিমিয়ামে যত খুশি অ্যালার্ট দিতে পারবেন।",
    },
    gets: { en: "As many price alerts as you like", bn: "যত খুশি প্রাইস অ্যালার্ট" },
  }),
  ai_daily: (n) => ({
    title: { en: `You have asked ${n} questions today`, bn: `আজ আপনি ${n}টি প্রশ্ন করেছেন` },
    line: {
      en: "Your free questions start again tomorrow. With Premium you can ask at any time.",
      bn: "ফ্রি প্রশ্ন আবার কাল থেকে। প্রিমিয়ামে যেকোনো সময় প্রশ্ন করতে পারবেন।",
    },
    gets: { en: "Ask TopStock AI at any time", bn: "যেকোনো সময় TopStock AI-কে প্রশ্ন" },
  }),
  portfolios: () => ({
    title: { en: "A free account has one portfolio", bn: "ফ্রি অ্যাকাউন্টে একটি পোর্টফোলিও থাকে" },
    line: {
      en: "Premium lets you keep up to six, so a parent's or spouse's BO account can sit apart from yours.",
      bn: "প্রিমিয়ামে ছয়টি পর্যন্ত রাখা যায়, যাতে মা-বাবা বা স্বামী/স্ত্রীর বিও অ্যাকাউন্ট আপনার থেকে আলাদা থাকে।",
    },
    gets: { en: "Up to six portfolios", bn: "ছয়টি পর্যন্ত পোর্টফোলিও" },
  }),
  custom_lists: () => ({
    title: { en: "Saving screens is part of Premium", bn: "স্ক্রিন সেভ করা প্রিমিয়ামের অংশ" },
    line: {
      en: "Save your own screens, and we tell you each day when a new share joins one.",
      bn: "নিজের স্ক্রিন সেভ করুন, নতুন শেয়ার যোগ হলে আমরা প্রতিদিন জানিয়ে দেব।",
    },
    gets: { en: "Your screens checked every day", bn: "আপনার স্ক্রিন প্রতিদিন যাচাই" },
  }),
};

const ALSO: Bi[] = [
  { en: "The full report on every share", bn: "প্রতিটি শেয়ারের পূর্ণ রিপোর্ট" },
  { en: "Your shares checked every day", bn: "আপনার শেয়ার প্রতিদিন যাচাই" },
];

/**
 * The free-limit popup (2026-10-30, user: "while hitting limit show a premium
 * banner in popup"; it was a toast). Mounted once in the root layout and
 * opened by `showLimitNotice(kind)`: what the limit is, what the reader can
 * still do, then a Premium banner in the `.ans` gold look — what Premium
 * gives here, the price (their own ৳99 month when they have it) and one
 * button. Fires `premium_lock_view` / `premium_lock_tap` with `lock: "limit-<kind>"`.
 */
export default function LimitSheet() {
  const [kind, setKind] = useState<LimitKind | null>(null);
  const { user } = useAuth();
  const { bn } = useLang();
  const area = areaOf(usePathname() || "/");

  useEffect(() => {
    const onLimit = (e: Event) => {
      const k = (e as CustomEvent<LimitKind>).detail;
      if (!k || !(k in COPY)) return;
      setKind(k);
      trackEvent("premium_lock_view", { area, lock: `limit-${k}`, state: user ? "free" : "guest", job: "watch" });
    };
    window.addEventListener(LIMIT_EVENT, onLimit);
    return () => window.removeEventListener(LIMIT_EVENT, onLimit);
  }, [area, user]);

  if (!kind) return null;

  const n = storedLimit(kind) ?? FREE_LIMITS[kind];
  const c = COPY[kind](n);
  const offer = user?.offer ?? null;
  const href = offer ? "/premium?plan=offer&src=limit#pay" : user ? `${PREMIUM_PATH}#pay` : PREMIUM_PATH;
  const close = () => setKind(null);

  function onTap() {
    if (!kind) return;
    trackEvent("premium_lock_tap", { area, lock: `limit-${kind}`, state: user ? "free" : "guest", job: "watch" });
    savePremiumContext({ from: area, label: bn ? c.gets.bn : c.gets.en, stakes: [bn ? c.title.bn : c.title.en] });
    close();
  }

  return (
    <Sheet
      open
      onClose={close}
      title={<T en={c.title.en} bn={c.title.bn} />}
      footer={
        <Button variant="quiet" onClick={close}>
          <T en="Not now" bn="এখন নয়" />
        </Button>
      }
    >
      <p className="text-sm leading-relaxed text-text-main">
        <T en={c.line.en} bn={c.line.bn} />
      </p>

      <div className="ans" data-open="false">
        <div className="ans-top">
          <span className="ans-medal" aria-hidden="true">
            <IconCrown size={22} />
          </span>
          <div className="min-w-0">
            <p className="ans-eyebrow">Premium</p>
            <p className="ans-title">
              <T en="No limits, and our full read on your shares" bn="কোনো সীমা নেই, আর আপনার শেয়ারে আমাদের পূর্ণ বিশ্লেষণ" />
            </p>
          </div>
        </div>
        <div className="ans-body">
          <ul className="ans-gets">
            {[c.gets, ...ALSO].map((g) => (
              <li key={g.en}>
                <IconCheck size={14} />
                <T en={g.en} bn={g.bn} />
              </li>
            ))}
          </ul>
        </div>
        <div className="ans-foot">
          <Link href={href} prefetch={false} className="btn-primary ans-cta" onClick={onTap}>
            <IconCrown size={16} />
            {offer ? (
              <T en={`Get your first month for ৳${offer.amount}`} bn={`প্রথম মাস ৳${offer.amount}-এ নিন`} />
            ) : (
              <T en="See Premium" bn="প্রিমিয়াম দেখুন" />
            )}
          </Link>
          <span className="ans-price">
            {offer ? (
              <b>
                <T en={`৳${offer.amount} instead of ৳${offer.list_amount}, once`} bn={`৳${offer.list_amount}-এর বদলে ৳${offer.amount}, একবারই`} />
              </b>
            ) : (
              <b>
                <T en={`From ৳${FROM_MONTH} a month`} bn={`মাসে ৳${FROM_MONTH} থেকে`} />
              </b>
            )}
            <T en="bKash, Nagad or bank · no auto-renewal" bn="বিকাশ, নগদ বা ব্যাংক · নিজে থেকে নবায়ন হয় না" />
          </span>
        </div>
      </div>
    </Sheet>
  );
}
