import Link from "next/link";
import { T } from "@/components/i18n/T";
import type { MessageBlock, MetricTone } from "@/lib/assistant/types";

function toneColor(tone?: MetricTone): string {
  if (tone === "pos") return "var(--positive)";
  if (tone === "neg") return "var(--negative)";
  return "var(--text)";
}

function dotClass(tone?: MetricTone): string {
  if (tone === "pos") return "bg-positive";
  if (tone === "neg") return "bg-negative";
  return "bg-text-muted";
}

/**
 * The daily-brief card: a compact list of personalized "what's new" rows
 * (price-target hits, portfolio move, big movers, dividends, news). Each row
 * with an href is tappable and deep-links to the share. A small tone dot
 * replaces the old emoji.
 */
export default function BriefBlock({
  block,
}: {
  block: Extract<MessageBlock, { type: "brief" }>;
}) {
  return (
    <div className="soft-card mt-1 divide-y divide-border overflow-hidden">
      {block.rows.map((r, i) => {
        const inner = (
          <div className="flex items-start gap-2.5 px-3 py-2">
            <span aria-hidden className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotClass(r.tone)}`} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold leading-snug" style={{ color: toneColor(r.tone) }}>
                <T en={r.title} bn={r.titleBn ?? r.title} />
              </div>
              {r.detail && (
                <div className="text-xs text-text-muted truncate">
                  <T en={r.detail} bn={r.detailBn ?? r.detail} />
                </div>
              )}
            </div>
          </div>
        );
        return r.href ? (
          <Link key={i} prefetch={false} href={r.href} className="block transition hover:bg-surface-2">
            {inner}
          </Link>
        ) : (
          <div key={i}>{inner}</div>
        );
      })}
    </div>
  );
}
