import Bn from "@/components/i18n/Bn";
import { formatDate, pct } from "@/lib/formatters";
import type { DividendCalendarData } from "@/lib/api";

function StatTile({ label, value, sub, accent }: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div
      className="flex flex-col gap-1 rounded-xl border p-2.5 sm:p-3"
      style={{
        background: accent
          ? `color-mix(in srgb, ${accent} 7%, var(--surface-2))`
          : "var(--surface-2)",
        borderColor: accent
          ? `color-mix(in srgb, ${accent} 26%, var(--border))`
          : "var(--border)",
      }}
    >
      <span
        className="text-[11px] font-extrabold uppercase tracking-[0.14em]"
        style={{ color: accent ?? "var(--text-muted)" }}
      >
        {label}
      </span>
      <span className="text-base sm:text-xl font-extrabold leading-none tabular-nums text-[var(--text)]">
        {value}
      </span>
      <span className="text-[11px] font-bold tabular-nums text-[var(--text-muted)]">
        {sub || " "}
      </span>
    </div>
  );
}

/** Top-of-page summary: what's ahead, and the one rule that decides eligibility. */
export default function CalendarSummary({ data }: { data: DividendCalendarData }) {
  const s = data.stats;
  const next = data.record_dates[0];

  return (
    <section className="soft-card overflow-hidden mb-6">
      <div
        className="h-1 w-full"
        style={{
          background:
            "linear-gradient(90deg, var(--positive), color-mix(in srgb, var(--positive) 30%, transparent))",
        }}
      />

      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Updated
            </span>
            <span className="text-sm font-bold text-[var(--text)]">{formatDate(data.today)}</span>
          </div>
          {next?.record_date && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold"
              style={{
                color: "var(--positive)",
                background: "color-mix(in srgb, var(--positive) 12%, var(--surface))",
                border: "1px solid color-mix(in srgb, var(--positive) 30%, var(--border))",
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--positive)" }} />
              Next record date · {next.trading_code} · {formatDate(next.record_date)}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <StatTile
            label="Record dates"
            value={String(s.upcoming_record_dates)}
            sub="next 120 days"
            accent="var(--positive)"
          />
          <StatTile
            label="This week"
            value={String(s.record_dates_this_week)}
            sub="within 7 days"
            accent={s.record_dates_this_week > 0 ? "var(--warm)" : undefined}
          />
          <StatTile label="AGMs ahead" value={String(s.upcoming_agms)} sub="dates announced" />
          <StatTile
            label="Best yield"
            value={s.top_yield_pct != null ? pct(s.top_yield_pct, 1) : "—"}
            sub="cash, record date ahead"
          />
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <p className="text-[0.86rem] font-medium leading-relaxed text-[var(--text)]">
            {data.note_en}
          </p>
          <Bn className="mt-2 text-[0.9rem] font-medium leading-[1.85] text-[var(--text-muted)]">
            {data.note_bn}
          </Bn>
        </div>
      </div>
    </section>
  );
}
