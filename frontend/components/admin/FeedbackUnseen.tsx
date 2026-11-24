"use client";

import { useEffect, useState } from "react";
import { apiGetFeedbackUnseen, type AdminFeedbackUnseen } from "@/lib/api";

/**
 * "N new" on the admin Feedback button (2026-11-24, user: "show a hint if new
 * review arrives so i dont have to click everytime to check"). Counts the
 * reviews and finished survey answers since this admin last opened each tab
 * of /admin/feedback (`users.admin_seen`, set by that page). Asked on load,
 * every 2 minutes while the tab is in view, and when the tab comes back.
 */

const EVERY_MS = 2 * 60 * 1000;

export function useFeedbackUnseen(enabled: boolean): AdminFeedbackUnseen | null {
  const [unseen, setUnseen] = useState<AdminFeedbackUnseen | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    const check = () => {
      if (document.visibilityState !== "visible") return;
      apiGetFeedbackUnseen()
        .then((u) => live && setUnseen(u))
        .catch(() => undefined);
    };
    check();
    const t = window.setInterval(check, EVERY_MS);
    document.addEventListener("visibilitychange", check);
    return () => {
      live = false;
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", check);
    };
  }, [enabled]);

  return unseen;
}

/** Is `iso` later than `since`? The API sends stored times without a zone (UTC). */
export function isAfter(iso: string | null, since: string): boolean {
  if (!iso) return false;
  const utc = (v: string) => Date.parse(/[zZ]|[+-]\d{2}:\d{2}$/.test(v) ? v : `${v}Z`);
  return utc(iso) > utc(since);
}

/** Where the button should open: straight to the survey when only survey answers are new. */
export function feedbackHref(u: AdminFeedbackUnseen | null): string {
  return u && u.survey > 0 && u.reviews === 0 ? "/admin/feedback#survey" : "/admin/feedback";
}

/** "2 new reviews, 1 new survey answer". */
export function unseenWords(u: AdminFeedbackUnseen): string {
  const parts: string[] = [];
  if (u.reviews) parts.push(`${u.reviews} new review${u.reviews === 1 ? "" : "s"}`);
  if (u.survey) parts.push(`${u.survey} new survey answer${u.survey === 1 ? "" : "s"}`);
  return parts.join(", ");
}

export function NewBadge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-on-fill nums">
      {n > 99 ? "99+" : `${n} new`}
    </span>
  );
}
