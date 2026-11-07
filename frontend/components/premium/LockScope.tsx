"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiOpenReportKey } from "@/lib/api";
import { hasReportKey } from "@/lib/auth";
import { userIsPremium } from "@/lib/premium";
import { trackEvent } from "@/lib/track";

/**
 * A page-wide setting for every `AnswerLock` inside it.
 *
 * `anchor` — the page has ONE Premium section (its id): each lock's button
 * goes to that section instead of /premium. The stock page had nine cards saying "This is part of Premium"; the
 * portfolio page made the same move earlier (`#pf-premium`).
 *
 * `unlocked` — everything opens (one of the reader's free analyses, a report key
 * the reader used on this share — `reason` says which).
 *
 * `forced` — render open from the first paint, server included (`OpenScope`):
 * the copy of a Premium part that sits hidden in the HTML for a free reader.
 *
 * `opening` — the stock page is spending one of the reader's free analyses
 * right now (`auto`); the Premium card stays out of the way meanwhile.
 */
type Scope = { anchor?: string; unlocked?: boolean; reason?: "key"; forced?: boolean; opening?: boolean };

const Ctx = createContext<Scope | null>(null);

export function useLockScope(): Scope | null {
  return useContext(Ctx);
}

/** Any other page with one Premium section (e.g. `/results` → `#rs-premium`). */
export function PageLockScope({ anchor, children }: { anchor: string; children: ReactNode }) {
  return <Ctx.Provider value={{ anchor }}>{children}</Ctx.Provider>;
}

/** Everything inside renders as a Premium reader sees it, server included.
 *  Wrap it in a `Locked` OUTSIDE this scope — that one decides whether the
 *  reader sees it (the stock report's hidden copy, 2026-11-01). */
export function OpenScope({ children }: { children: ReactNode }) {
  const parent = useContext(Ctx);
  return <Ctx.Provider value={{ ...parent, unlocked: true, forced: true }}>{children}</Ctx.Provider>;
}

// Shares this tab already asked the backend to open (StrictMode runs effects
// twice; a failed call is not retried until the page reloads).
const asked = new Set<string>();

/** The stock page's scope: the whole page opens when the reader opened it
 *  with one of the month's report keys (2026-10-29). Decided after mount —
 *  the page is ISR. The free report of the day (one familiar share open for
 *  everyone) was removed 2026-11-08, user decision.
 *
 *  `auto` (2026-11-08, user: "auto-open 10 a month"): a signed-in free reader
 *  with free analyses left gets this share opened by itself — one key spent,
 *  the share open to the end of the month. Only pass it when the page has an
 *  analysis to show, or an ungraded share would cost a key for nothing. */
export default function StockLockScope({
  code,
  anchor,
  auto = false,
  children,
}: {
  code: string;
  anchor?: string;
  auto?: boolean;
  children: ReactNode;
}) {
  const { user, isLoading, refreshUser } = useAuth();
  const [opening, setOpening] = useState(false);
  const keys = user?.report_keys;
  const keyed = hasReportKey(keys, code);

  const isPaid = userIsPremium(user);
  const left = keys?.left ?? 0;
  const want = auto && !isLoading && !!user && !isPaid && !keyed && left > 0;
  useEffect(() => {
    const c = code.toUpperCase();
    if (!want || asked.has(c)) return;
    asked.add(c);
    setOpening(true);
    trackEvent("report_key_open", { code: c, left, auto: 1 });
    apiOpenReportKey(c)
      .catch(() => undefined)
      .then(() => refreshUser().catch(() => undefined))
      .finally(() => setOpening(false));
  }, [want, code, left, refreshUser]);

  const reason = keyed ? "key" : undefined;
  // Pending from the render that decides to open (no frame of the Premium
  // card first) until the reply; a failed call shows the card again.
  const pending = (want && !asked.has(code.toUpperCase())) || opening;
  return <Ctx.Provider value={{ anchor, unlocked: !!reason, reason, opening: pending && !reason }}>{children}</Ctx.Provider>;
}
