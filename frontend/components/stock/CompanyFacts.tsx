import type { CompanyDetail } from "@/lib/api";
import { crore, croreShares, money } from "@/lib/formatters";
import Card from "@/components/ui/Card";
import SectionTitle from "@/components/stock/SectionTitle";

interface Props {
  detail: CompanyDetail;
}

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

interface Fact {
  label: string;
  value: string;
  desc: string;
  tone?: string;
}

/**
 * The raw company figures in one compact strip: size (market cap, capital,
 * shares), balance-sheet basics (reserve, loan), listing facts (face value,
 * lot, listed since) and today's tape (range, turnover, trades). Replaces the
 * old Key Numbers block — P/E and yield now live only in the valuation tiles,
 * so nothing here is printed twice on the page.
 */
export default function CompanyFacts({ detail }: Props) {
  const { profile, latest_price, financials } = detail;

  const sortedFins = [...financials].sort(
    (a, b) => Number((b as Record<string, unknown>).year ?? 0) - Number((a as Record<string, unknown>).year ?? 0),
  );
  const latestFin = sortedFins[0] as Record<string, unknown> | undefined;
  const eps = toNum(latestFin?.eps) ?? toNum(latestFin?.eps_cont_basic) ?? toNum(latestFin?.eps_basic);
  const epsYear = latestFin?.year != null ? String(latestFin.year) : null;

  const ltp = toNum(latest_price.ltp);
  const shares = toNum(profile.total_shares);
  const mcapMn = ltp != null && shares != null && shares > 0 ? (ltp * shares) / 1e6 : null;
  const reserve = toNum(profile.reserve_surplus_mn);
  const loan = toNum(profile.total_loan_mn);
  const paidUp = toNum(profile.paid_up_capital_mn);
  const face = toNum(profile.face_value);
  const lot = toNum(profile.market_lot);
  const listed = toNum(profile.listing_year);

  const dayLow = toNum(latest_price.low);
  const dayHigh = toNum(latest_price.high);
  const ycp = toNum(latest_price.ycp);
  const turnoverMn = toNum(latest_price.value_mn);
  const trades = toNum(latest_price.trade_count);
  const volume = toNum(latest_price.volume);

  const facts: Fact[] = [];
  const push = (f: Fact | null) => { if (f) facts.push(f); };

  push(mcapMn != null ? { label: "Market cap", value: crore(mcapMn), desc: "What the whole company is worth at today's price" } : null);
  push(eps != null ? {
    label: "EPS",
    value: `৳${eps.toFixed(2)}`,
    desc: epsYear ? `Profit per share, ${epsYear}` : "Profit per share, latest year",
    tone: eps < 0 ? "var(--negative)" : undefined,
  } : null);
  push(paidUp != null ? { label: "Paid-up capital", value: crore(paidUp), desc: "Money shareholders put in" } : null);
  push(reserve != null ? { label: "Reserve & surplus", value: crore(reserve), desc: "Accumulated savings" } : null);
  push(loan != null ? {
    label: "Total loan",
    value: crore(loan),
    desc: "Debt the company carries",
    tone: reserve != null && reserve > 0 && loan > 2 * reserve ? "var(--watch)" : undefined,
  } : null);
  push(shares != null && shares > 0 ? { label: "Shares", value: croreShares(shares), desc: "Total shares listed" } : null);
  push(face != null ? { label: "Face value", value: `৳${face % 1 === 0 ? face.toFixed(0) : face.toFixed(2)}`, desc: "Dividends are a % of this" } : null);
  push(lot != null && lot > 0 ? { label: "Market lot", value: lot.toLocaleString("en-US"), desc: "Minimum shares per trade" } : null);
  push(listed != null && listed > 1900 ? { label: "Listed since", value: String(listed), desc: `${new Date().getFullYear() - listed} years on the DSE` } : null);
  push(turnoverMn != null && turnoverMn > 0 ? { label: "Turnover today", value: crore(turnoverMn), desc: "Value of shares traded" } : null);
  push(trades != null && trades > 0 ? { label: "Trades today", value: trades.toLocaleString("en-US"), desc: volume != null ? `${croreShares(volume)} shares changed hands` : "Number of trades" } : null);

  const hasRange = dayLow != null && dayHigh != null && dayHigh > dayLow && ltp != null;
  const rangePos = hasRange ? Math.max(0, Math.min(1, (ltp - dayLow) / (dayHigh - dayLow))) : null;
  const ycpPos = hasRange && ycp != null ? Math.max(0, Math.min(1, (ycp - dayLow) / (dayHigh - dayLow))) : null;

  if (facts.length === 0 && !hasRange) return null;

  return (
    <section className="mb-8">
      <SectionTitle
        title="Company Facts"
        sub={<>The plain figures — how big it is, what it owes, and how it traded today.</>}
        bn="কোম্পানির মূল তথ্য এক নজরে — আকার, ঋণ, আর আজকের লেনদেন।"
      />

      <Card padding="none" className="rounded-2xl p-4 sm:p-5">
        {hasRange && (
          <div className="mb-5">
            <div
              className="flex items-center justify-between gap-3 text-xs font-medium mb-2 tabular-nums nums"
              style={{ color: "var(--text-muted)" }}
            >
              <span>Low {money(dayLow)}</span>
              <span className="font-bold" style={{ color: "var(--text)" }}>Today&apos;s range</span>
              <span>High {money(dayHigh)}</span>
            </div>
            <div
              className="relative h-2 rounded-full"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
            >
              {ycpPos != null && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                  /* taller than the 18px dot+ring and layered above it, so on an unchanged
                     close (ltp === ycp, common on the DSE) the tick still shows through */
                  style={{ left: `${ycpPos * 100}%`, width: 2, height: 22, background: "var(--text-muted)", borderRadius: 1, zIndex: 1 }}
                  title={`Yesterday's close ${money(ycp)}`}
                  aria-hidden="true"
                />
              )}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full"
                style={{
                  left: `${(rangePos as number) * 100}%`,
                  width: 12,
                  height: 12,
                  background: "var(--primary)",
                  boxShadow: "0 0 0 3px var(--surface)",
                }}
                aria-hidden="true"
              />
            </div>
            <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
              Dot = today&apos;s close{ycp != null ? ` · thin bar = yesterday's close ${money(ycp)}` : ""}.
            </p>
          </div>
        )}

        {facts.length > 0 && (
          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-4">
            {facts.map((f) => (
              <div key={f.label} className="min-w-0">
                <dt className="text-xs font-bold uppercase tracking-[0.12em] mb-1" style={{ color: "var(--text-muted)" }}>
                  {f.label}
                </dt>
                <dd className="text-lg font-bold tabular-nums nums leading-none truncate" style={{ color: f.tone ?? "var(--text)" }}>
                  {f.value}
                </dd>
                <dd className="text-xs mt-1 leading-snug" style={{ color: "var(--text-muted)" }}>
                  {f.desc}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Card>
    </section>
  );
}
