import Link from "next/link";
import Bn from "@/components/i18n/Bn";
import { formatDate, pct } from "@/lib/formatters";
import type { CorporateActionEvent } from "@/lib/api";

function dividendLabel(e: CorporateActionEvent) {
  const parts: string[] = [];
  if (e.cash_pct) parts.push(`${pct(e.cash_pct, e.cash_pct % 1 ? 2 : 0)} cash`);
  if (e.stock_pct) parts.push(`${pct(e.stock_pct, e.stock_pct % 1 ? 2 : 0)} bonus`);
  return parts.length ? parts.join(" + ") : "No dividend";
}

/** Announced AGM dates — where the dividend gets approved before it's paid. */
export default function AgmBoard({ events }: { events: CorporateActionEvent[] }) {
  if (events.length === 0) return null;

  return (
    <section className="mb-8" id="agms">
      <div className="section-rule-modern">
        <span className="section-rule-text">Upcoming AGMs</span>
      </div>

      <p className="mb-1 text-[0.88rem] font-semibold text-[var(--text)]">
        A final dividend is only a recommendation until shareholders approve it at the
        AGM. Payment follows after that, usually within 30 days.
      </p>
      <Bn className="mb-4 text-[0.9rem] font-medium leading-[1.85] text-[var(--text-muted)]">
        AGM-তে শেয়ারহোল্ডাররা অনুমোদন দিলেই চূড়ান্ত লভ্যাংশ পাওয়া যায় — এরপর সাধারণত 30 দিনের মধ্যে টাকা আসে।
      </Bn>

      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full min-w-[520px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
              <th className="px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.13em] text-[var(--text-muted)]">
                Stock
              </th>
              <th className="px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-[0.13em] text-[var(--text-muted)]">
                AGM date
              </th>
              <th className="px-3 py-2.5 text-right text-[11px] font-extrabold uppercase tracking-[0.13em] text-[var(--text-muted)]">
                Days
              </th>
              <th className="px-3 py-2.5 text-right text-[11px] font-extrabold uppercase tracking-[0.13em] text-[var(--text-muted)]">
                Dividend up for approval
              </th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr
                key={`${e.trading_code}-${e.agm_date}`}
                className="border-b border-[var(--border)] last:border-0"
              >
                <td className="px-3 py-2.5">
                  <Link
                    href={`/stock/${e.trading_code}`}
                    className="font-display text-[0.9rem] font-extrabold tracking-tight text-[var(--text)] hover:text-[var(--primary)]"
                  >
                    {e.trading_code}
                  </Link>
                  <div className="mt-0.5 max-w-[220px] truncate text-[0.72rem] font-semibold text-[var(--text-muted)]">
                    {e.company_name || "—"}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-[0.82rem] font-bold tabular-nums text-[var(--text)]">
                  {formatDate(e.agm_date)}
                </td>
                <td className="px-3 py-2.5 text-right text-[0.82rem] font-bold tabular-nums text-[var(--text-muted)]">
                  {e.agm_days_left === 0 ? "today" : e.agm_days_left}
                </td>
                <td
                  className="px-3 py-2.5 text-right text-[0.82rem] font-bold tabular-nums"
                  style={{ color: e.cash_pct ? "var(--positive)" : "var(--text-muted)" }}
                >
                  {dividendLabel(e)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
