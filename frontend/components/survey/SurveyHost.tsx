"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { apiGetSurvey, apiSurveyEvent } from "@/lib/api";
import { isMarketOpen } from "@/lib/market-hours";
import { trackEvent } from "@/lib/track";
import type { SurveyState } from "@/lib/survey";
import SurveyFlow from "@/components/survey/SurveyFlow";

/**
 * Opens the reader survey by itself (mounted once in the root layout; it
 * replaced the one-time star pop-up `FeedbackPrompt` on 2026-11-24).
 *
 * The browser's checks: signed in, `/me` says `survey.ask`, the second page
 * of a visit, 5 seconds on it, not on the Premium / sign-in / admin / feedback
 * pages, outside DSE trading hours, and no other dialog or bottom card open.
 * Then the server decides (`GET /api/user/survey` → `due`: the reader's plan,
 * account age, days active, Later / Don't ask again / done). The server is
 * asked at most once a visit.
 */

const PAGES_KEY = "dsex.survey.pages";
const CHECKED_KEY = "dsex.survey.checked";
const DELAY_MS = 5000;
const NOT_ON = /^\/(premium|login|register|feedback|admin|refund-policy)(\/|$)/;

function busy(): boolean {
  if (document.body.style.overflow === "hidden") return true;
  return Boolean(document.querySelector('[role="dialog"]:not([aria-hidden="true"]), [data-bottom-card]'));
}

export default function SurveyHost() {
  const { user, isLoggedIn, isLoading, refreshUser } = useAuth();
  const pathname = usePathname();
  const { bn } = useLang();
  const [state, setState] = useState<SurveyState | null>(null);
  const [mounted, setMounted] = useState(false);
  const pages = useRef(0);

  useEffect(() => setMounted(true), []);

  // Pages seen this visit (a tab's session, so a reload isn't a new visit).
  useEffect(() => {
    try {
      const n = Number(sessionStorage.getItem(PAGES_KEY) || "0") + 1;
      sessionStorage.setItem(PAGES_KEY, String(n));
      pages.current = n;
    } catch {
      pages.current += 1;
    }
  }, [pathname]);

  const ask = Boolean(user?.survey?.ask);
  const round = user?.survey?.round ?? "";

  useEffect(() => {
    if (isLoading || !isLoggedIn || !ask || state) return;
    if (pages.current < 2 || NOT_ON.test(pathname ?? "")) return;
    try {
      if (sessionStorage.getItem(CHECKED_KEY) === round) return;
    } catch {}
    let cancelled = false;
    const t = window.setTimeout(async () => {
      // During trading, or over another dialog: try again on a later page.
      if (cancelled || isMarketOpen() || busy()) return;
      try {
        sessionStorage.setItem(CHECKED_KEY, round);
      } catch {}
      try {
        const s = await apiGetSurvey();
        if (cancelled || !s.due || busy()) return;
        setState(s);
        apiSurveyEvent("shown").catch(() => undefined);
        trackEvent("survey_shown", { segment: s.segment, resumed: s.step > 0 ? 1 : 0 });
      } catch {}
    }, DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [isLoading, isLoggedIn, ask, round, pathname, state]);

  // No page scroll behind the survey.
  useEffect(() => {
    if (!state) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [state]);

  function onClose(how: "later" | "never" | "done") {
    const seg = state?.segment ?? "";
    setState(null);
    if (how !== "done") apiSurveyEvent(how).catch(() => undefined);
    trackEvent("survey_close", { how, segment: seg });
    // `/me` then says not to ask again on this device or any other.
    window.setTimeout(() => refreshUser().catch(() => undefined), 800);
  }

  if (!mounted || !state) return null;
  return createPortal(
    <div className="sv-overlay">
      <div className="sv-panel" role="dialog" aria-modal="true" aria-label={bn ? "আপনার মতামত" : "Your feedback"}>
        <SurveyFlow state={state} mode="popup" onClose={onClose} fromPath={pathname ?? undefined} />
      </div>
    </div>,
    document.body,
  );
}
