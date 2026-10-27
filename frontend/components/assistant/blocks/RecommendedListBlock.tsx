"use client";

import RecoRow, { type RecoRowItem } from "@/components/reco/RecoRow";
import StarButton from "@/components/ui/StarButton";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import { COPY } from "@/lib/assistant/copy";
import type { RecommendedStock } from "@/lib/api";
import type { MessageBlock } from "@/lib/assistant/types";

/** A pick from the recommendation engine as a suggestion row. Chats saved
 *  before 2026-10-28 carry only `reasons`, so those fall back to it. */
function toRow(p: RecommendedStock): RecoRowItem {
  return {
    code: p.trading_code,
    name: p.company_name,
    price: p.ltp,
    change_pct: p.change_pct,
    tag_en: p.tag_en ?? "Top pick",
    tag_bn: p.tag_bn ?? "সেরা বাছাই",
    why_en: p.why_en ?? p.reasons[0] ?? "",
    why_bn: p.why_bn ?? p.reasons_bn?.[0] ?? p.reasons[0] ?? "",
    points: p.points,
    watch: p.watch,
    kind: p.kind,
    strong: p.strong,
  };
}

export default function RecommendedListBlock({
  block,
}: {
  block: Extract<MessageBlock, { type: "recommended-list" }>;
}) {
  const { lang } = useLang();
  return (
    <div className="mt-1 space-y-2">
      {block.relaxations.length > 0 && (
        <p className="text-xs text-text-muted">
          {/* The engine names the widened answers in English only, so Bengali mode gives the general line. */}
          <T
            en={`${COPY.suggest.relaxedPrefix} ${block.relaxations.join("; ")}.`}
            bn={COPY.suggest.relaxedBn}
          />
        </p>
      )}
      <ul className="soft-card divide-y divide-cell-rule overflow-hidden">
        {block.picks.map((p) => (
          <RecoRow
            key={p.trading_code}
            item={toRow(p)}
            rich
            lang={lang}
            action={<StarButton code={p.trading_code} size="sm" />}
          />
        ))}
      </ul>
    </div>
  );
}
