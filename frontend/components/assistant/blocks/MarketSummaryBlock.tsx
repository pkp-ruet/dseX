import Link from "next/link";
import { T } from "@/components/i18n/T";
import { COPY } from "@/lib/assistant/copy";
import type { MessageBlock, MarketSummaryView } from "@/lib/assistant/types";
import { signed } from "@/lib/formatters";

const COND_COLOR: Record<MarketSummaryView["condition"], string> = {
  rising: "var(--positive)",
  falling: "var(--negative)",
  sideways: "var(--warm-ink)",
  unknown: "var(--text-muted)",
};

const n = (v: number | null) => (v ?? "—").toString();

export default function MarketSummaryBlock({
  block,
}: {
  block: Extract<MessageBlock, { type: "market-summary" }>;
}) {
  const v = block.view;
  const color = COND_COLOR[v.condition];
  const word = COPY.marketCondition[v.condition];
  const chgPos = (v.dsexChangePct ?? 0) >= 0;

  return (
    <div className="soft-card p-3.5 mt-1">
      {v.closedNote && (
        <p className="text-xs text-text-muted mb-2">
          <T en={v.closedNote} bn={v.closedNoteBn ?? v.closedNote} />
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-text-muted">
            <T en={COPY.marketIndex.text} bn={COPY.marketIndex.bn} />
          </div>
          <div className="text-xl font-extrabold nums text-text-main">
            {v.dsex != null ? v.dsex.toFixed(2) : "—"}
          </div>
        </div>
        <div className="text-right">
          <span
            className="inline-block rounded-full px-2 py-0.5 text-xs font-bold"
            style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
          >
            <T en={word.text} bn={word.bn} />
          </span>
          {v.dsexChangePct != null && (
            <div
              className="text-sm font-bold nums mt-1"
              style={{ color: chgPos ? "var(--positive)" : "var(--negative)" }}
            >
              {signed(v.dsexChangePct, 2)}%
            </div>
          )}
        </div>
      </div>

      <p className="text-sm text-text-main mt-2.5">
        <T en={v.line} bn={v.lineBn ?? v.line} />
      </p>

      <p className="mt-2 text-xs text-text-muted nums">
        <T
          en={
            <>
              <span className="text-positive">{n(v.up)} up</span> ·{" "}
              <span className="text-negative">{n(v.down)} down</span> · {n(v.neutral)} unchanged
            </>
          }
          bn={
            <>
              <span className="text-positive">{n(v.up)}টি বেড়েছে</span> ·{" "}
              <span className="text-negative">{n(v.down)}টি কমেছে</span> · {n(v.neutral)}টি অপরিবর্তিত
            </>
          }
        />
      </p>

      <Link
        prefetch={false}
        href="/dse-today"
        className="mt-2.5 inline-block text-xs font-semibold text-primary hover:underline"
      >
        <T en={COPY.marketFull.text} bn={COPY.marketFull.bn} />
      </Link>
    </div>
  );
}
