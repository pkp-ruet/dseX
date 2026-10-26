"use client";

import Button from "@/components/ui/Button";

/**
 * The page header's one action: jump to the analysis chapter. Quiet and
 * plain (2026-10-26 redesign): no sparkle icon, no primary fill — the page's
 * only filled buttons are the ones that change something ("+ Add stock").
 */
export default function ViewAnalysisButton() {
  function handleClick() {
    const el = document.getElementById("pf-analysis") ?? document.getElementById("portfolio-analysis");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <Button type="button" variant="quiet" onClick={handleClick} className="group">
      <span>See the analysis</span>
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
