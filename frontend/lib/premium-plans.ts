/**
 * The paid plans — mirrors backend `services/payments.py:PAID_PLANS` (amount +
 * days); this file adds the words. A plain module (no "use client") so the
 * server-rendered /premium page and its client PayBox share it.
 *
 * 2026-11-13: flat prices — 1 month ৳199 · 3 months ৳499 · 1 year ৳1,499. No
 * struck-through "regular" price and no limited-time offer on any plan (the
 * reader's own ৳99 month below is a separate, admin-switched offer).
 */
export type PlanKey = "monthly" | "quarterly" | "yearly" | "offer";

export interface PaidPlan {
  key: PlanKey;
  name: string;
  bn: string;
  amount: number;
  days: number;
  /** Regular price, struck through — only the reader's own ৳99 month has one. */
  listAmount?: number;
  per: string;
  perBn: string;
  note: string;
  noteBn: string;
  best?: boolean;
}

export const PAID_PLANS: PaidPlan[] = [
  {
    key: "monthly",
    name: "1 month",
    bn: "1 মাস",
    amount: 199,
    days: 30,
    per: "for 30 days",
    perBn: "30 দিনের জন্য",
    note: "Try it for a month.",
    noteBn: "এক মাস চালিয়ে দেখুন।",
  },
  {
    key: "quarterly",
    name: "3 months",
    bn: "3 মাস",
    amount: 499,
    days: 90,
    per: "for 90 days",
    perBn: "90 দিনের জন্য",
    note: "About ৳166 a month.",
    noteBn: "মাসে প্রায় ৳166।",
  },
  {
    key: "yearly",
    name: "1 year",
    bn: "1 বছর",
    amount: 1499,
    days: 365,
    per: "for 365 days",
    perBn: "365 দিনের জন্য",
    note: "About ৳125 a month.",
    noteBn: "মাসে প্রায় ৳125।",
    best: true,
  },
];

/** The cheapest month on any plan (the yearly one: ৳1,499 / 12 ≈ ৳125). */
export const FROM_MONTH = Math.min(
  ...PAID_PLANS.map((p) => Math.round(p.amount / Math.max(1, Math.round(p.days / 30)))),
);

/**
 * The reader's own offer (2026-10-29): one month for ৳99 instead of ৳199,
 * once per account, for a reader who isn't Premium, while an admin keeps it
 * open (`/admin/payments`). No end date is shown. Mirrors backend
 * `payments.OWN_OFFER`; the backend's `user.offer` (signed in) or the plans
 * endpoint's `own_offer` (guests) decides whether it shows. Not in `PAID_PLANS`: it is
 * its own card in the pay box and the banner on top of the homepage.
 */
export const OWN_OFFER_PLAN: PaidPlan = {
  key: "offer",
  name: "1 month, your offer",
  bn: "1 মাস, আপনার অফার",
  amount: 99,
  listAmount: 199,
  days: 30,
  per: "for 30 days",
  perBn: "30 দিনের জন্য",
  note: "It's your own offer, for a very limited time.",
  noteBn: "এটি শুধু আপনার জন্য অফার, খুব অল্প সময়ের জন্য।",
};

// Plans no longer sold, kept so old payments and `users.paid_plan` still read
// as a name (the payment row stores its own amount + days).
const RETIRED_PLANS: PaidPlan[] = [
  {
    key: "halfyearly" as PlanKey,
    name: "6 months",
    bn: "6 মাস",
    amount: 999,
    days: 180,
    per: "for 180 days",
    perBn: "180 দিনের জন্য",
    note: "",
    noteBn: "",
  },
];

export const LOWEST_PRICE = Math.min(...PAID_PLANS.map((p) => p.amount));

export function planByKey(key: string | null | undefined): PaidPlan | undefined {
  return (
    PAID_PLANS.find((p) => p.key === key) ??
    (key === OWN_OFFER_PLAN.key ? OWN_OFFER_PLAN : undefined) ??
    RETIRED_PLANS.find((p) => p.key === key)
  );
}

export const METHOD_LABEL: Record<string, string> = {
  bkash: "bKash",
  nagad: "Nagad",
  bank: "Bank transfer",
  // Only on payments an admin recorded by hand.
  cash: "Cash",
  other: "Other",
};

/** The Bengali words where they differ from `METHOD_LABEL`. */
export const METHOD_BN: Record<string, string> = {
  bkash: "বিকাশ",
  nagad: "নগদ",
  bank: "ব্যাংক ট্রান্সফার",
};

/** How a bank transfer was sent (backend `payments.TRANSFERS`). */
export const TRANSFER_LABEL: Record<string, string> = { npsb: "NPSB", beftn: "BEFTN" };
