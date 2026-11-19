"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { T } from "@/components/i18n/T";
import { useAuth } from "@/context/AuthContext";

/**
 * The page header's one action: jump to "Your plan" (since the 2026-10-30
 * report the answer sits right under the money, so the jump goes to what to
 * do). Quiet and plain: the page's only filled buttons are the ones that
 * change something ("+ Add stock").
 */
export default function ViewAnalysisButton() {
  const { user } = useAuth();
  // The plan is Premium and needs shares: only show the jump when it lands
  // on something (free readers and empty portfolios have no #ch-plan).
  const [hasPlan, setHasPlan] = useState(false);
  useEffect(() => {
    if (!user?.is_premium) {
      setHasPlan(false);
      return;
    }
    if (document.getElementById("ch-plan")) {
      setHasPlan(true);
      return;
    }
    const obs = new MutationObserver(() => {
      if (document.getElementById("ch-plan")) {
        setHasPlan(true);
        obs.disconnect();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [user?.is_premium]);

  if (!hasPlan) return null;

  function handleClick() {
    const el = document.getElementById("ch-plan");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <Button type="button" variant="quiet" onClick={handleClick} className="group">
      <T en="See your plan" bn="আপনার পরিকল্পনা দেখুন" />
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-transform duration-200 group-hover:translate-y-0.5"
        aria-hidden="true"
      >
        <path d="M12 5v14M6 13l6 6 6-6" />
      </svg>
    </Button>
  );
}
