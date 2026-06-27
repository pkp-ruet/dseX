import Link from "next/link";
import type { MessageBlock, MarketSummaryView } from "@/lib/assistant/types";
import { signed } from "@/lib/formatters";

const COND: Record<MarketSummaryView["condition"], { label: string; color: string }> = {
  rising: { label: "Rising", color: "var(--positive)" },
  falling: { label: "Falling", color: "var(--negative)" },
  sideways: { label: "Sideways", color: "var(--warm-ink)" },
  unknown: { label: "Latest", color: "var(--text-muted)" },
};

export default function MarketSummaryBlock({
  block,
}: {
  block: Extract<MessageBlock, { type: "market-summary" }>;
}) {
  const v = block.view;
  const meta = COND[v.condition];
  const chgPos = (v.dsexChangePct ?? 0) >= 0;

  return (
    <div className="soft-card p-3.5 mt-1">
      {v.closedNote && (
        <p className="text-[0.78rem] text-[var(--text-muted)] mb-2">{v.closedNote}</p>
      )}

      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[0.64rem] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            DSEX Index
          </div>
          <div className="text-xl font-extrabold nums text-[var(--text)]">
            {v.dsex != null ? v.dsex.toFixed(2) : "—"}
          </div>
        </div>
        <div className="text-right">
          <span
            className="inline-block rounded-full px-2 py-0.5 text-[0.64rem] font-bold"
            style={{ background: `color-mix(in srgb, ${meta.color} 14%, transparent)`, color: meta.color }}
          >
            {meta.label}
          </span>
          {v.dsexChangePct != null && (
            <div
              className="text-[0.85rem] font-bold nums mt-1"
              style={{ color: chgPos ? "var(--positive)" : "var(--negative)" }}
            >
              {signed(v.dsexChangePct, 2)}%
            </div>
          )}
        </div>
      </div>

      <p className="text-[0.85rem] text-[var(--text)] mt-2.5">{v.line}</p>

      <div className="flex gap-3 mt-2 text-[0.72rem] text-[var(--text-muted)] nums">
        <span>🟢 {v.up ?? "—"} up</span>
        <span>🔴 {v.down ?? "—"} down</span>
        <span>⚪ {v.neutral ?? "—"} flat</span>
      </div>

      <Link
        prefetch={false}
        href="/dse-today"
        className="mt-2.5 inline-block text-[0.72rem] font-semibold text-[var(--primary)] hover:underline"
      >
        Full market today →
      </Link>
    </div>
  );
}
