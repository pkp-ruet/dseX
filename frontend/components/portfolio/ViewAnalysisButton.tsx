"use client";

export default function ViewAnalysisButton() {
  function handleClick() {
    const el = document.getElementById("portfolio-analysis");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="View portfolio analysis"
      className="group relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--primary)]"
      style={{
        background: "linear-gradient(95deg, var(--primary) 0%, var(--positive) 100%)",
        boxShadow: "0 6px 18px -5px color-mix(in srgb, var(--primary) 60%, transparent)",
      }}
    >
      {/* Analysis / sparkle mark */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M11 2 9 7 4 9l5 2 2 5 2-5 5-2-5-2-2-5zm8 11-1 3-3 1 3 1 1 3 1-3 3-1-3-1-1-3z" />
      </svg>
      <span>View Analysis</span>

      {/* Scroll-down affordance */}
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
    </button>
  );
}
