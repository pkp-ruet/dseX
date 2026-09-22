"use client";

import Button from "@/components/ui/Button";

export default function ViewAnalysisButton() {
  function handleClick() {
    const el = document.getElementById("portfolio-analysis");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <Button type="button" variant="primary" onClick={handleClick} aria-label="View portfolio analysis" className="group">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M11 2 9 7 4 9l5 2 2 5 2-5 5-2-5-2-2-5zm8 11-1 3-3 1 3 1 1 3 1-3 3-1-3-1-1-3z" />
      </svg>
      <span>View Analysis</span>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-transform duration-200 group-hover:translate-y-0.5"
        aria-hidden="true"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </Button>
  );
}
