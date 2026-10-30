import Link from "next/link";
import type { ReactNode } from "react";
import { T } from "@/components/i18n/T";
import SectionHeader from "@/components/ui/SectionHeader";
import { Locked } from "@/components/premium/AnswerLock";
import type { RankMove, RankMovers as Movers } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import { bnDate } from "@/lib/bn";

/**
 * "This week's movers" on /dsestockranking (2026-10-31, the Premium Desk plan
 * step 3): the companies whose rank moved most in about a week. Who moved and
 * how far is free (a fact); why — the check that moved its score, or a
 * category change — is Premium, hidden in place (screen-only) and named by
 * the page's question card.
 */
export default function RankMovers({ movers, names }: { movers: Movers | null; names: Record<string, string> }) {
  if (!movers || !movers.to) return null;
  const quiet = movers.climbed.length === 0 && movers.fell.length === 0;

  if (quiet && movers.method && !movers.from) {
    return (
      <section className="rk-movers" aria-labelledby="rk-movers-h">
        <SectionHeader
          id="rk-movers-h"
          title={<T en="This week's movers" bn="এই সপ্তাহে যারা ওঠানামা করেছে" />}
          lead={
            <T
              en={`We changed how we score on ${formatDate(movers.to)}, so every rank moved at once. This week's movers start again from the next trading day.`}
              bn={`${bnDate(movers.to)} তারিখে আমরা স্কোর দেওয়ার নিয়ম বদলেছি, তাই সব র‍্যাঙ্ক একসঙ্গে সরেছে। এই সপ্তাহের ওঠানামা আবার পরের লেনদেনের দিন থেকে দেখাব।`}
            />
          }
        />
      </section>
    );
  }
  if (quiet || !movers.from) return null;

  return (
    <section className="rk-movers" aria-labelledby="rk-movers-h">
      <SectionHeader
        id="rk-movers-h"
        title={<T en="This week's movers" bn="এই সপ্তাহে যারা ওঠানামা করেছে" />}
        lead={
          <T
            en={`Since ${formatDate(movers.from)}, ${movers.climbed_n} ${movers.climbed_n === 1 ? "company" : "companies"} climbed 5 places or more and ${movers.fell_n} fell.`}
            bn={`${bnDate(movers.from)} থেকে ${movers.climbed_n}টি কোম্পানি 5 বা তার বেশি ধাপ উঠেছে, আর ${movers.fell_n}টি নেমেছে।`}
          />
        }
      />
      <div className="rk-movers-grid">
        <MoverList
          title={<T en="Climbed" bn="উঠেছে" />}
          items={movers.climbed}
          names={names}
        />
        <MoverList
          title={<T en="Fell" bn="নেমেছে" />}
          items={movers.fell}
          names={names}
        />
      </div>
    </section>
  );
}

function MoverList({
  title,
  items,
  names,
}: {
  title: ReactNode;
  items: RankMove[];
  names: Record<string, string>;
}) {
  if (items.length === 0) return null;
  return (
    <div className="soft-card rk-movers-card">
      <h3 className="rk-movers-title">{title}</h3>
      <ul className="rk-movers-list">
        {items.map((m) => {
          const up = m.places > 0;
          const n = Math.abs(m.places);
          return (
            <li key={m.code} className="rk-mover">
              <Link prefetch={false} href={`/stock/${m.code}`} className="rk-mover-link">
                <span className="rk-mover-name">
                  <b>{names[m.code] ?? m.code}</b>
                  <span className="rk-mover-code">{m.code}</span>
                </span>
                <span className={`rk-mover-move nums ${up ? "text-positive" : "text-negative"}`}>
                  <T
                    en={`${up ? "Up" : "Down"} ${n} ${n === 1 ? "place" : "places"}`}
                    bn={`${n} ধাপ ${up ? "উঠেছে" : "নেমেছে"}`}
                  />
                </span>
                <span className="rk-mover-ranks nums">
                  <T en={`Number ${m.from_rank} → ${m.to_rank}`} bn={`${m.from_rank} নম্বর → ${m.to_rank} নম্বর`} />
                </span>
              </Link>
              <Locked as="span" className="rk-mover-why">
                <T en={m.reason.en} bn={m.reason.bn} />
              </Locked>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
