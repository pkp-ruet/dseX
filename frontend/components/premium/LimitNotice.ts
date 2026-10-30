"use client";

import type { LimitKind } from "@/lib/premium";

export const LIMIT_EVENT = "dsex:limit";

/**
 * "You've reached the free limit" — opens the Premium popup
 * (`LimitSheet`, mounted once in the root layout; 2026-10-30, was a toast).
 * A window event, like `toast()`, so it is callable from anywhere
 * (StarButton, the alert modal, lib code).
 */
export function showLimitNotice(kind: LimitKind): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<LimitKind>(LIMIT_EVENT, { detail: kind }));
}
