import Link from "next/link";
import { type RecommendedStock } from "@/lib/api";

const SPARKLE = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2l1.9 5.6L19.5 9l-5.1 2.7L12 17l-2.4-5.3L4.5 9l5.6-1.4L12 2z" />
    <path d="M19 14l.9 2.6L22.5 18l-2.6 1.1L19 22l-.9-2.9L15.5 18l2.6-1.4L19 14z" opacity="0.6" />
  </svg>
);

export default function DailyPicksCard({ picks }: { picks: RecommendedStock[] }) {
  if (!picks || picks.length === 0) return null;

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_8px_30px_-12px_rgba(15,23,42,0.14)] overflow-hidden">
      <div
        className="flex items-center gap-2.5 px-4 sm:px-5 py-3.5 border-b border-[var(--border)]"
        style={{ background: "linear-gradient(180deg, color-mix(in srgb, var(--primary) 6%, var(--surface)) 0%, var(--surface) 100%)" }}
      >
        <span
          className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-[var(--primary)] shrink-0"
          style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
          aria-hidden
        >
          {SPARKLE}
        </span>
        <div className="min-w-0">
          <h2 className="text-[0.95rem] font-extrabold tracking-tight text-[var(--text)] leading-tight">
            Picked for you today
          </h2>
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Refreshes daily
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 sm:p-4">
        {picks.map((p) => {
          return (
            <Link
              key={p.trading_code}
              href={`/stock/${p.trading_code}`}
              className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-[var(--border)] p-3.5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[var(--primary)] hover:shadow-xl"
              style={{
                background: "linear-gradient(160deg, var(--surface) 0%, var(--surface-2) 100%)",
              }}
            >
              {/* primary glow that blooms on hover */}
              <span
                aria-hidden
                className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-40"
                style={{ background: "var(--primary)" }}
              />

              <span className="relative flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
                <span className="text-[0.78rem] font-bold tabular-nums text-[var(--text)]">
                  {p.ltp != null ? `৳${p.ltp.toFixed(2)}` : "—"}
                </span>
                {p.change_pct != null && (
                  <span
                    className="text-[0.68rem] font-bold tabular-nums"
                    style={{ color: p.change_pct >= 0 ? "var(--positive)" : "var(--negative)" }}
                  >
                    {p.change_pct >= 0 ? "+" : ""}
                    {p.change_pct.toFixed(2)}%
                  </span>
                )}
              </span>

              <span className="relative font-mono font-extrabold text-[1.2rem] leading-none tracking-tight text-[var(--text)] truncate">
                {p.trading_code}
              </span>

              <span
                className="relative inline-flex items-center gap-1 self-start rounded-full px-2.5 py-1 text-[0.68rem] font-bold text-[var(--primary)] transition-colors group-hover:text-white"
                style={{ background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}
              >
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-[var(--primary)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />
                <span className="relative">Analyze</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="relative transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
