"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import TierPill from "@/components/ui/TierPill";
import { PersonalMark, usePersonalCodesCtx } from "@/components/market-analysis/PersonalCodes";
import { T } from "@/components/i18n/T";
import { sectorBn } from "@/lib/bn";
import type { TierKeyOrUnknown } from "@/lib/research-reports";

/** A report section: plain h2 + one lead line, then its body. */
export function RrSection({ id, title, lead, children }: { id: string; title: ReactNode; lead?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="rr-section" aria-labelledby={`${id}-t`}>
      <h2 id={`${id}-t`} className="rr-h2">
        {title}
      </h2>
      {lead && <p className="rr-lead">{lead}</p>}
      {children}
    </section>
  );
}

/** Company name (links to its stock page), ticker, the reader's H / ★. */
export function CompanyName({ code, name, hash = "" }: { code: string; name: string; hash?: string }) {
  return (
    <span className="rr-name">
      <Link href={`/stock/${code}${hash}`} prefetch={false} className="rr-name-link">
        {name}
      </Link>
      <span className="rr-code">{code}</span>
      <PersonalMark code={code} />
    </span>
  );
}

/** "Textile · Mostly weak" under a name. */
export function CompanyMeta({ sector, tier, children }: { sector: string | null; tier?: TierKeyOrUnknown; children?: ReactNode }) {
  return (
    <span className="rr-meta">
      {sector && <T en={sector} bn={sectorBn(sector)} />}
      {tier && tier !== "unknown" && <TierPill tier={tier} />}
      {children}
    </span>
  );
}

/** The reader's holdings ∪ watchlist codes (empty for a guest). */
export function useMine(): Set<string> {
  const { portfolio, watchlist } = usePersonalCodesCtx();
  return new Set([...portfolio, ...watchlist]);
}

/** A horizontal bar of `n` out of `of`, with its tone. */
export function Bar({ n, of, tone = "ink" }: { n: number; of: number; tone?: "ink" | "negative" | "watch" | "positive" }) {
  const w = of > 0 ? Math.max(2, Math.round((n / of) * 100)) : 0;
  return (
    <span className="rr-bar" aria-hidden="true">
      <span className={`rr-bar-fill rr-bar-${tone}`} style={{ width: `${w}%` }} />
    </span>
  );
}

/** "Show all N" / "Show fewer" under a long list. */
export function ShowMore({ open, total, shown, onToggle }: { open: boolean; total: number; shown: number; onToggle: () => void }) {
  if (total <= shown) return null;
  return (
    <button type="button" className="rr-more-btn" onClick={onToggle} aria-expanded={open}>
      {open ? <T en="Show fewer" bn="কম দেখান" /> : <T en={`Show all ${total}`} bn={`সব ${total}টি দেখান`} />}
    </button>
  );
}
