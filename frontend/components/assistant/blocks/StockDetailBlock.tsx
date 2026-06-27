import Link from "next/link";
import ScoreBadge from "@/components/ui/ScoreBadge";
import TierPill from "@/components/ui/TierPill";
import { taka, signed } from "@/lib/formatters";
import { COPY } from "@/lib/assistant/copy";
import type { MessageBlock } from "@/lib/assistant/types";

export default function StockDetailBlock({
  block,
}: {
  block: Extract<MessageBlock, { type: "stock-detail" }>;
}) {
  const v = block.view;
  const chgPos = (v.changePct ?? 0) >= 0;
  const hasFlags = v.green.length > 0 || v.red.length > 0;

  return (
    <div className="soft-card p-3.5 mt-1">
      <div className="flex items-start gap-3">
        <ScoreBadge score={v.score} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-base font-extrabold text-[var(--text)]">{v.code}</span>
            <TierPill score={v.score} />
          </div>
          {v.name && <div className="text-[0.74rem] text-[var(--text-muted)] truncate">{v.name}</div>}
          <div className="text-[0.82rem] font-bold nums mt-0.5 text-[var(--text)]">
            {v.ltp != null ? taka(v.ltp) : "—"}
            {v.changePct != null && (
              <span
                className="ml-1.5 text-[0.74rem]"
                style={{ color: chgPos ? "var(--positive)" : "var(--negative)" }}
              >
                {signed(v.changePct, 2)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {v.tagline && <p className="text-[0.85rem] text-[var(--text)] mt-2.5">{v.tagline}</p>}

      {v.facts.length > 0 && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2.5">
          {v.facts.map((f, i) => (
            <div key={i} className="flex justify-between gap-2 text-[0.76rem]">
              <span className="text-[var(--text-muted)]">{f.label}</span>
              <span className="font-semibold nums text-[var(--text)]">{f.value}</span>
            </div>
          ))}
        </div>
      )}

      {hasFlags && (
        <ul className="mt-2.5 space-y-1">
          {v.green.map((g, i) => (
            <li key={`g${i}`} className="flex gap-1.5 text-[0.76rem] text-[var(--text)]">
              <span style={{ color: "var(--positive)" }}>✓</span>
              <span>{g}</span>
            </li>
          ))}
          {v.red.map((r, i) => (
            <li key={`r${i}`} className="flex gap-1.5 text-[0.76rem] text-[var(--text)]">
              <span style={{ color: "var(--negative)" }}>!</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}

      {v.stale && (
        <p className="mt-2 text-[0.68rem] text-[var(--warm-ink)]">Note: based on slightly older data.</p>
      )}

      <Link
        prefetch={false}
        href={`/stock/${v.code}`}
        className="mt-3 inline-flex items-center min-h-[34px] px-3.5 rounded-lg text-[0.74rem] font-bold text-white"
        style={{ background: "var(--primary)" }}
      >
        {COPY.stock.fullAnalysis}
      </Link>
    </div>
  );
}
