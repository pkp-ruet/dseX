import Link from "next/link";
import Bn from "@/components/i18n/Bn";
import TierPill from "@/components/ui/TierPill";
import { formatDate, pct, taka } from "@/lib/formatters";
import type { CorporateActionEvent } from "@/lib/api";

/**
 * Biggest cash dividends declared in the last 12 months, ranked by what the
 * dividend is worth at today's price.
 *
 * Deliberately shows the tier next to the yield: a high yield on a Weak company
 * is usually a falling price, not generosity. No advice is drawn here — the
 * ranking is arithmetic, and the tier is context.
 */
export default function TopCashDividends({ events }: { events: CorporateActionEvent[] }) {
  if (events.length === 0) return null;

  return (
    <section className="mb-8" id="top-payers">
      <div className="section-rule-modern">
        <span className="section-rule-text">Biggest Cash Dividends — Last 12 Months</span>
      </div>

      <p className="mb-1 text-[0.88rem] font-semibold text-[var(--text)]">
        Declared cash, measured against today&apos;s price. A very high yield often means
        the price fell — check the strength rating beside it before chasing the number.
      </p>
      <Bn className="mb-4 text-[0.9rem] font-medium leading-[1.85] text-[var(--text-muted)]">
        অনেক বেশি ইল্ড মানে প্রায়ই দাম পড়ে গেছে — পাশের রেটিং দেখে কোম্পানির শক্তি যাচাই করুন।
      </Bn>

      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full min-w-[600px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
              <th className="px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.13em] text-[var(--text-muted)]">
                Stock
              </th>
              <th className="px-3 py-2.5 text-right text-[11px] font-extrabold uppercase tracking-[0.13em] text-[var(--text-muted)]">
                Price
              </th>
              <th className="px-3 py-2.5 text-right text-[11px] font-extrabold uppercase tracking-[0.13em] text-[var(--text-muted)]">
                Cash
              </th>
              <th className="px-3 py-2.5 text-right text-[11px] font-extrabold uppercase tracking-[0.13em] text-[var(--text-muted)]">
                Per share
              </th>
              <th className="px-3 py-2.5 text-right text-[11px] font-extrabold uppercase tracking-[0.13em] text-[var(--text-muted)]">
                Yield
              </th>
              <th className="px-3 py-2.5 text-right text-[11px] font-extrabold uppercase tracking-[0.13em] text-[var(--text-muted)]">
                Declared
              </th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr
                key={`${e.trading_code}-${e.declaration_date}`}
                className="border-b border-[var(--border)] last:border-0"
              >
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/stock/${e.trading_code}`}
                      className="font-display text-[0.9rem] font-extrabold tracking-tight text-[var(--text)] hover:text-[var(--primary)]"
                    >
                      {e.trading_code}
                    </Link>
                    {e.tier && <TierPill tier={e.tier} />}
                  </div>
                  <div className="mt-0.5 max-w-[200px] truncate text-[0.72rem] font-semibold text-[var(--text-muted)]">
                    {e.company_name || "—"}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right text-[0.82rem] font-bold tabular-nums text-[var(--text)]">
                  {e.ltp != null ? taka(e.ltp) : "—"}
                </td>
                <td className="px-3 py-2.5 text-right text-[0.82rem] font-bold tabular-nums text-[var(--text)]">
                  {e.cash_pct ? pct(e.cash_pct, e.cash_pct % 1 ? 2 : 0) : "—"}
                </td>
                <td className="px-3 py-2.5 text-right text-[0.82rem] font-bold tabular-nums text-[var(--text)]">
                  {e.cash_per_share != null ? taka(e.cash_per_share) : "—"}
                </td>
                <td
                  className="px-3 py-2.5 text-right text-[0.88rem] font-extrabold tabular-nums"
                  style={{ color: "var(--positive)" }}
                >
                  {e.yield_pct != null ? pct(e.yield_pct, 2) : "—"}
                </td>
                <td className="px-3 py-2.5 text-right text-[0.78rem] font-semibold tabular-nums text-[var(--text-muted)]">
                  {formatDate(e.declaration_date)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2.5 text-[0.72rem] font-semibold text-[var(--text-muted)]">
        Yields are gross, before the 10% dividend tax (15% without a TIN) and any AIT
        deducted at source. Bonus shares are excluded — they aren&apos;t cash.
      </p>
    </section>
  );
}
