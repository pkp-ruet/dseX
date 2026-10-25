"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import MkCard from "./MkCard";
import { formatDate } from "@/lib/formatters";
import { PersonalMark, usePersonalCodesCtx } from "./PersonalCodes";

export interface YourStocksLists {
  rising: string[];
  nearHigh: string[];
  nearLow: string[];
  unusual: string[];
  dividends: { code: string; date: string; kind: "record" | "declared" }[];
}

interface Bucket {
  key: string;
  label: string;
  codes: string[];
  note?: (code: string) => string | null;
}

/**
 * "Your stocks in this picture" — which of the reader's own portfolio and
 * watchlist names appear in today's lists on this page. Client-only, fed by the
 * one shared PersonalCodes context; logged-out readers (and readers with no
 * stocks yet) see nothing, so the server-rendered page is unchanged.
 */
export default function YourStocksHere({ lists }: { lists: YourStocksLists }) {
  const { isLoggedIn } = useAuth();
  const { portfolio, watchlist } = usePersonalCodesCtx();
  if (!isLoggedIn) return null;

  const mine = new Set<string>([...portfolio, ...watchlist]);
  if (mine.size === 0) return null;

  const pick = (codes: string[]) => codes.filter((c) => mine.has(c.toUpperCase()));
  const divByCode = new Map(lists.dividends.map((d) => [d.code.toUpperCase(), d]));

  const buckets: Bucket[] = [
    { key: "unusual", label: "Unusual buying today", codes: pick(lists.unusual) },
    { key: "near_high", label: "At a one-year high", codes: pick(lists.nearHigh) },
    { key: "near_low", label: "At a one-year low", codes: pick(lists.nearLow) },
    { key: "rising", label: "Rising fast this week", codes: pick(lists.rising) },
    {
      key: "dividends",
      label: "Cash date coming",
      codes: pick(lists.dividends.map((d) => d.code)),
      note: (code: string) => {
        const d = divByCode.get(code.toUpperCase());
        if (!d) return null;
        return d.kind === "record" ? `record ${formatDate(d.date)}` : `announced ${formatDate(d.date)}`;
      },
    },
  ].filter((b) => b.codes.length > 0);

  return (
    <MkCard
      className="mt-4"
      id="mk-yours-title"
      title="Your stocks in this picture"
      bn="আজকের বাজারের ছবিতে আপনার শেয়ারগুলো কোথায় আছে"
    >
      {buckets.length === 0 ? (
        <p className="mk-empty">
          None of your {mine.size} {mine.size === 1 ? "stock shows" : "stocks show"} up in today&apos;s lists —
          a quiet day for them.
        </p>
      ) : (
        <div>
          {buckets.map((b) => (
            <div className="mk-yours-row" key={b.key}>
              <span className="mk-yours-k">{b.label}</span>
              <span className="mk-chips">
                {b.codes.map((code) => {
                  const note = b.note?.(code);
                  return (
                    <Link key={code} href={`/stock/${code}`} className="mk-chip">
                      {code}
                      <PersonalMark code={code} />
                      {note && <span className="mk-chip-note">· {note}</span>}
                    </Link>
                  );
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </MkCard>
  );
}
