import Link from "next/link";
import type { MessageBlock, MetricTone } from "@/lib/assistant/types";
import { taka, pct } from "@/lib/formatters";

function toneColor(tone?: MetricTone): string {
  if (tone === "pos") return "var(--positive)";
  if (tone === "neg") return "var(--negative)";
  return "var(--text)";
}

/**
 * Compact stock list — reuses the market-intelligence `.intel-row` grid
 * (2fr/1fr/1fr/1fr) but with a free-form metric column, so it can show yield %,
 * growth %, gap %, a score, etc. Each row links to the stock page.
 */
export default function StockListBlock({
  block,
}: {
  block: Extract<MessageBlock, { type: "stock-list" }>;
}) {
  return (
    <div className="intel-signal-card mt-1">
      <div className="intel-signal-title">{block.title}</div>
      {block.subtitle && <div className="intel-signal-desc">{block.subtitle}</div>}

      <div className="intel-row intel-row-header">
        <span>Code</span>
        <span>LTP</span>
        <span>Chg%</span>
        <span style={{ textAlign: "right" }}>{block.metricLabel}</span>
      </div>

      {block.items.map((it) => {
        const chgPos = (it.change_pct ?? 0) >= 0;
        return (
          <Link
            key={it.trading_code}
            prefetch={false}
            href={`/stock/${it.trading_code}`}
            className="intel-row"
          >
            <span className="intel-code">{it.trading_code}</span>
            <span className="intel-ltp nums">{it.ltp != null ? taka(it.ltp) : "—"}</span>
            <span
              className="intel-change nums"
              style={{ color: it.change_pct == null ? "var(--text-muted)" : chgPos ? "var(--positive)" : "var(--negative)" }}
            >
              {it.change_pct != null ? `${chgPos ? "+" : ""}${pct(it.change_pct)}` : "—"}
            </span>
            <span
              className="intel-metric nums"
              style={{ color: toneColor(it.metricTone), textAlign: "right" }}
            >
              {it.metricValue}
            </span>
          </Link>
        );
      })}

      {block.seeAllHref && (
        <Link
          prefetch={false}
          href={block.seeAllHref}
          className="mt-2 inline-block text-[0.72rem] font-semibold text-[var(--primary)] hover:underline"
        >
          {block.seeAllLabel ?? "See all"} →
        </Link>
      )}
    </div>
  );
}
