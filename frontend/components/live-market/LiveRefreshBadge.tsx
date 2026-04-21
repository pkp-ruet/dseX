"use client";

interface Props {
  secondsSinceUpdate: number;
  loading: boolean;
  onRefresh: () => void;
  isOpen: boolean;
}

export default function LiveRefreshBadge({ secondsSinceUpdate, loading, onRefresh, isOpen }: Props) {
  const INTERVAL = 60;
  const progress = Math.min((secondsSinceUpdate / INTERVAL) * 100, 100);
  const radius = 8;
  const circ = 2 * Math.PI * radius;
  const dash = circ - (progress / 100) * circ;

  return (
    <div className="flex items-center gap-2">
      {isOpen && (
        <svg width="22" height="22" className="shrink-0">
          <circle cx="11" cy="11" r={radius} fill="none" stroke="var(--border)" strokeWidth="2" />
          <circle
            cx="11"
            cy="11"
            r={radius}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeDasharray={circ}
            strokeDashoffset={dash}
            strokeLinecap="round"
            style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
      )}
      <span className="text-xs text-[var(--text-muted)]">
        {loading ? "Updating…" : secondsSinceUpdate < 5 ? "Just updated" : `Updated ${secondsSinceUpdate}s ago`}
      </span>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="text-xs text-[var(--accent)] hover:underline disabled:opacity-50"
      >
        ↻
      </button>
    </div>
  );
}
