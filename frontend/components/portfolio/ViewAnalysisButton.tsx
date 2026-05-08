"use client";

export default function ViewAnalysisButton() {
  function handleClick() {
    const el = document.getElementById("portfolio-analysis");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <button type="button" onClick={handleClick} className="view-analysis-btn">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="M7 14l4-4 4 4 5-6" />
      </svg>
      <span>View Analysis</span>
    </button>
  );
}
