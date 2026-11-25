/**
 * The paid plans — mirrors backend `services/payments.py:PAID_PLANS` (amount +
 * days); this file adds the words. A plain module (no "use client") so the
 * server-rendered /premium page and its client PayBox share it.
 *
 * 2026-11-26: two plans — 3 months ৳299 · 1 year ৳999, the year shown as cut
 * from ৳1,499 (`listAmount`, struck through on its card). The 1-month plan is
 * no longer sold, nor the reader's own ৳99 first month (removed the same day);
 * both are kept in `RETIRED_PLANS` so old payments still read as a name.
 */
export type PlanKey = "quarterly" | "yearly";

export interface PaidPlan {
  key: PlanKey;
  name: string;
  bn: string;
  amount: number;
  days: number;
  /** Regular price, struck through (only the year has one). */
  listAmount?: number;
  per: string;
  perBn: string;
  note: string;
  noteBn: string;
  best?: boolean;
}

export const PAID_PLANS: PaidPlan[] = [
  {
    key: "quarterly",
    name: "3 months",
    bn: "3 মাস",
    amount: 299,
    days: 90,
    per: "for 90 days",
    perBn: "90 দিনের জন্য",
    note: "About ৳100 a month.",
    noteBn: "মাসে প্রায় ৳100।",
  },
  {
    key: "yearly",
    name: "1 year",
    bn: "1 বছর",
    amount: 999,
    days: 365,
    listAmount: 1499,
    per: "for 365 days",
    perBn: "365 দিনের জন্য",
    note: "About ৳83 a month.",
    noteBn: "মাসে প্রায় ৳83।",
    best: true,
  },
];

/** The cheapest month on any plan (the yearly one: ৳999 / 12 ≈ ৳83). */
export const FROM_MONTH = Math.min(
  ...PAID_PLANS.map((p) => Math.round(p.amount / Math.max(1, Math.round(p.days / 30)))),
);

/** The yearly plan: the one the banners and "about ৳83 a month" lines name. */
export const YEARLY_PLAN = PAID_PLANS.find((p) => p.key === "yearly")!;

// Plans no longer sold, kept so old payments and `users.paid_plan` still read
// as a name (the payment row stores its own amount + days).
const RETIRED_PLANS: PaidPlan[] = [
  {
    key: "monthly" as PlanKey,
    name: "1 month",
    bn: "1 মাস",
    amount: 199,
    days: 30,
    per: "for 30 days",
    perBn: "30 দিনের জন্য",
    note: "",
    noteBn: "",
  },
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
  {
    key: "offer" as PlanKey,
    name: "৳99 first month",
    bn: "৳99-এর প্রথম মাস",
    amount: 99,
    days: 30,
    per: "for 30 days",
    perBn: "30 দিনের জন্য",
    note: "",
    noteBn: "",
  },
];

export const LOWEST_PRICE = Math.min(...PAID_PLANS.map((p) => p.amount));

export function planByKey(key: string | null | undefined): PaidPlan | undefined {
  return (
    PAID_PLANS.find((p) => p.key === key) ?? RETIRED_PLANS.find((p) => p.key === key)
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
