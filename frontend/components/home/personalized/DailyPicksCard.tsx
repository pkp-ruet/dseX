import Link from "next/link";
import { type RecommendedStock } from "@/lib/api";
import RecommendCard from "@/components/home/personalized/RecommendCard";

const SPARKLE = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2l1.9 5.6L19.5 9l-5.1 2.7L12 17l-2.4-5.3L4.5 9l5.6-1.4L12 2z" />
    <path d="M19 14l.9 2.6L22.5 18l-2.6 1.1L19 22l-.9-2.9L15.5 18l2.6-1.4L19 14z" opacity="0.6" />
  </svg>
);

export default function DailyPicksCard({ picks }: { picks: RecommendedStock[] }) {
  if (!picks || picks.length === 0) return null;

  return (
    <RecommendCard accent="var(--primary)" icon={SPARKLE} title="Picked for you today" subtitle="Refreshes daily">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {picks.map((p) => {
          return (
            <Link
              key={p.trading_code}
              prefetch={false} href={`/stock/${p.trading_code}`}
              className="hover-lift group flex flex-col gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5"
            >
              <span className="flex items-center gap-1.5">
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

              <span className="font-mono font-extrabold text-[1.2rem] leading-none tracking-tight text-[var(--text)] truncate">
                {p.trading_code}
              </span>

              <span className="inline-flex items-center gap-1 self-start text-[0.7rem] font-semibold text-[var(--primary)] transition-all group-hover:gap-1.5">
                Analyze
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </span>
            </Link>
          );
        })}
      </div>
    </RecommendCard>
  );
}
