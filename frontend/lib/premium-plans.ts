/**
 * The paid plans — mirrors backend `services/payments.py:PAID_PLANS` (amount +
 * days); this file adds the words. A plain module (no "use client") so the
 * server-rendered /premium page and its client PayBox share it.
 */
export type PlanKey = "monthly" | "quarterly" | "yearly";

export interface PaidPlan {
  key: PlanKey;
  name: string;
  bn: string;
  amount: number;
  days: number;
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
    note: "About ৳166 a month — you save ৳98.",
    noteBn: "মাসে প্রায় ৳166 — ৳98 সাশ্রয়।",
  },
  {
    key: "yearly",
    name: "1 year",
    bn: "1 বছর",
    amount: 1499,
    days: 365,
    per: "for 365 days",
    perBn: "365 দিনের জন্য",
    note: "About ৳125 a month — you save ৳889.",
    noteBn: "মাসে প্রায় ৳125 — ৳889 সাশ্রয়।",
    best: true,
  },
];

export const LOWEST_PRICE = Math.min(...PAID_PLANS.map((p) => p.amount));

export function planByKey(key: string | null | undefined): PaidPlan | undefined {
  return PAID_PLANS.find((p) => p.key === key);
}

export const METHOD_LABEL: Record<string, string> = { bkash: "bKash", nagad: "Nagad" };
