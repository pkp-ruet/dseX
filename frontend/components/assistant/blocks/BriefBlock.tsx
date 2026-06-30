import Link from "next/link";
import type { MessageBlock, MetricTone } from "@/lib/assistant/types";

function toneColor(tone?: MetricTone): string {
  if (tone === "pos") return "var(--positive)";
  if (tone === "neg") return "var(--negative)";
  return "var(--text)";
}

/**
 * The daily-brief card: a compact list of personalized "what's new" rows
 * (price-target hits, portfolio move, big movers, dividends, news). Each row
 * with an href is tappable and deep-links to the stock.
 */
export default function BriefBlock({
  block,
}: {
  block: Extract<MessageBlock, { type: "brief" }>;
}) {
  return (
    <div className="soft-card mt-1 divide-y divide-[var(--border)] overflow-hidden">
      {block.rows.map((r, i) => {
        const inner = (
          <div className="flex items-start gap-2.5 px-3 py-2">
            <span aria-hidden className="text-[0.95rem] leading-5">
              {r.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[0.82rem] font-semibold leading-snug" style={{ color: toneColor(r.tone) }}>
                {r.title}
              </div>
              {r.detail && (
                <div className="text-[0.72rem] text-[var(--text-muted)] truncate">{r.detail}</div>
              )}
            </div>
          </div>
        );
        return r.href ? (
          <Link key={i} prefetch={false} href={r.href} className="block transition hover:bg-[var(--surface-2)]">
            {inner}
          </Link>
        ) : (
          <div key={i}>{inner}</div>
        );
      })}
    </div>
  );
}
