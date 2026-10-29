"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { hasReportKey } from "@/lib/auth";
import { isFreeReport } from "@/lib/free-report";

/**
 * A page-wide setting for every `AnswerLock` inside it.
 *
 * `anchor` — the page has ONE Premium section (its id): each lock's button
 * goes to that section instead of /premium. The stock page had nine cards saying "This is part of Premium"; the
 * portfolio page made the same move earlier (`#pf-premium`).
 *
 * `unlocked` — everything opens (the free report of the day, or a report key
 * the reader used on this share — `reason` says which).
 */
type Scope = { anchor?: string; unlocked?: boolean; reason?: "today" | "key" };

const Ctx = createContext<Scope | null>(null);

export function useLockScope(): Scope | null {
  return useContext(Ctx);
}

/** Any other page with one Premium section (`/market-analysis` → `#ma-premium`). */
export function PageLockScope({ anchor, children }: { anchor: string; children: ReactNode }) {
  return <Ctx.Provider value={{ anchor }}>{children}</Ctx.Provider>;
}

/** The stock page's scope: the whole page opens when this is today's free
 *  report, or when the reader opened it with one of the month's report keys
 *  (2026-10-29). Decided after mount — the page is ISR. */
export default function StockLockScope({ code, anchor, children }: { code: string; anchor?: string; children: ReactNode }) {
  const { user } = useAuth();
  const [today, setToday] = useState(false);
  useEffect(() => setToday(isFreeReport(code)), [code]);
  const keyed = hasReportKey(user?.report_keys, code);
  const reason = keyed ? "key" : today ? "today" : undefined;
  return <Ctx.Provider value={{ anchor, unlocked: !!reason, reason }}>{children}</Ctx.Provider>;
}
