"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { T } from "@/components/i18n/T";
import { LockLine, lockString, type LockText } from "@/components/premium/PremiumLockCard";
import { IconCheck, IconCrown } from "@/components/ui/icons";
import { useLang } from "@/context/LangContext";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";

/**
 * What the full dividend calendar does, for a reader who isn't Premium —
 * the ONE Premium card on /dividend-calendar (`#dc-premium`: every list's
 * lock points here), the "Money coming" block on /market-analysis, and a
 * slim block inside the dashboard's "Dividends coming" card. Premium readers
 * never see it (server render + first paint show it, like every lock; it goes
 * once the plan is known). The button opens /premium, never the month.
 *
 * Clean redesign 2026-10-28: a plain card — a small gold "Premium" mark,
 * one headline, the reader's stakes as short lines, what the calendar does as
 * a check list (page only), one button. No tinted border.
 */

const FEATURES: { en: string; bn: string }[] = [
  { en: "Every record date, with the last day you can buy and still get the dividend", bn: "প্রতিটি রেকর্ড ডেট, আর ডিভিডেন্ড পেতে কবের মধ্যে কিনতে হবে" },
  { en: "Cash per share in taka, and the yield at today's price", bn: "শেয়ারপ্রতি কত টাকা আসবে, আর আজকের দামে কত ইল্ড" },
  { en: "Every AGM date, when the dividend is approved", bn: "প্রতিটি এজিএমের তারিখ, যেদিন ডিভিডেন্ড অনুমোদন হয়" },
  { en: "The year's biggest cash payers and every new declaration", bn: "বছরের সবচেয়ে বড় নগদ ডিভিডেন্ড আর প্রতিটি নতুন ঘোষণা" },
];

const HEAD = { en: "Know every dividend before the record date", bn: "রেকর্ড ডেটের আগেই জানুন কোন ডিভিডেন্ড আসছে" };
const SUB = {
  en: "The full calendar lists every company paying a dividend in the next 120 days: how much, the last day to buy, and when the money is approved.",
  bn: "পুরো ক্যালেন্ডারে আছে সামনের 120 দিনে ডিভিডেন্ড দেওয়া প্রতিটি কোম্পানি: কত টাকা, কেনার শেষ দিন, আর কবে টাকা অনুমোদন হয়।",
};
const SUB_SHORT = {
  en: "Premium opens the whole calendar: every record date, AGM and new declaration.",
  bn: "প্রিমিয়ামে পুরো ক্যালেন্ডার খোলা: প্রতিটি রেকর্ড ডেট, এজিএম আর নতুন ঘোষণা।",
};
const CTA = {
  guest: { en: "Sign up free, then try Premium", bn: "ফ্রি অ্যাকাউন্ট খুলে প্রিমিয়াম দেখুন" },
  free: { en: "See Premium plans", bn: "প্রিমিয়াম প্ল্যান দেখুন" },
  card: { en: "See the full calendar with Premium", bn: "প্রিমিয়ামে পুরো ক্যালেন্ডার দেখুন" },
};

export default function DividendPromo({
  variant = "page",
  stakes,
  id,
  className = "",
}: {
  /** page = its own card · card = a slim block inside the dashboard card. */
  variant?: "page" | "card";
  /** The reader's own numbers ("3 of your stocks are on it") — a string in the
   *  reader's language, or an `{en, bn}` pair from a server page. */
  stakes?: (LockText | null | undefined | "")[];
  /** The page's Premium anchor (`dc-premium`), for the locks to point at. */
  id?: string;
  className?: string;
}) {
  const { isPremium, state } = usePremium();
  const { lang } = useLang();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (mounted && isPremium) return null;

  const area = variant === "card" ? "home-dividends" : "dividend-calendar";
  const lines = (stakes ?? []).filter((s): s is LockText => !!s).slice(0, 3);
  const cta = variant === "card" ? CTA.card : state === "guest" ? CTA.guest : CTA.free;

  const onCta = () => {
    trackEvent("premium_lock_tap", { area, lock: "Dividend calendar", state, stakes: lines.length });
    savePremiumContext({ from: area, label: "The full dividend calendar", stakes: lines.map((l) => lockString(l, lang)) });
  };

  const inset = variant === "card";
  const Tag = inset ? "div" : "section";
  return (
    <Tag id={id} className={`${inset ? "dc-promo dc-promo--inset" : "soft-card dc-promo"} ${className}`.trim()}>
      <span className="dc-promo-tag">
        <IconCrown size={14} /> Premium
      </span>
      <p className="dc-promo-head">
        <T en={HEAD.en} bn={HEAD.bn} />
      </p>
      <p className="dc-promo-sub">{inset ? <T en={SUB_SHORT.en} bn={SUB_SHORT.bn} /> : <T en={SUB.en} bn={SUB.bn} />}</p>

      {lines.length > 0 && (
        <ul className="dc-promo-stakes">
          {lines.map((s, i) => (
            <li key={i}>
              <span>
                <LockLine text={s} />
              </span>
            </li>
          ))}
        </ul>
      )}

      {!inset && (
        <ul className="dc-promo-checks">
          {FEATURES.map((f) => (
            <li key={f.en}>
              <IconCheck size={16} />
              <span>
                <T en={f.en} bn={f.bn} />
              </span>
            </li>
          ))}
        </ul>
      )}

      <Link href={PREMIUM_PATH} prefetch={false} className="btn-primary dc-promo-cta" onClick={onCta}>
        <T en={cta.en} bn={cta.bn} />
      </Link>
    </Tag>
  );
}
