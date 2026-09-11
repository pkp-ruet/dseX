"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import Bn from "@/components/i18n/Bn";
import { formatDate } from "@/lib/formatters";
import { PersonalMark, usePersonalCodesCtx } from "./PersonalCodes";

export interface YourStocksLists {
  onSale: string[];
  income: string[];
  rising: string[];
  fallen: string[];
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
    { key: "on_sale", label: "Good company, on sale", codes: pick(lists.onSale) },
    { key: "unusual", label: "Unusual buying today", codes: pick(lists.unusual) },
    { key: "near_high", label: "At a one-year high", codes: pick(lists.nearHigh) },
    { key: "near_low", label: "At a one-year low", codes: pick(lists.nearLow) },
    { key: "rising", label: "Rising fast this week", codes: pick(lists.rising) },
    { key: "fallen", label: "Cheap after a big fall", codes: pick(lists.fallen) },
    { key: "income", label: "Pays a lot of cash", codes: pick(lists.income) },
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
    <section
      className="ms-card ms-card--tint"
      style={{ marginTop: 16, "--card-accent": "var(--primary)" } as CSSProperties}
      aria-labelledby="ms-yours-title"
    >
      <p className="ms-card-title" id="ms-yours-title" style={{ marginBottom: 2 }}>
        Your stocks in this picture
      </p>
      <Bn className="ms-since-bn">আজকের বাজারের ছবিতে আপনার শেয়ারগুলো কোথায় আছে</Bn>
      {buckets.length === 0 ? (
        <p className="ms-empty" style={{ paddingBottom: 0 }}>
          None of your {mine.size} {mine.size === 1 ? "stock shows" : "stocks show"} up in today&apos;s lists —
          a quiet day for them.
        </p>
      ) : (
        <div className="ms-yours-list" style={{ marginTop: 10 }}>
          {buckets.map((b) => (
            <div className="ms-yours-row" key={b.key}>
              <span className="ms-yours-k">{b.label}:</span>
              {b.codes.map((code) => {
                const note = b.note?.(code);
                return (
                  <Link key={code} href={`/stock/${code}`} className="ms-chip">
                    {code}
                    <PersonalMark code={code} />
                    {note && <span className="ms-chip-note">· {note}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
