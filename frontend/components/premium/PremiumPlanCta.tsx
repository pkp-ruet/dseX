"use client";

import Button from "@/components/ui/Button";
import Bn from "@/components/i18n/Bn";
import { formatDate } from "@/lib/formatters";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";

/** The plan's call to action — what the reader can do next, by account state.
 *  Used on /premium and in the profile "Your plan" card. Only /premium (the
 *  page that shows what's included and the price) starts the month; anywhere
 *  else passes `linkOnly` and the button opens /premium. */
export default function PremiumPlanCta({
  align = "start",
  linkOnly = false,
}: {
  align?: "start" | "center";
  linkOnly?: boolean;
}) {
  const { state, daysLeft, premiumUntil, premiumSource, startTrial, starting } = usePremium();
  const justify = align === "center" ? "items-center text-center" : "items-start";

  if (state === "premium") {
    return (
      <div className={`flex flex-col gap-1 ${justify}`}>
        <span className="premium-chip">Premium</span>
        <p className="text-sm font-semibold text-text-main">
          {premiumSource === "trial" ? "Your free month" : "Premium"}
          {premiumUntil ? ` · ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left (until ${formatDate(premiumUntil)})` : ""}
        </p>
        <Bn className="text-sm text-text-muted">সব প্রিমিয়াম সুবিধা চালু আছে।</Bn>
      </div>
    );
  }

  if (state === "ended") {
    return (
      <div className={`flex flex-col gap-1 ${justify}`}>
        <p className="text-sm font-semibold text-text-main">Your free month has ended. Paid plans are coming soon.</p>
        <Bn className="text-sm text-text-muted">আপনার ফ্রি মাস শেষ হয়েছে। পেইড প্ল্যান শিগগিরই আসছে।</Bn>
      </div>
    );
  }

  if (state === "guest") {
    return (
      <div className={`flex flex-col gap-2 ${justify}`}>
        <Button href="/register" size="lg">Sign up free</Button>
        <p className="text-sm text-text-muted">Then start your free month — no payment needed.</p>
      </div>
    );
  }

  if (linkOnly) {
    return (
      <div className={`flex flex-col gap-2 ${justify}`}>
        <p className="text-sm font-semibold text-text-main">Free plan</p>
        <Button href={PREMIUM_PATH}>See Premium</Button>
        <p className="text-sm text-text-muted">See what it adds and what it will cost. Your first month is free.</p>
        <Bn className="text-sm text-text-muted">কী কী পাবেন আর দাম কত হবে দেখুন। প্রথম মাস ফ্রি।</Bn>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${justify}`}>
      <Button size="lg" onClick={() => void startTrial()} disabled={starting}>
        Start my free month
      </Button>
      <p className="text-sm text-text-muted">30 days of everything. No payment, no card.</p>
      <Bn className="text-sm text-text-muted">30 দিন সব সুবিধা। কোনো পেমেন্ট বা কার্ড লাগবে না।</Bn>
    </div>
  );
}
