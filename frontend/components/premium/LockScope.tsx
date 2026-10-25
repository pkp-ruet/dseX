"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { isFreeReport } from "@/lib/free-report";

/**
 * A page-wide setting for every `PremiumGate` inside it.
 *
 * `anchor` — the page has ONE Premium section (its id): each lock blurs in
 * place and shows a one-line link to that section instead of its own lock
 * card. The stock page had nine cards saying "This is part of Premium"; the
 * portfolio page made the same move earlier (`#pf-premium`).
 *
 * `unlocked` — everything opens for everyone (the free report of the day).
 */
type Scope = { anchor?: string; unlocked?: boolean };

const Ctx = createContext<Scope | null>(null);

export function useLockScope(): Scope | null {
  return useContext(Ctx);
}

/** The stock page's scope: one Premium section, and the whole page opens when
 *  this is today's free report (decided after mount — the page is ISR). */
export default function StockLockScope({ code, anchor, children }: { code: string; anchor?: string; children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  useEffect(() => setUnlocked(isFreeReport(code)), [code]);
  return <Ctx.Provider value={{ anchor, unlocked }}>{children}</Ctx.Provider>;
}
