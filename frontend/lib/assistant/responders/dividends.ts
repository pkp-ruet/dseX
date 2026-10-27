import { getDividendsUpcoming } from "@/lib/api";
import { formatDate, pct } from "@/lib/formatters";
import { bnDate } from "@/lib/bn";
import { COPY } from "../copy";
import type { Chip, MessageBlock } from "../types";

/** Upcoming dividend dates (the calendar) — distinct from the high-dividend screen. */
export async function dividendsResponder(): Promise<MessageBlock[]> {
  const res = await getDividendsUpcoming();
  const all = [...(res.upcoming_record_dates ?? []), ...(res.upcoming_declarations ?? [])];

  const seen = new Set<string>();
  const picked: typeof all = [];
  for (const it of all) {
    if (seen.has(it.trading_code)) continue;
    seen.add(it.trading_code);
    picked.push(it);
    if (picked.length >= 6) break;
  }
  if (!picked.length) return [{ type: "text", text: COPY.dividends.none, bn: COPY.dividends.noneBn }];

  const blocks: MessageBlock[] = [{ type: "text", text: COPY.dividends.intro, bn: COPY.dividends.introBn }];
  for (const d of picked) {
    const date = d.record_date ?? d.projected_date;
    const cash = d.dividend_pct != null ? pct(d.dividend_pct) : null;
    const name = d.company_name ?? d.trading_code;
    blocks.push({
      type: "text",
      text: `• ${COPY.dividends.line(name, d.trading_code, cash, date ? formatDate(date) : null)}`,
      bn: `• ${COPY.dividends.lineBn(name, d.trading_code, cash, date ? bnDate(date) : null)}`,
    });
  }

  // Tappable codes to jump into an analysis.
  const chips: Chip[] = picked.slice(0, 5).map((d) => ({
    label: d.trading_code,
    action: { intentId: "stock_detail", entities: { code: d.trading_code } },
  }));
  blocks.push({ type: "chips", chips, layout: "scroll" });
  return blocks;
}
