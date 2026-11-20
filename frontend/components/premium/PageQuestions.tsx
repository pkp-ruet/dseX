"use client";

import { ToneChip, tx } from "@/components/report/chip";
import PremiumCard from "@/components/premium/PremiumCard";
import { usePremium } from "@/lib/premium";
import type { Bi, Tone } from "@/lib/stock-report";

/**
 * A fact this page already shows free, beside the question it leaves
 * (2026-10-31, the Premium Desk plan https://claude.ai/artifact/Xf7iYDevRGMNfQW6SpHZ5B).
 * `fact` is a real count or a real share from the page; `ask` + `hint` say what
 * Premium answers — never the answer itself.
 */
export type PageQuestion = { key: string; fact: Bi; tone?: Tone; ask: Bi; hint?: Bi };

/**
 * THE Premium card of a market page — the stock page's `NextQuestions`, made
 * for every other page: the page shows every fact free, this card pairs some
 * of them with the questions they leave, and a Premium reader sees the answers
 * in place on the page instead (the card renders only its anchor for them).
 * One per page; it replaces the row locks and lock lines the market pages had.
 * On the one Premium card shell since 2026-11-20 (`PremiumCard`): the facts
 * and their questions are its body.
 */
export default function PageQuestions({
  id,
  area,
  title,
  lead,
  rows,
  label,
  className = "",
}: {
  /** The page's Premium anchor (`#dc-premium`); every Locked part on the page points here. */
  id: string;
  /** Analytics + /premium context, e.g. "dividend-calendar". */
  area: string;
  title: Bi;
  lead?: Bi;
  rows: PageQuestion[];
  /** What /premium says the reader came from ("Is each dividend safe?"). */
  label: Bi;
  className?: string;
}) {
  const { isPremium } = usePremium();
  const shown = rows.slice(0, 4);

  if (isPremium || shown.length === 0) return <span id={id} className="pq-anchor" aria-hidden="true" />;

  return (
    <PremiumCard
      anchor={id}
      area={area}
      lock={`${area}-questions`}
      src={area}
      track={{ stakes: shown.length }}
      className={`pq-card ${className}`.trim()}
      tag={label}
      title={tx(title)}
      lead={lead ? tx(lead) : undefined}
      cta={{ en: "Get Premium", bn: "প্রিমিয়াম নিন" }}
      context={{ label, stakes: shown.map((r) => r.ask) }}
    >
      <ul className="pq-rows">
        {shown.map((r) => (
          <li key={r.key} className="pq-row">
            <ToneChip word={r.fact} tone={r.tone ?? "neutral"} />
            <span className="pq-q">
              <b>{tx(r.ask)}</b>
              {r.hint && <span>{tx(r.hint)}</span>}
            </span>
          </li>
        ))}
      </ul>
    </PremiumCard>
  );
}
