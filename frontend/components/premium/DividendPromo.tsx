"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { T } from "@/components/i18n/T";
import { IconCheck, IconLock } from "@/components/ui/icons";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";

/**
 * What the full dividend calendar does, for a reader who isn't Premium —
 * shown on /dividend-calendar under the summary and inside the dashboard's
 * "Money coming" card, beside a small glimpse of the real rows. Premium
 * readers never see it (server render + first paint show it, like every lock;
 * it goes once the plan is known). The button opens /premium, never the month.
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
const CTA = {
  guest: { en: "Sign up free, then try Premium", bn: "ফ্রি অ্যাকাউন্ট খুলে প্রিমিয়াম দেখুন" },
  free: { en: "See Premium plans", bn: "প্রিমিয়াম প্ল্যান দেখুন" },
};

export default function DividendPromo({
  variant = "page",
  stakes,
  className = "",
}: {
  /** page = its own card on /dividend-calendar · card = a block inside the dashboard card. */
  variant?: "page" | "card";
  /** The reader's own numbers, already in their language ("3 of your stocks are on it"). */
  stakes?: string[];
  className?: string;
}) {
  const { isPremium, state } = usePremium();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (mounted && isPremium) return null;

  const area = variant === "card" ? "home-dividends" : "dividend-calendar";
  const lines = (stakes ?? []).filter(Boolean).slice(0, 3);
  const features = variant === "card" ? FEATURES.slice(0, 3) : FEATURES;
  const cta = state === "guest" ? CTA.guest : CTA.free;

  const onCta = () => {
    trackEvent("premium_lock_tap", { area, lock: "Dividend calendar", state, stakes: lines.length });
    savePremiumContext({ from: area, label: "The full dividend calendar", stakes: lines });
  };

  const say = (c: { en: string; bn: string }, cls: string) => (
    <p className={cls}>
      <T en={c.en} bn={c.bn} />
    </p>
  );

  const body = (
    <>
      <span className="rl-promo-tag">
        <IconLock size={12} /> Premium
      </span>
      {say(HEAD, "rl-promo-head")}
      {say(SUB, "rl-promo-sub")}

      {lines.length > 0 && (
        <ul className="mt-1 flex flex-col gap-1">
          {lines.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-sm font-semibold text-text-main">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      )}

      <ul className={`mt-1 grid grid-cols-1 gap-2 ${variant === "page" ? "sm:grid-cols-2" : ""}`}>
        {features.map((f) => (
          <li key={f.en} className="flex items-start gap-2 text-sm text-text-main">
            <span className="mt-0.5 shrink-0 text-positive" aria-hidden>
              <IconCheck size={16} />
            </span>
            <span>
              <T en={f.en} bn={f.bn} />
            </span>
          </li>
        ))}
      </ul>

      <Link href={PREMIUM_PATH} prefetch={false} className="btn-primary rl-promo-cta" onClick={onCta}>
        <T en={cta.en} bn={cta.bn} />
      </Link>
    </>
  );

  if (variant === "card") {
    return <div className={`flex flex-col gap-2 border-t border-border px-4 py-4 sm:px-5 ${className}`.trim()}>{body}</div>;
  }
  return <section className={`soft-card rl-promo mb-6 ${className}`.trim()}>{body}</section>;
}
