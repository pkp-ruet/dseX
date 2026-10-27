import Link from "next/link";
import type { ReactNode } from "react";
import { T } from "@/components/i18n/T";
import { croreBn } from "@/lib/bn";
import TierPill from "@/components/ui/TierPill";
import ScoreBadge from "@/components/ui/ScoreBadge";
import { TierBar } from "@/components/sector/SectorCard";
import type { TierKey } from "@/lib/constants";
import { crore, pct, taka } from "@/lib/formatters";
import type { SectorSummary } from "@/lib/api";

const TIER_ORDER: TierKey[] = ["excellent", "good", "average", "weak"];

const CLASS_CHIP: Record<string, { label: string; labelBn: string; color: string }> = {
  BANK: { label: "a bank", labelBn: "ব্যাংক", color: "var(--info)" },
  NBFI: { label: "a finance company", labelBn: "আর্থিক প্রতিষ্ঠান", color: "var(--info)" },
  INSURANCE: { label: "an insurer", labelBn: "বিমা কোম্পানি", color: "var(--primary)" },
  GENERAL: { label: "a general company", labelBn: "সাধারণ কোম্পানি", color: "var(--text-muted)" },
};

function Stat({ label, value, sub, accent }: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  accent?: string;
}) {
  return (
    <div
      className="flex flex-col gap-1 rounded-xl border p-2.5 sm:p-3"
      style={{
        background: accent ? `color-mix(in srgb, ${accent} 7%, var(--surface-2))` : "var(--surface-2)",
        borderColor: accent ? `color-mix(in srgb, ${accent} 26%, var(--border))` : "var(--border)",
      }}
    >
      <span
        className="text-xs font-semibold"
        style={{ color: accent ?? "var(--text-muted)" }}
      >
        {label}
      </span>
      <span className="text-base font-extrabold leading-none tabular-nums text-text-main sm:text-xl">
        {value}
      </span>
      <span className="text-xs font-bold tabular-nums text-text-muted">
        {sub || " "}
      </span>
    </div>
  );
}

function MoverLine({ label, brief }: {
  label: ReactNode;
  brief: SectorSummary["best_today"];
}) {
  if (!brief) return null;
  const chg = brief.change_pct;
  const color = chg == null ? "var(--text-muted)" : chg >= 0 ? "var(--positive)" : "var(--negative)";
  return (
    <div className="flex items-baseline justify-between gap-2 text-sm font-semibold">
      <span className="text-text-muted">{label}</span>
      <span className="tabular-nums">
        <Link href={`/stock/${brief.trading_code}`} className="font-extrabold text-text-main hover:text-primary">
          {brief.trading_code}
        </Link>
        <span className="ml-2" style={{ color }}>
          {chg != null ? `${chg > 0 ? "+" : ""}${pct(chg, 2)}` : "—"}
        </span>
      </span>
    </div>
  );
}

