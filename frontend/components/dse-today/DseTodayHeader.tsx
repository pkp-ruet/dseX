import { abbrev, crore, croreShares, formatDate, pct, signed } from "@/lib/formatters";
import type { MarketIndexData } from "@/lib/api";
import type { ReactNode } from "react";
import { T } from "@/components/i18n/T";
import { bnDate, croreBn } from "@/lib/bn";

type Condition = "falling" | "rising" | "sideways" | "unknown";

interface Props {
  header: MarketIndexData;
  condition: Condition;
}

const CONDITION_META: Record<Condition, { en: string; bn: string; color: string }> = {
  rising:   { en: "Market rising",       bn: "বাজার বাড়ছে",        color: "var(--positive)" },
  falling:  { en: "Market falling",      bn: "বাজার কমছে",         color: "var(--negative)" },
  sideways: { en: "Market flat",         bn: "বাজার স্থির",         color: "var(--warm)" },
  unknown:  { en: "No data yet",         bn: "এখনো তথ্য নেই",      color: "var(--text-muted)" },
};

/** A single index quote (DSEX / DSES / DS30). DSEX is emphasised as the lead. */
function IndexTile({ name, value, change, changePct, lead = false }: {
  name: string;
  value: number | null;
  change: number | null;
  changePct?: number | null;
  lead?: boolean;
}) {
  const hasChange = change != null;
  const up = (change ?? 0) >= 0;
  const color = hasChange ? (up ? "var(--positive)" : "var(--negative)") : "var(--text-muted)";

  return (
    <div
      className="flex flex-col gap-1 rounded-xl border p-2.5 sm:p-3"
      style={{
        background: lead
          ? "color-mix(in srgb, var(--primary) 6%, var(--surface-2))"
          : "var(--surface-2)",
        borderColor: lead
          ? "color-mix(in srgb, var(--primary) 24%, var(--border))"
          : "var(--border)",
      }}
    >
      <span
        className="text-xs font-semibold"
        style={{ color: lead ? "var(--primary-ink)" : "var(--text-muted)" }}
      >
        {name}
      </span>
      <span className="text-base sm:text-xl font-extrabold leading-none tabular-nums text-text-main">
        {value != null ? value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
      </span>
      {/* flex-wrap: "▲ +18.45 (+0.35%)" is ~100px but a 3-up tile is ~70px at 360px,
          so the percentage drops to its own line instead of running into DSES. */}
      <span className="flex min-w-0 flex-wrap items-baseline gap-x-1 text-xs sm:text-xs font-bold tabular-nums" style={{ color }}>
        {hasChange ? (
          <>
            <span className="text-xs">{up ? "▲" : "▼"}</span>
            {signed(change)}
            {changePct != null && <span>({signed(changePct, 2)}%)</span>}
          </>
        ) : (
          "—"
        )}
      </span>
    </div>
  );
}

/** A market-total stat (volume / turnover / trades) with optional day-over-day sub. */
function StatTile({ label, value, sub, subColor }: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  subColor?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-surface-2 p-2.5 sm:p-3">
      <span className="text-xs font-semibold text-text-muted">
        {label}
      </span>
      <span className="text-sm sm:text-lg font-extrabold leading-none tabular-nums text-text-main">
        {value}
      </span>
      <span className="text-xs font-bold tabular-nums" style={{ color: subColor || "var(--text-muted)" }}>
        {sub || " "}
      </span>
    </div>
  );
}

