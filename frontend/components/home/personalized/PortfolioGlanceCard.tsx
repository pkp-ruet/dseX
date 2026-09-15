import Link from "next/link";
import type { PortfolioHolding, ScoreItem, CorporateActionEvent } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { analyzePortfolio, type ComputedRow } from "@/lib/portfolio-analysis";
import { bdGroup } from "@/lib/formatters";
import { sectorBn } from "@/lib/bn";
import { t } from "@/lib/home-copy";
import DashHeader from "@/components/home/personalized/DashHeader";
import { IconBulb, IconCheck, IconCoin, IconTarget } from "@/components/home/personalized/DashIcons";

const CASH_WINDOW_DAYS = 31;
const SPREAD_COLORS = ["var(--primary)", "var(--positive)", "var(--watch)", "var(--accent)", "var(--text-muted)"];

function compute(holding: PortfolioHolding, priceMap: Map<string, ScoreItem>): ComputedRow {
  const item = priceMap.get(holding.trading_code.toUpperCase());
  const ltp = item?.ltp ?? null;
  const cost_basis = holding.qty * holding.buy_price;
  const current_value = ltp != null ? holding.qty * ltp : null;
  const pnl = current_value != null ? current_value - cost_basis : null;
  const pnl_pct = pnl != null && cost_basis > 0 ? (pnl / cost_basis) * 100 : null;
  return { holding, ltp, company_name: item?.company_name ?? null, cost_basis, current_value, pnl, pnl_pct };
}

/**
 * The portfolio page's most useful content, inline: one thing going well, one
 * to watch, one to consider (from `analyzePortfolio`), the cash due to the
 * reader in the next month, and where the money sits by sector.
 */
export default function PortfolioGlanceCard({
  holdings,
  priceMap,
  dividendCash,
  lang = "en",
}: {
  holdings: PortfolioHolding[];
  priceMap: Map<string, ScoreItem>;
  /** Calendar record-date rows for the user's codes (cash per share known). */
  dividendCash: CorporateActionEvent[];
  lang?: Lang;
}) {
  const bn = lang === "bn";
  if (holdings.length === 0) return null;
  const rows = holdings.map((h) => compute(h, priceMap));
  const a = analyzePortfolio(rows, priceMap, lang);

  const bullets = [
    { key: "good", label: t(lang, "goodLabel"), text: a.good[0], color: "var(--positive)", icon: <IconCheck size={14} /> },
    { key: "bad", label: t(lang, "badLabel"), text: a.bad[0], color: "var(--negative)", icon: <IconTarget size={14} /> },
    { key: "consider", label: t(lang, "considerLabel"), text: a.consider[0], color: "var(--primary)", icon: <IconBulb size={14} /> },
  ].filter((b) => !!b.text);

  // Cash due inside the next month: qty × cash per share, one row per code.
  const qty = new Map(holdings.map((h) => [h.trading_code.toUpperCase(), h.qty] as const));
  const seen = new Set<string>();
  let cash = 0;
  let payers = 0;
  for (const e of dividendCash) {
    const code = e.trading_code.toUpperCase();
    const q = qty.get(code);
    if (q == null || seen.has(code)) continue;
    if (e.record_days_left == null || e.record_days_left < 0 || e.record_days_left > CASH_WINDOW_DAYS) continue;
    if (e.cash_per_share == null || e.cash_per_share <= 0) continue;
    seen.add(code);
    cash += q * e.cash_per_share;
    payers += 1;
  }

  const spread = [...a.sectorSpread].sort((x, y) => y.weightPct - x.weightPct);
  const top = spread.slice(0, 4);
  const rest = spread.slice(4).reduce((acc, s) => acc + s.weightPct, 0);
  const segments = [...top.map((s) => ({ name: s.name, pct: s.weightPct })), ...(rest > 0 ? [{ name: t(lang, "others"), pct: rest }] : [])];

  return (
    <section className={`soft-card overflow-hidden ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
      <DashHeader title={t(lang, "glanceTitle")} href="/portfolio" linkLabel={t(lang, "fullAnalysis")} />

      {bullets.length > 0 && (
        <ul className="divide-y divide-[var(--cell-rule)]">
          {bullets.map((b) => (
            <li key={b.key} className="flex items-start gap-3 px-4 py-2.5 sm:px-5">
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ color: b.color, background: `color-mix(in srgb, ${b.color} 12%, transparent)` }} aria-hidden>
                {b.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.68rem] font-extrabold uppercase tracking-[0.08em]" style={{ color: b.color }}>{b.label}</span>
                <span className="block text-[0.84rem] leading-snug text-[var(--text)]">{b.text}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 gap-3 border-t border-[var(--border)] px-4 py-3 sm:grid-cols-2 sm:px-5">
        <div className="flex items-center gap-3 rounded-xl bg-[var(--surface-2)] px-3 py-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ color: "var(--watch)", background: "color-mix(in srgb, var(--watch) 16%, transparent)" }} aria-hidden>
            <IconCoin size={18} />
          </span>
          <span className="min-w-0">
            <span className="block text-[0.68rem] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">{t(lang, "cashComing")}</span>
            {cash > 0 ? (
              <>
                <span className="block text-[1.05rem] font-extrabold tabular-nums nums leading-tight text-[var(--text)]">৳{bdGroup(Math.round(cash))}</span>
                <span className="block text-[0.72rem] text-[var(--text-muted)]">{payers === 1 ? t(lang, "cashComingOne") : t(lang, "cashComingSub", { n: payers })}</span>
              </>
            ) : (
              <span className="block text-[0.8rem] leading-snug text-[var(--text-muted)]">{t(lang, "noCashSoon")}</span>
            )}
          </span>
        </div>

        {segments.length > 0 && (
          <div className="min-w-0">
            <span className="block text-[0.68rem] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">{t(lang, "spread")}</span>
            <div className="mt-1.5 flex h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]" aria-hidden>
              {segments.map((s, i) => (
                <span key={s.name} className="h-full" style={{ width: `${Math.max(2, s.pct)}%`, background: SPREAD_COLORS[i % SPREAD_COLORS.length] }} />
              ))}
            </div>
            <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
              {segments.slice(0, 3).map((s, i) => (
                <li key={s.name} className="flex items-center gap-1 text-[0.72rem] font-semibold text-[var(--text-muted)]">
                  <span className="h-2 w-2 rounded-full" style={{ background: SPREAD_COLORS[i % SPREAD_COLORS.length] }} aria-hidden />
                  <span className="truncate">{bn ? sectorBn(s.name) : s.name}</span>
                  <span className="tabular-nums nums text-[var(--text)]">{Math.round(s.pct)}%</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
