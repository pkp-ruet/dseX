"use client";

import Button from "@/components/ui/Button";
import { T } from "@/components/i18n/T";
import { formatDate } from "@/lib/formatters";
import { bnDate } from "@/lib/bn";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { LOWEST_PRICE, planByKey } from "@/lib/premium-plans";

/** The plan's call to action — what the reader can do next, by account state.
 *  Used in the /premium hero and in the profile "Your plan" card (`linkOnly`,
 *  where the buttons point at /premium instead of the plan picker below).
 *  Every line carries both languages (`<T>`), so the server HTML never
 *  flashes the wrong one. */
export default function PremiumPlanCta({
  align = "start",
  linkOnly = false,
}: {
  align?: "start" | "center";
  linkOnly?: boolean;
}) {
  const { state, daysLeft, premiumUntil, premiumSource, paidPlan } = usePremium();
  const justify = align === "center" ? "items-center text-center" : "items-start";
  const payHref = linkOnly ? `${PREMIUM_PATH}#pay` : "#pay";

  if (state === "premium") {
    const plan = planByKey(paidPlan);
    const name =
      premiumSource === "trial" ? (
        <T en="Your free month" bn="আপনার ফ্রি মাস" />
      ) : premiumSource === "paid" ? (
        <T en={`Premium · ${plan?.name ?? "paid"} plan`} bn={`প্রিমিয়াম · ${plan?.bn ?? ""} প্ল্যান`} />
      ) : (
        "Premium"
      );
    const until = premiumUntil ? (
      <T
        en={` · ${daysLeft} ${daysLeft === 1 ? "day" : "days"} left (until ${formatDate(premiumUntil)})`}
        bn={` · আর ${daysLeft} দিন (${bnDate(premiumUntil)} পর্যন্ত)`}
      />
    ) : null;
    return (
      <div className={`flex flex-col gap-1 ${justify}`}>
        <span className="premium-chip">Premium</span>
        <p className="text-sm font-semibold text-text-main">
          {name}
          {until}
        </p>
        <p className="text-sm text-text-muted">
          <T en="Every Premium feature is on." bn="প্রিমিয়ামের সব সুবিধা চালু আছে।" />
        </p>
        {premiumUntil && (
          <Button href={payHref} variant="link" size="sm">
            <T en="Add more days" bn="আরও দিন যোগ করুন" />
          </Button>
        )}
      </div>
    );
  }

  if (state === "guest") {
    return (
      <div className={`flex flex-col gap-2 ${justify}`}>
        <div className="flex flex-wrap gap-2">
          <Button href="/register" size="lg">
            <T en="Sign up free" bn="ফ্রি অ্যাকাউন্ট খুলুন" />
          </Button>
          {!linkOnly && (
            <Button href="#pay" size="lg" variant="quiet">
              <T en="See the plans" bn="প্ল্যান দেখুন" />
            </Button>
          )}
        </div>
        <p className="text-sm text-text-muted">
          <T
            en={`First a free account, then a plan from ৳${LOWEST_PRICE}.`}
            bn={`আগে একটি ফ্রি অ্যাকাউন্ট, তারপর ৳${LOWEST_PRICE} থেকে প্ল্যান।`}
          />
        </p>
      </div>
    );
  }

  if (linkOnly) {
    return (
      <div className={`flex flex-col gap-2 ${justify}`}>
        <p className="text-sm font-semibold text-text-main">
          <T en="Free plan" bn="ফ্রি প্ল্যান" />
        </p>
        <Button href={PREMIUM_PATH}>
          <T en="See Premium" bn="প্রিমিয়াম দেখুন" />
        </Button>
        <p className="text-sm text-text-muted">
          <T
            en={`See what it adds. Plans start at ৳${LOWEST_PRICE}, paid by bKash or Nagad.`}
            bn={`কী কী যোগ হয়, দেখুন। প্ল্যান ৳${LOWEST_PRICE} থেকে, বিকাশ বা নগদে পেমেন্ট।`}
          />
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${justify}`}>
      <Button href={payHref} size="lg">
        <T en={`Choose a plan from ৳${LOWEST_PRICE}`} bn={`৳${LOWEST_PRICE} থেকে প্ল্যান বেছে নিন`} />
      </Button>
      <p className="text-sm text-text-muted">
        <T
          en="Pay by bKash or Nagad. Premium starts straight away."
          bn="বিকাশ বা নগদে পেমেন্ট করুন। প্রিমিয়াম সঙ্গে সঙ্গে চালু হবে।"
        />
      </p>
    </div>
  );
}
