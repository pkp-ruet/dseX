import type { ReactNode } from "react";
import { T } from "@/components/i18n/T";
import { bnDate } from "@/lib/bn";
import { formatDate, pct } from "@/lib/formatters";
import type { DividendCalendarData } from "@/lib/api";

function StatTile({ label, value, sub, accent }: {
  label: ReactNode;
  value: string;
  sub?: ReactNode;
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
        className="text-xs font-semibold"
        style={{ color: accent ?? "var(--text-muted)" }}
      >
        {label}
      </span>
      <span className="text-base sm:text-xl font-extrabold leading-none tabular-nums text-text-main">
        {value}
      </span>
      <span className="text-xs font-bold tabular-nums text-text-muted">
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
            <span className="text-xs font-semibold text-text-muted">
              <T en="Updated" bn="হালনাগাদ" />
            </span>
            <span className="text-sm font-bold text-text-main">
              <T en={formatDate(data.today)} bn={bnDate(data.today)} />
            </span>
          </div>
          {next?.record_date && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold"
              style={{
                color: "var(--positive)",
                background: "color-mix(in srgb, var(--positive) 12%, var(--surface))",
                border: "1px solid color-mix(in srgb, var(--positive) 30%, var(--border))",
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--positive)" }} />
              <T
                en={`Next record date · ${next.trading_code} · ${formatDate(next.record_date)}`}
                bn={`পরের রেকর্ড ডেট · ${next.trading_code} · ${bnDate(next.record_date)}`}
              />
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <StatTile
            label={<T en="Record dates" bn="রেকর্ড ডেট" />}
            value={String(s.upcoming_record_dates)}
            sub={<T en="next 120 days" bn="সামনের 120 দিনে" />}
            accent="var(--positive)"
          />
          <StatTile
            label={<T en="This week" bn="এই সপ্তাহে" />}
            value={String(s.record_dates_this_week)}
            sub={<T en="within 7 days" bn="7 দিনের মধ্যে" />}
            accent={s.record_dates_this_week > 0 ? "var(--warm)" : undefined}
          />
          <StatTile
            label={<T en="AGMs ahead" bn="সামনের এজিএম" />}
            value={String(s.upcoming_agms)}
            sub={<T en="dates announced" bn="তারিখ ঘোষিত" />}
          />
          <StatTile
            label={<T en="Best yield" bn="সর্বোচ্চ ইল্ড" />}
            value={s.top_yield_pct != null ? pct(s.top_yield_pct, 1) : "—"}
            sub={<T en="cash, record date ahead" bn="নগদ, রেকর্ড ডেট সামনে" />}
          />
        </div>

        <div className="rounded-xl border border-border bg-surface-2 p-3">
          <p className="text-sm font-medium leading-relaxed text-text-main">
            <T en={data.note_en} bn={data.note_bn} />
          </p>
        </div>
      </div>
    </section>
  );
}