/** Sector header card: size, valuation, today's move, and the tier mix. */
export default function SectorHero({ summary: s }: { summary: SectorSummary }) {
  const chip = CLASS_CHIP[s.sector_class] ?? CLASS_CHIP.GENERAL;
  const chg = s.avg_change_pct;
  const chgColor =
    chg == null ? "var(--text-muted)" : chg > 0 ? "var(--positive)" : chg < 0 ? "var(--negative)" : "var(--text-muted)";
  const rs = s.avg_rs_vs_dsex_pct;
  const good = s.tier_counts.excellent + s.tier_counts.good;

  return (
    <section className="soft-card overflow-hidden mb-6">
      <div
        className="h-1 w-full"
        style={{
          background: `linear-gradient(90deg, ${chip.color}, color-mix(in srgb, ${chip.color} 30%, transparent))`,
        }}
      />

      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{
              color: chip.color,
              background: `color-mix(in srgb, ${chip.color} 12%, var(--surface))`,
              border: `1px solid color-mix(in srgb, ${chip.color} 30%, var(--border))`,
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: chip.color }} />
            <T en={`Scored as ${chip.label}`} bn={`${chip.labelBn} হিসেবে স্কোর করা`} />
          </span>
          <span className="text-sm font-bold tabular-nums text-text-muted">
            <T
              en={`${s.company_count} companies · ${crore(s.total_mcap_mn)} market value`}
              bn={`${s.company_count}টি কোম্পানি · বাজার মূলধন ${croreBn(s.total_mcap_mn)}`}
            />
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <Stat
            label={<T en="Middle score" bn="মধ্যম স্কোর" />}
            value={<ScoreBadge score={s.median_score} size="sm" />}
            sub={<T en="the middle company" bn="মাঝের কোম্পানির" />}
            accent="var(--primary)"
          />
          <Stat
            label={<T en="Middle P/E" bn="মধ্যম পিই" />}
            value={s.median_pe != null ? s.median_pe.toFixed(1) : "—"}
            sub={
              s.median_pb != null ? (
                <T en={`P/B ${s.median_pb.toFixed(2)}`} bn={`পিবি ${s.median_pb.toFixed(2)}`} />
              ) : undefined
            }
          />
          <Stat
            label={<T en="Middle yield" bn="মধ্যম ইল্ড" />}
            value={s.median_yield_pct != null ? pct(s.median_yield_pct, 1) : "—"}
            sub={
              s.median_roe_pct != null ? (
                <T en={`ROE ${pct(s.median_roe_pct, 1)}`} bn={`আরওই ${pct(s.median_roe_pct, 1)}`} />
              ) : undefined
            }
            accent="var(--positive)"
          />
          <Stat
            label={<T en="Today" bn="আজ" />}
            value={chg != null ? `${chg > 0 ? "+" : ""}${pct(chg, 2)}` : "—"}
            sub={
              s.avg_return_7d_pct != null ? (
                <T
                  en={`${s.avg_return_7d_pct > 0 ? "+" : ""}${pct(s.avg_return_7d_pct, 1)} in 7 days`}
                  bn={`7 দিনে ${s.avg_return_7d_pct > 0 ? "+" : ""}${pct(s.avg_return_7d_pct, 1)}`}
                />
              ) : undefined
            }
            accent={chgColor}
          />
        </div>

        {/* Tier mix */}
        <div className="rounded-xl border border-border bg-surface-2 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-text-muted">
              <T en="Grade mix" bn="গ্রেডের ভাগ" />
            </span>
            <span className="text-xs font-bold tabular-nums text-text-muted">
              <T en={`${s.buy_signals} with a Buy signal`} bn={`${s.buy_signals}টিতে কেনার সংকেত`} />
            </span>
          </div>
          <TierBar counts={s.tier_counts} total={s.company_count} />
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {TIER_ORDER.filter((t) => s.tier_counts[t]).map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5 text-xs font-bold text-text-muted">
                <TierPill tier={t} />
                {s.tier_counts[t]}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface-2 p-3">
            <MoverLine label={<T en="Best today" bn="আজ সবচেয়ে বেড়েছে" />} brief={s.best_today} />
            <MoverLine label={<T en="Worst today" bn="আজ সবচেয়ে কমেছে" />} brief={s.worst_today} />
            {s.top_ranked && (
              <div className="flex items-center justify-between gap-2 text-sm font-semibold">
                <span className="text-text-muted">
                  <T en="Top ranked" bn="শীর্ষ র‍্যাঙ্ক" />
                </span>
                <span className="inline-flex items-center gap-2 tabular-nums">
                  <Link
                    href={`/stock/${s.top_ranked.trading_code}`}
                    className="font-extrabold text-text-main hover:text-primary"
                  >
                    {s.top_ranked.trading_code}
                  </Link>
                  {s.top_ranked.ltp != null && (
                    <span className="text-text-muted">{taka(s.top_ranked.ltp)}</span>
                  )}
                  <ScoreBadge score={s.top_ranked.score} size="sm" />
                </span>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-surface-2 p-3">
            <p className="text-sm font-medium leading-relaxed text-text-main">
              <T
                en={
                  (rs != null
                    ? `Over the last 7 days this sector moved ${Math.abs(rs).toFixed(1)}% ${rs >= 0 ? "ahead of" : "behind"} DSEX on average. `
                    : "") +
                  (good > 0
                    ? `${good} of its ${s.company_count} companies are graded Good or better.`
                    : "No company here is graded Good or better right now.")
                }
                bn={
                  (rs != null
                    ? `গত 7 দিনে এই সেক্টর গড়ে ডিএসইএক্সের চেয়ে ${Math.abs(rs).toFixed(1)}% ${rs >= 0 ? "এগিয়ে" : "পিছিয়ে"} ছিল। `
                    : "") +
                  (good > 0
                    ? `এর ${s.company_count}টি কোম্পানির মধ্যে ${good}টির গ্রেড ভালো বা তার ওপরে।`
                    : "এখন এখানে কোনো কোম্পানির গ্রেড ভালো বা তার ওপরে নেই।")
                }
              />
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
