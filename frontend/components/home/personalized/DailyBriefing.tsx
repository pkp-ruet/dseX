import Link from "next/link";
import Card from "@/components/ui/Card";

interface Props {
  todayMove: { delta: number; pct: number } | null;
  alertCount: number;
  newsCount: number;
  hasPortfolio: boolean;
  hasWatchlist: boolean;
}

function fmtTk(n: number): string {
  return `৳${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/**
 * One-glance daily hook under the greeting. When the user has data we show a
 * "Daily Check-In" pill row (streak · portfolio today · alerts · new news).
 * A brand-new account (no portfolio AND no watchlist) instead sees a "Get
 * started" checklist so the habit loop is reinforced from day one.
 */
export default function DailyBriefing({
  todayMove,
  alertCount,
  newsCount,
  hasPortfolio,
  hasWatchlist,
}: Props) {
  // ── Empty account → onboarding checklist ──────────────────────────────────
  if (!hasPortfolio && !hasWatchlist) {
    const steps = [
      { done: hasPortfolio, label: "Add your holdings", href: "/portfolio" },
      { done: hasWatchlist, label: "Build your watchlist", href: "/watchlist" },
    ];
    return (
      <Card padding="none" className="mt-3 p-4">
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Get started
        </p>
        <p className="mt-0.5 text-sm font-semibold text-[var(--text)]">
          Two quick steps to make this your daily stock check-in.
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {steps.map((s, i) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className="group flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 transition-colors hover:border-[var(--primary)]"
              >
                <span
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[0.7rem] font-bold"
                  style={
                    s.done
                      ? { background: "var(--positive)", borderColor: "var(--positive)", color: "#fff" }
                      : { borderColor: "var(--border)", color: "var(--text-muted)" }
                  }
                  aria-hidden
                >
                  {s.done ? "✓" : i + 1}
                </span>
                <span className="flex-1 text-sm font-semibold text-[var(--text)]">{s.label}</span>
                <span className="text-sm font-bold text-[var(--primary)] transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    );
  }

  // ── Has data → glanceable check-in chips ──────────────────────────────────
  const up = (todayMove?.delta ?? 0) >= 0;

  const chips: React.ReactNode[] = [];

  if (todayMove) {
    chips.push(
      <span
        key="pf"
        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.8rem] font-bold tabular-nums nums"
        style={{
          color: up ? "var(--positive)" : "var(--negative)",
          borderColor: `color-mix(in srgb, ${up ? "var(--positive)" : "var(--negative)"} 30%, var(--border))`,
          background: `color-mix(in srgb, ${up ? "var(--positive)" : "var(--negative)"} 8%, var(--surface))`,
        }}
      >
        Portfolio {up ? "+" : "−"}
        {fmtTk(todayMove.delta)} today
      </span>,
    );
  }

  if (alertCount > 0) {
    chips.push(
      <span
        key="alerts"
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-[0.8rem] font-bold text-[var(--text)]"
      >
        <span aria-hidden>⚡</span>
        {alertCount} {alertCount === 1 ? "alert" : "alerts"}
      </span>,
    );
  }

  if (newsCount > 0) {
    chips.push(
      <span
        key="news"
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-[0.8rem] font-bold text-[var(--text)]"
      >
        <span aria-hidden>📰</span>
        {newsCount} news
      </span>,
    );
  }

  if (chips.length === 0) return null;

  return <div className="mt-3 flex flex-wrap items-center gap-2">{chips}</div>;
}
