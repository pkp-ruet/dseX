/**
 * The paid plans — mirrors backend `services/payments.py:PAID_PLANS` (amount +
 * days + list amount); this file adds the words. A plain module (no "use client")
 * so the server-rendered /premium page and its client PayBox share it.
 *
 * 2026-10-27: 1 month ৳199 · 6 months ৳999 (regular ৳1,149) · 1 year ৳1,899
 * (regular ৳2,199). The 6-month and yearly prices are a limited-time offer —
 * `listAmount` is the regular price, shown struck through with the offer label
 * (`OFFER`). The reader always pays `amount`.
 */
export type PlanKey = "monthly" | "halfyearly" | "yearly";

export interface PaidPlan {
  key: PlanKey;
  name: string;
  bn: string;
  amount: number;
  days: number;
  /** Regular price while a limited-time offer runs (struck through). */
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
    key: "halfyearly",
    name: "6 months",
    bn: "6 মাস",
    amount: 999,
    listAmount: 1149,
    days: 180,
    per: "for 180 days",
    perBn: "180 দিনের জন্য",
    note: "About ৳167 a month.",
    noteBn: "মাসে প্রায় ৳167।",
  },
  {
    key: "yearly",
    name: "1 year",
    bn: "1 বছর",
    amount: 1899,
    listAmount: 2199,
    days: 365,
    per: "for 365 days",
    perBn: "365 দিনের জন্য",
    note: "About ৳158 a month.",
    noteBn: "মাসে প্রায় ৳158।",
    best: true,
  },
];

/** The words for the limited-time offer on the discounted plans. */
export const OFFER = {
  label: { en: "Limited-time offer", bn: "সীমিত সময়ের অফার" },
  line: {
    en: "Limited-time offer: 6 months for ৳999 (was ৳1,149) and 1 year for ৳1,899 (was ৳2,199).",
    bn: "সীমিত সময়ের অফার: 6 মাস ৳999 (আগে ৳1,149), 1 বছর ৳1,899 (আগে ৳2,199)।",
  },
} as const;

// Plans no longer sold, kept so old payments and `users.paid_plan` still read
// as a name (the payment row stores its own amount + days).
const RETIRED_PLANS: PaidPlan[] = [
  {
    key: "quarterly" as PlanKey,
    name: "3 months",
    bn: "3 মাস",
    amount: 499,
    days: 90,
    per: "for 90 days",
    perBn: "90 দিনের জন্য",
    note: "",
    noteBn: "",
  },
];

export const LOWEST_PRICE = Math.min(...PAID_PLANS.map((p) => p.amount));

export function planByKey(key: string | null | undefined): PaidPlan | undefined {
  return PAID_PLANS.find((p) => p.key === key) ?? RETIRED_PLANS.find((p) => p.key === key);
}

export const METHOD_LABEL: Record<string, string> = {
  bkash: "bKash",
  nagad: "Nagad",
  // Only on payments an admin recorded by hand.
  cash: "Cash",
  bank: "Bank",
  other: "Other",
};
