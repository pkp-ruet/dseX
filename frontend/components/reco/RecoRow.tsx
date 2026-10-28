"use client";

import type { ReactNode } from "react";
import type { BiText } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { t } from "@/lib/home-copy";
import StockRow, { StockPill, StockRank } from "@/components/ui/StockRow";
import { IconAlert } from "@/components/ui/icons";

/** What a suggestion row needs — a `ForYouItem` / `BuyNextPick` fits as is. */
export interface RecoRowItem {
  code: string;
  name: string | null;
  price: number | null;
  change_pct: number | null;
  tag_en: string;
  tag_bn: string;
  why_en: string;
  why_bn: string;
  points?: BiText[];
  watch?: BiText | null;
  kind?: string | null;
  strong?: boolean;
  new?: boolean;
}

/**
 * THE suggestion row of the recommendation engine — the dashboard's "Picked
 * for you", TopStock AI's picks. Company name first (ticker small), the kind
 * word as a small tag, the one plain reason in the reader's language, price
 * and today's move on the right.
 *
 * `rich` (the open picks) gives the reason its own line at reading size, then
 * the number lines and one honest watch-out; compact rows keep tag + reason
 * on one clamped line. `rank` puts the pick's place in a numbered chip.
 *
 * Follows the dashboard rule for ideas: a name, a reason, a kind word. No
 * "% match", no tier pill, no signal chip — every pick is a Buy already.
 * `masked` = a free reader's preview of a locked pick (premium/RowLock): the
 * kind word and the reason shown, the company and its price hidden.
 */
export default function RecoRow({
  item,
  lang = "en",
  rich = false,
  rank,
  mark,
  action,
  as = "li",
  masked = false,
}: {
  item: RecoRowItem;
  lang?: Lang;
  rich?: boolean;
  /** 1-based place in the list (numbered chip; the first three filled). */
  rank?: number;
  /** H / ★ owner tag beside the code. */
  mark?: ReactNode;
  /** Outside the row's link (a StarButton). */
  action?: ReactNode;
  as?: "li" | "div";
  masked?: boolean;
}) {
  const bn = lang === "bn";
  const L = (p: BiText) => (bn ? p.bn : p.en);
  // A masked pick that is the reader's own stock would name itself in its
  // reason ("You own X …"): keep only the kind word there.
  const ownPick = item.kind === "add_more" || item.kind === "watched";
  const why = masked && ownPick ? "" : bn ? item.why_bn : item.why_en;
  // Colour means something: clay = tied to the reader's own stocks, green = a
  // strong Buy, grey for the rest.
  const tone = item.kind && item.kind !== "top" ? "primary" : item.strong ? "positive" : "muted";
  const tag = <StockPill tone={tone}>{bn ? item.tag_bn : item.tag_en}</StockPill>;

  return (
    <StockRow
      as={as}
      inset="card"
      code={item.code}
      name={item.name}
      price={item.price}
      change={item.change_pct}
      leading={rank != null ? <StockRank n={rank} solid={rank <= 3} /> : undefined}
      mark={mark}
      masked={masked}
      tags={item.new ? <StockPill tone="positive">{t(lang, "forYouNew")}</StockPill> : undefined}
      sub={
        rich ? (
          <span className="mt-1 inline-flex">{tag}</span>
        ) : (
          <>
            {tag}
            <span className="ml-1.5 text-text-muted">{why}</span>
          </>
        )
      }
      subClamp
      detail={
        rich ? (
          <>
            <span className="mt-1.5 block text-sm leading-snug text-text-main">{why}</span>
            {(item.points?.length ?? 0) > 0 && (
              <span className="mt-2 block space-y-1">
                {(item.points ?? []).map((p) => (
                  <span key={p.en} className="flex items-start gap-2 text-text-muted">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-text-muted" aria-hidden="true" />
                    <span className="min-w-0">{L(p)}</span>
                  </span>
                ))}
              </span>
            )}
            {item.watch && (
              <span className="mt-1.5 flex items-start gap-1.5 text-watch">
                <span className="mt-0.5 shrink-0" aria-hidden="true">
                  <IconAlert size={12} />
                </span>
                <span className="min-w-0">
                  <span className="font-semibold">{t(lang, "forYouWatch")}</span> {L(item.watch)}
                </span>
              </span>
            )}
          </>
        ) : undefined
      }
      action={action}
      lang={lang}
    />
  );
}
