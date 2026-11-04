import { T } from "@/components/i18n/T";
import { takaGroup } from "@/lib/formatters";
import type { Bi } from "@/lib/stock-report";

/**
 * The Premium price against the reader's own money, one sentence under the
 * price on the Premium cards (2026-11-04, the portfolio card first, then the
 * stock page's): less than the broker fee on one trade of ৳N — the fee is
 * the reader's own setting or the usual 0.4%, and N is rounded UP to ৳5,000
 * so the claim always holds — and, when they hold enough, the share of it.
 *
 * `of(amount)` names what they hold: "the ৳98,000 in your shares" /
 * "আপনার শেয়ারে থাকা ৳98,000"; the sentence wraps it in each language.
 */
export default function PriceAgainst({
  price,
  feePct,
  held,
  minHeld,
  of,
  usualFee = false,
}: {
  price: number;
  /** % a side; null or 0 leaves the fee part out. */
  feePct: number | null;
  /** Taka they hold (the portfolio, or this share); null when none. */
  held: number | null;
  /** The share of their money is said only from this much held. */
  minHeld: number;
  of: (amount: string) => Bi;
  /** Say "the usual broker fee" when the fee is not the reader's own setting. */
  usualFee?: boolean;
}) {
  const trade = feePct && feePct > 0 ? Math.ceil(price / (feePct / 100) / 5000) * 5000 : null;
  const share = held && held >= minHeld ? (price / held) * 100 : null;
  if (!trade && share == null) return null;

  const pctEn = share == null ? "" : share < 0.1 ? "under 0.1%" : `${share.toFixed(1)}%`;
  const pctBn = share == null ? "" : share < 0.1 ? "0.1%-এরও কম" : `${share.toFixed(1)}%`;
  const fee = usualFee ? { en: "the usual broker fee", bn: "সাধারণ ব্রোকার ফি" } : { en: "the broker fee", bn: "ব্রোকার ফি" };
  const tradeEn = trade ? `less than ${fee.en} on one ${takaGroup(trade)} trade` : "";
  const tradeBn = trade ? `${takaGroup(trade)}-এর একটি লেনদেনের ${fee.bn}-র চেয়েও কম` : "";

  if (share != null && held) {
    const o = of(takaGroup(held));
    return (
      <span className="spx-against">
        <T
          en={`That's ${pctEn} of ${o.en}${trade ? `, and ${tradeEn}` : ""}.`}
          bn={`${o.bn}-এর ${pctBn}${trade ? `, আর ${tradeBn}` : ""}।`}
        />
      </span>
    );
  }
  return (
    <span className="spx-against">
      <T en={`${tradeEn[0].toUpperCase()}${tradeEn.slice(1)}.`} bn={`${tradeBn}।`} />
    </span>
  );
}