export default function DseTodayHeader({ header, condition }: Props) {
  const cond = CONDITION_META[condition];
  const dateLabel = header.date ? (
    <T en={formatDate(header.date)} bn={bnDate(header.date)} />
  ) : (
    <T en="Latest" bn="সর্বশেষ" />
  );
  // "% vs the day before" in both languages.
  const dod = (v: number | null | undefined) =>
    v != null ? <T en={`${signed(v, 1)}% vs day before`} bn={`আগের দিনের চেয়ে ${signed(v, 1)}%`} /> : undefined;

  const up = header.up_count ?? 0;
  const down = header.down_count ?? 0;
  const flat = header.neutral_count ?? 0;
  const breadthTotal = up + down + flat;
  const upWidth = breadthTotal > 0 ? (up / breadthTotal) * 100 : 0;
  const downWidth = breadthTotal > 0 ? (down / breadthTotal) * 100 : 0;
  const flatWidth = breadthTotal > 0 ? (flat / breadthTotal) * 100 : 0;
  const flatColor = "color-mix(in srgb, var(--text-muted) 45%, var(--surface-2))";

  const volSubColor =
    header.volume_change_pct == null
      ? undefined
      : header.volume_change_pct >= 0 ? "var(--positive)" : "var(--negative)";
  const turnSubColor =
    header.turnover_change_pct == null
      ? undefined
      : header.turnover_change_pct >= 0 ? "var(--positive)" : "var(--negative)";

  return (
    <section className="soft-card overflow-hidden mb-6">
      {/* Condition accent bar */}
      <div
        className="h-1 w-full"
        style={{ background: `linear-gradient(90deg, ${cond.color}, color-mix(in srgb, ${cond.color} 30%, transparent))` }}
      />

      <div className="flex flex-col gap-4 p-4 sm:p-5">
        {/* Top — date + condition */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-muted">
              <T en="Trading day" bn="লেনদেনের দিন" />
            </span>
            <span className="text-sm font-bold text-text-main">{dateLabel}</span>
          </div>
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{
              color: cond.color,
              background: `color-mix(in srgb, ${cond.color} 12%, var(--surface))`,
              border: `1px solid color-mix(in srgb, ${cond.color} 30%, var(--border))`,
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: cond.color }} />
            <T en={cond.en} bn={cond.bn} />
          </span>
        </div>

        {/* Indices */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <IndexTile name="DSEX" value={header.dsex} change={header.dsex_change} changePct={header.dsex_change_pct} lead />
          <IndexTile name="DSES" value={header.dses} change={header.dses_change} />
          <IndexTile name="DS30" value={header.ds30} change={header.ds30_change} />
        </div>

        {/* Totals */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <StatTile
            label={<T en="Shares traded" bn="শেয়ার হাতবদল" />}
            value={
              header.total_volume != null ? (
                <T
                  en={croreShares(header.total_volume)}
                  bn={croreShares(header.total_volume).replace(" Cr", " কোটি")}
                />
              ) : (
                "—"
              )
            }
            sub={dod(header.volume_change_pct)}
            subColor={volSubColor}
          />
          <StatTile
            label={<T en="Value traded" bn="লেনদেনের পরিমাণ" />}
            value={
              header.total_value_mn != null ? (
                <T en={crore(header.total_value_mn)} bn={croreBn(header.total_value_mn)} />
              ) : (
                "—"
              )
            }
            sub={dod(header.turnover_change_pct)}
            subColor={turnSubColor}
          />
          <StatTile
            label={<T en="Trades" bn="লেনদেন সংখ্যা" />}
            value={header.total_trades != null ? abbrev(header.total_trades) : "—"}
          />
        </div>

        {/* Breadth */}
        <div className="rounded-xl border border-border bg-surface-2 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-text-muted">
              <T en="Rises and falls" bn="দাম বাড়া ও কমা" />
            </span>
            <span className="text-xs font-bold tabular-nums">
              <span className="text-positive">
                <T en={`${up} up`} bn={`${up}টি বেড়েছে`} />
              </span>
              <span className="text-text-muted"> · </span>
              <span className="text-negative">
                <T en={`${down} down`} bn={`${down}টি কমেছে`} />
              </span>
              <span className="text-text-muted">
                {" · "}
                <T en={`${flat} unchanged`} bn={`${flat}টি অপরিবর্তিত`} />
              </span>
            </span>
          </div>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-bg">
            <div style={{ width: `${upWidth}%`, background: "var(--positive)" }} />
            <div style={{ width: `${flatWidth}%`, background: flatColor }} />
            <div style={{ width: `${downWidth}%`, background: "var(--negative)" }} />
          </div>
          {breadthTotal > 0 && (
            <div className="mt-1.5 text-xs font-semibold tabular-nums text-text-muted">
              <T
                en={`${pct((up / breadthTotal) * 100)} rose · ${pct((down / breadthTotal) * 100)} fell`}
                bn={`${pct((up / breadthTotal) * 100)} বেড়েছে · ${pct((down / breadthTotal) * 100)} কমেছে`}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
