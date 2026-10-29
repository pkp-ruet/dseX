"use client";

import { createElement } from "react";
import { T } from "@/components/i18n/T";
import { FREE_LIMITS, PREMIUM_PATH, storedLimit, type LimitKind } from "@/lib/premium";
import { toast } from "@/lib/toast";
import { getStoredUser } from "@/lib/auth";

const MESSAGES: Record<LimitKind, (n: number) => { en: string; bn: string }> = {
  watchlist: (n) => ({
    en: `A free account can follow ${n} shares. Premium has no limit.`,
    bn: `ফ্রি অ্যাকাউন্টে ${n}টি শেয়ার অনুসরণ করা যায়। প্রিমিয়ামে কোনো সীমা নেই।`,
  }),
  alerts: (n) => ({
    en: `A free account can keep ${n} price alerts on. Premium has no limit.`,
    bn: `ফ্রি অ্যাকাউন্টে একসঙ্গে ${n}টি প্রাইস অ্যালার্ট চালু রাখা যায়। প্রিমিয়ামে কোনো সীমা নেই।`,
  }),
  ai_daily: (n) => ({
    en: `A free account can ask ${n} questions a day. Premium has no limit.`,
    bn: `ফ্রি অ্যাকাউন্টে দিনে ${n}টি প্রশ্ন করা যায়। প্রিমিয়ামে কোনো সীমা নেই।`,
  }),
  portfolios: () => ({
    en: "A free account has one portfolio. Premium lets you keep up to six.",
    bn: "ফ্রি অ্যাকাউন্টে একটি পোর্টফোলিও থাকে। প্রিমিয়ামে ছয়টি পর্যন্ত রাখা যায়।",
  }),
  custom_lists: () => ({
    en: "Saving your own screens, with a daily alert when a share joins, is part of Premium.",
    bn: "নিজের স্ক্রিন সেভ করা, আর নতুন শেয়ার যোগ হলে প্রতিদিনের অ্যালার্ট, প্রিমিয়ামের অংশ।",
  }),
};

/**
 * "You've reached the free limit" — one toast whose action opens the reader's
 * plan card (`/profile#plan`: what the plan allows, what they use, the way to
 * Premium; 2026-10-29), or /premium for a guest. Both languages ride in the toast; the
 * reader sees theirs. Callable from anywhere (StarButton, the alert modal,
 * lib code).
 */
export function showLimitNotice(kind: LimitKind): void {
  const n = storedLimit(kind) ?? FREE_LIMITS[kind];
  const m = MESSAGES[kind](n);
  toast({
    message: createElement(T, { en: m.en, bn: m.bn }),
    tone: "neutral",
    duration: 7000,
    action: getStoredUser()
      ? {
          label: createElement(T, { en: "See your plan", bn: "আপনার প্ল্যান দেখুন" }),
          onClick: () => {
            window.location.href = "/profile#plan";
          },
        }
      : {
          label: createElement(T, { en: "See Premium", bn: "প্রিমিয়াম দেখুন" }),
          onClick: () => {
            window.location.href = PREMIUM_PATH;
          },
        },
  });
}
