import Link from "next/link";
import type { HomeAlert, HomeAlertKind } from "@/lib/home-alerts";
import type { BriefSegment } from "@/lib/daily-brief";
import DashHeader, { HeaderChip } from "@/components/home/personalized/DashHeader";
import {
  IconArrowDown,
  IconArrowUp,
  IconCheck,
  IconChevron,
  IconCoin,
  IconNews,
  IconSparkle,
  IconTarget,
  IconTrendDown,
  IconTrendUp,
  IconWallet,
} from "@/components/home/personalized/DashIcons";

const TONE_COLOR: Record<NonNullable<BriefSegment["tone"]>, string> = {
  pos: "var(--positive)",
  neg: "var(--negative)",
  accent: "var(--primary)",
};

const MAX_ROWS = 4;

/** One SVG per alert kind — the row's tone colours it. */
function KindIcon({ kind, tone }: { kind: HomeAlertKind; tone: HomeAlert["tone"] }) {
  const up = tone === "positive";
  switch (kind) {
    case "target":
      return <IconTarget size={16} />;
    case "signal":
      return <IconSparkle size={16} />;
    case "portfolio":
      return <IconWallet size={16} />;
    case "mover":
      return up ? <IconTrendUp size={16} /> : <IconTrendDown size={16} />;
    case "high":
      return <IconArrowUp size={16} />;
    case "low":
      return <IconArrowDown size={16} />;
    case "dividend":
      return <IconCoin size={16} />;
    case "news":
    default:
      return <IconNews size={16} />;
  }
}

/**
 * The single home for "what happened on your stocks today" — replaces the old
 * triple surface (header bell + Alerts stat-tile + concierge brief line).
 *
 *  • Any actionable alerts  → a compact "Needs your attention" list.
 *  • Nothing actionable     → one calm "all caught up" concierge line (the
 *    daily brief; on quiet days it reads market/breadth, never repeating the
 *    money hero's own today-move).
 *  • Truly nothing to say   → renders null.
 *
 * The header is deliberately neutral (no amber tile, no red badge): most of
 * these rows are dividends and 52-week highs, not alarms. Each row carries its
 * own tone colour instead.
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
        <DashHeader
          title="Needs your attention"
          chips={<HeaderChip>{alerts.length > 9 ? "9+" : alerts.length}</HeaderChip>}
        />

        <ul className="divide-y divide-[var(--cell-rule)]">
          {shown.map((a) => {
            const toneColor =
              a.tone === "positive"
                ? "var(--positive)"
                : a.tone === "negative"
                  ? "var(--negative)"
                  : "var(--primary)";
            const inner = (
              <>
                <span
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                  style={{ color: toneColor, background: `color-mix(in srgb, ${toneColor} 11%, transparent)` }}
                  aria-hidden
                >
                  <KindIcon kind={a.kind} tone={a.tone} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-[var(--text)]">{a.title}</span>
                  {a.detail && (
                    <span className="block truncate text-xs font-medium" style={{ color: toneColor }}>
                      {a.detail}
                    </span>
                  )}
                </span>
                {a.href && (
                  <span className="shrink-0 text-[var(--text-muted)]">
                    <IconChevron size={15} />
                  </span>
                )}
              </>
            );
            return (
              <li key={a.id}>
                {a.href ? (
                  <Link
                    prefetch={false}
                    href={a.href}
                    className="flex items-center gap-2.5 px-4 py-2.5 transition-colors hover:bg-[var(--surface-2)] active:bg-[var(--surface-2)]"
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
          className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[var(--positive)]"
          style={{ background: "color-mix(in srgb, var(--positive) 12%, transparent)" }}
          aria-hidden
        >
          <IconCheck size={13} />
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
