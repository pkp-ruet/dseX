import { getDividendsUpcoming } from "@/lib/api";
import { formatDate, pct } from "@/lib/formatters";
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
  if (!picked.length) return [{ type: "text", text: COPY.dividends.none }];

  const blocks: MessageBlock[] = [{ type: "text", text: COPY.dividends.intro }];
  for (const d of picked) {
    const date = d.record_date ?? d.projected_date;
    const parts: string[] = [];
    if (d.dividend_pct != null) parts.push(`${pct(d.dividend_pct)} cash`);
    if (date) parts.push(`by ${formatDate(date)}`);
    const detail = parts.length ? ` — ${parts.join(", ")}` : "";
    blocks.push({
      type: "text",
      text: `• ${d.company_name ?? d.trading_code} (${d.trading_code})${detail}`,
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
