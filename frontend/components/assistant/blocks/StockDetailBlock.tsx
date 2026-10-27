import Link from "next/link";
import ScoreBadge from "@/components/ui/ScoreBadge";
import TierPill from "@/components/ui/TierPill";
import { T } from "@/components/i18n/T";
import { taka, signed } from "@/lib/formatters";
import { COPY } from "@/lib/assistant/copy";
import type { MessageBlock } from "@/lib/assistant/types";

/** Flags in transcripts saved before 2026-10-28 were plain English strings. */
const pair = (f: { en: string; bn: string } | string) => (typeof f === "string" ? { en: f, bn: f } : f);

export default function StockDetailBlock({
  block,
}: {
  block: Extract<MessageBlock, { type: "stock-detail" }>;
}) {
  const v = block.view;
  const chgPos = (v.changePct ?? 0) >= 0;
  const green = (v.green ?? []).map(pair);
  const red = (v.red ?? []).map(pair);
  const hasFlags = green.length > 0 || red.length > 0;

  return (
    <div className="soft-card p-3.5 mt-1">
      <div className="flex items-start gap-3">
        <ScoreBadge score={v.score} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-extrabold text-text-main">{v.code}</span>
            <TierPill score={v.score} />
          </div>
          {v.name && <div className="text-xs text-text-muted truncate">{v.name}</div>}
          <div className="text-sm font-bold nums mt-0.5 text-text-main">
            {v.ltp != null ? taka(v.ltp) : "—"}
            {v.changePct != null && (
              <span
                className="ml-1.5 text-xs"
                style={{ color: chgPos ? "var(--positive)" : "var(--negative)" }}
              >
                {signed(v.changePct, 2)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {v.tagline && (
        <p className="text-sm text-text-main mt-2.5">
          <T en={v.tagline} bn={v.taglineBn || v.tagline} />
        </p>
      )}

      {v.facts.length > 0 && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2.5">
          {v.facts.map((f, i) => (
            <div key={i} className="flex justify-between gap-2 text-xs">
              <span className="text-text-muted">
                <T en={f.label} bn={f.labelBn ?? f.label} />
              </span>
              <span className="font-semibold nums text-text-main">{f.value}</span>
            </div>
          ))}
        </div>
      )}

      {hasFlags && (
        <ul className="mt-2.5 space-y-1">
          {green.map((g, i) => (
            <li key={`g${i}`} className="flex gap-1.5 text-xs text-text-main">
              <span className="text-positive" aria-hidden>✓</span>
              <span>
                <T en={g.en} bn={g.bn} />
              </span>
            </li>
          ))}
          {red.map((r, i) => (
            <li key={`r${i}`} className="flex gap-1.5 text-xs text-text-main">
              <span className="text-negative" aria-hidden>!</span>
              <span>
                <T en={r.en} bn={r.bn} />
              </span>
            </li>
          ))}
        </ul>
      )}

      {v.stale && (
        <p className="mt-2 text-xs text-warm-ink">
          <T en={COPY.stock.stale} bn={COPY.stock.staleBn} />
        </p>
      )}

      <Link prefetch={false} href={`/stock/${v.code}`} className="btn-primary btn-sm mt-3">
        <T en={COPY.stock.fullAnalysis} bn={COPY.stock.fullAnalysisBn} />
      </Link>
    </div>
  );
}
