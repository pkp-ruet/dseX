"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import MkCard from "./MkCard";
import { formatDate } from "@/lib/formatters";
import { bnDate } from "@/lib/bn";
import { T } from "@/components/i18n/T";
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
  label: ReactNode;
  codes: string[];
  note?: (code: string) => ReactNode;
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
    { key: "unusual", label: <T en="Unusual buying today" bn="আজ অস্বাভাবিক কেনাকাটা" />, codes: pick(lists.unusual) },
    {
      key: "near_high",
      label: <T en="Near the year's highest price" bn="বছরের সর্বোচ্চ দামের কাছে" />,
      codes: pick(lists.nearHigh),
    },
    {
      key: "near_low",
      label: <T en="Near the year's lowest price" bn="বছরের সর্বনিম্ন দামের কাছে" />,
      codes: pick(lists.nearLow),
    },
    { key: "rising", label: <T en="Rising fast this week" bn="এ সপ্তাহে দ্রুত বাড়ছে" />, codes: pick(lists.rising) },
    {
      key: "dividends",
      label: <T en="Dividend date coming" bn="সামনে ডিভিডেন্ডের তারিখ" />,
      codes: pick(lists.dividends.map((d) => d.code)),
      note: (code: string) => {
        const d = divByCode.get(code.toUpperCase());
        if (!d) return null;
        return d.kind === "record" ? (
          <T en={`record date ${formatDate(d.date)}`} bn={`রেকর্ড ডেট ${bnDate(d.date)}`} />
        ) : (
          <T en={`announced ${formatDate(d.date)}`} bn={`ঘোষণা ${bnDate(d.date)}`} />
        );
      },
    },
  ].filter((b) => b.codes.length > 0);

  return (
    <MkCard
      className="mt-4"
      id="mk-yours-title"
      title={<T en="Your shares in today's lists" bn="আজকের তালিকায় আপনার শেয়ার" />}
    >
      {buckets.length === 0 ? (
        <p className="mk-empty">
          <T
            en={`None of your ${mine.size} ${mine.size === 1 ? "share is" : "shares are"} in today's lists. It is a quiet day for them.`}
            bn={`আপনার ${mine.size}টি শেয়ারের কোনোটিই আজকের তালিকায় নেই। এগুলোর জন্য আজ একটি শান্ত দিন।`}
          />
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
                      {note ? <span className="mk-chip-note">· {note}</span> : null}
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
