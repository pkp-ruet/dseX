"use client";

import { useEffect, useRef } from "react";
import Button from "@/components/ui/Button";
import { IconCrown } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { ToneChip, tx } from "@/components/report/chip";
import { useLang } from "@/context/LangContext";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { LOWEST_PRICE } from "@/lib/premium-plans";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";
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
  const { state, isPremium } = usePremium();
  const { bn } = useLang();
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef(false);
  const shown = rows.slice(0, 4);

  useEffect(() => {
    const el = ref.current;
    if (!el || isPremium || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (seen.current || !entries.some((e) => e.isIntersecting)) return;
        seen.current = true;
        trackEvent("premium_lock_view", { area, lock: `${area}-questions`, state, stakes: shown.length });
        io.disconnect();
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [isPremium, area, state, shown.length]);

  if (isPremium || shown.length === 0) return <span id={id} className="pq-anchor" aria-hidden="true" />;

  const onTap = () => {
    trackEvent("premium_lock_tap", { area, lock: `${area}-questions`, state, stakes: shown.length });
    savePremiumContext({
      from: area,
      label: bn ? label.bn || label.en : label.en,
      stakes: shown.slice(0, 3).map((r) => (bn ? r.ask.bn || r.ask.en : r.ask.en)),
    });
  };

  return (
    <section ref={ref} id={id} className={`pq ${className}`.trim()} aria-labelledby={`${id}-title`}>
      <p className="pq-tag">
        <IconCrown size={14} />
        <T en="Premium" bn="প্রিমিয়াম" />
      </p>
      <h2 id={`${id}-title`} className="pq-title">{tx(title)}</h2>
      {lead && <p className="pq-lead">{tx(lead)}</p>}
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
      <div className="pq-actions">
        <Button href={PREMIUM_PATH} onClick={onTap} size="lg">
          <T en={`Get Premium · ৳${LOWEST_PRICE} a month`} bn={`প্রিমিয়াম নিন · মাসে ৳${LOWEST_PRICE}`} />
        </Button>
        <p className="pq-fine">
          <T en="bKash, Nagad or bank. Nothing renews by itself." bn="bKash, Nagad বা ব্যাংক। নিজে থেকে নবায়ন হয় না।" />
        </p>
      </div>
    </section>
  );
}
