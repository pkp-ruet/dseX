"use client";

import Button from "@/components/ui/Button";
import Bn from "@/components/i18n/Bn";
import { useLang } from "@/context/LangContext";
import { formatDate } from "@/lib/formatters";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { LOWEST_PRICE, planByKey } from "@/lib/premium-plans";

/** The plan's call to action — what the reader can do next, by account state.
 *  Used in the /premium hero and in the profile "Your plan" card (`linkOnly`,
 *  where the buttons point at /premium instead of the plan picker below). */
export default function PremiumPlanCta({
  align = "start",
  linkOnly = false,
}: {
  align?: "start" | "center";
  linkOnly?: boolean;
}) {
  const { state, daysLeft, premiumUntil, premiumSource, paidPlan } = usePremium();
  const { bn } = useLang();
  const L = (en: string, b: string) => (bn ? b : en);
  const justify = align === "center" ? "items-center text-center" : "items-start";
  const payHref = linkOnly ? `${PREMIUM_PATH}#pay` : "#pay";

  if (state === "premium") {
    const plan = planByKey(paidPlan);
    const name =
      premiumSource === "trial"
        ? L("Your free month", "আপনার ফ্রি মাস")
        : premiumSource === "paid"
          ? bn
            ? `প্রিমিয়াম · ${plan?.bn ?? ""} প্ল্যান`
            : `Premium · ${plan?.name ?? "paid"} plan`
          : "Premium";
    return (
      <div className={`flex flex-col gap-1 ${justify}`}>
        <span className="premium-chip">Premium</span>
        <p className="text-sm font-semibold text-text-main">
          {name}
          {premiumUntil
            ? bn
              ? ` · আর ${daysLeft} দিন (${formatDate(premiumUntil)} পর্যন্ত)`
              : ` · ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left (until ${formatDate(premiumUntil)})`
            : ""}
        </p>
        <Bn className="text-sm text-text-muted">সব প্রিমিয়াম সুবিধা চালু আছে।</Bn>
        {premiumUntil && (
          <Button href={payHref} variant="link" size="sm">{L("Add more days", "আরও দিন যোগ করুন")}</Button>
        )}
      </div>
    );
  }

  if (state === "guest") {
    return (
      <div className={`flex flex-col gap-2 ${justify}`}>
        <div className="flex flex-wrap gap-2">
          <Button href="/register" size="lg">{L("Sign up free", "ফ্রি অ্যাকাউন্ট খুলুন")}</Button>
          {!linkOnly && <Button href="#pay" size="lg" variant="quiet">{L("See the plans", "প্ল্যান দেখুন")}</Button>}
        </div>
        {!bn && <p className="text-sm text-text-muted">A free account first, then pick a plan from ৳{LOWEST_PRICE}.</p>}
        <Bn className="text-sm text-text-muted">আগে একটি ফ্রি অ্যাকাউন্ট, তারপর ৳{LOWEST_PRICE} থেকে প্ল্যান।</Bn>
      </div>
    );
  }

  if (linkOnly) {
    return (
      <div className={`flex flex-col gap-2 ${justify}`}>
        <p className="text-sm font-semibold text-text-main">{L("Free plan", "ফ্রি প্ল্যান")}</p>
        <Button href={PREMIUM_PATH}>{L("See Premium", "প্রিমিয়াম দেখুন")}</Button>
        {!bn && <p className="text-sm text-text-muted">See what it adds. Plans from ৳{LOWEST_PRICE}, by bKash or Nagad.</p>}
        <Bn className="text-sm text-text-muted">কী কী পাবেন দেখুন। ৳{LOWEST_PRICE} থেকে প্ল্যান, bKash বা Nagad দিয়ে।</Bn>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${justify}`}>
      <Button href={payHref} size="lg">{bn ? `প্ল্যান বেছে নিন — ৳${LOWEST_PRICE} থেকে` : `Choose a plan — from ৳${LOWEST_PRICE}`}</Button>
      {!bn && <p className="text-sm text-text-muted">Pay by bKash or Nagad. Premium starts straight away.</p>}
      <Bn className="text-sm text-text-muted">bKash বা Nagad দিয়ে পেমেন্ট — প্রিমিয়াম সঙ্গে সঙ্গে চালু।</Bn>
    </div>
  );
}
