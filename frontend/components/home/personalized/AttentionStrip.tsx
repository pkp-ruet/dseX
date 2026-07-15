import Link from "next/link";
import type { HomeAlert } from "@/lib/home-alerts";
import type { BriefSegment } from "@/lib/daily-brief";

const TONE_COLOR: Record<NonNullable<BriefSegment["tone"]>, string> = {
  pos: "var(--positive)",
  neg: "var(--negative)",
  accent: "var(--primary)",
};

const MAX_ROWS = 4;

const BELL = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const CHEVRON = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[var(--text-muted)]" aria-hidden>
    <path d="M9 18l6-6-6-6" />
  </svg>
);

/**
 * The single home for "what happened on your stocks today" — replaces the old
 * triple surface (header bell + Alerts stat-tile + concierge brief line).
 *
 *  • Any actionable alerts  → a compact "Needs your attention" list.
 *  • Nothing actionable     → one calm "all caught up" concierge line (the
 *    daily brief; on quiet days it reads market/breadth, never repeating the
 *    money hero's own today-move).
 *  • Truly nothing to say   → renders null.
 */
export default function AttentionStrip({
  alerts,
  brief,
}: {
  alerts: HomeAlert[];
  brief: BriefSegment[];
}) {
  if (alerts.length > 0) {
    const shown = alerts.slice(0, MAX_ROWS);
    return (
      <section className="soft-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2.5">
          <span
            className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-white"
            style={{ background: "var(--np-cautious)" }}
            aria-hidden
          >
            {BELL}
          </span>
          <h2 className="text-[0.72rem] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
            Needs your attention
          </h2>
          <span
            className="ml-auto grid h-5 min-w-[20px] place-items-center rounded-full px-1.5 text-[0.66rem] font-extrabold leading-none text-white"
            style={{ background: "var(--negative)" }}
          >
            {alerts.length > 9 ? "9+" : alerts.length}
          </span>
        </div>

        <ul className="divide-y divide-[var(--cell-rule)]">
          {shown.map((a) => {
            const toneColor =
              a.tone === "positive"
                ? "var(--positive)"
                : a.tone === "negative"
                  ? "var(--negative)"
                  : "var(--text-muted)";
            const inner = (
              <>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--surface-2)] text-sm" aria-hidden>
                  {a.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[var(--text)]">{a.title}</span>
                  {a.detail && (
                    <span className="block truncate text-xs font-medium" style={{ color: toneColor }}>
                      {a.detail}
                    </span>
                  )}
                </span>
                {a.href && CHEVRON}
              </>
            );
            return (
              <li key={a.id}>
                {a.href ? (
                  <Link
                    prefetch={false}
                    href={a.href}
                    className="flex items-center gap-2.5 px-4 py-2.5 transition-colors hover:bg-[var(--surface-2)]"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div className="flex items-center gap-2.5 px-4 py-2.5">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>

        {alerts.length > MAX_ROWS && (
          <p className="border-t border-[var(--border)] px-4 py-2 text-[0.68rem] font-semibold text-[var(--text-muted)]">
            +{alerts.length - MAX_ROWS} more on your stocks today
          </p>
        )}
      </section>
    );
  }

  if (brief.length > 0) {
    return (
      <section className="soft-card flex items-start gap-2.5 px-4 py-3">
        <span
          className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg text-sm font-bold text-[var(--positive)]"
          style={{ background: "color-mix(in srgb, var(--positive) 12%, transparent)" }}
          aria-hidden
        >
          ✓
        </span>
        <p className="text-[0.85rem] leading-relaxed text-[var(--text-muted)]">
          <span className="font-bold text-[var(--text)]">All caught up. </span>
          {brief.map((s, i) => (
            <span
              key={i}
              className={s.tone ? "font-bold" : undefined}
              style={s.tone ? { color: TONE_COLOR[s.tone] } : undefined}
            >
              {s.text}
            </span>
          ))}
        </p>
      </section>
    );
  }

  return null;
}
