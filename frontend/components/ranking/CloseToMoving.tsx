"use client";

import StockRow from "@/components/ui/StockRow";
import TierPill from "@/components/ui/TierPill";
import SectionHeader from "@/components/ui/SectionHeader";
import RowLock from "@/components/premium/RowLock";
import LockPanel from "@/components/premium/LockPanel";
import { T } from "@/components/i18n/T";
import { GROUP_NAMES, type Bi } from "@/lib/ranking";
import type { TierKey } from "@/lib/constants";

/** One company near a group line, already worked out on the server
 *  (`lib/ranking.closeToMoving`) so only these few rows ship to the browser. */
export type CloseRow = {
  code: string;
  name: string | null;
  score: number | null;
  ltp: number | null;
  change: number | null;
  from: TierKey;
  to: TierKey;
  dir: "up" | "down";
  pts: number;
  check: Bi;
};

const PREVIEW = 2;

const ptsWord = (n: number): Bi =>
  n < 1 ? { en: "under 1 point", bn: "1 পয়েন্টের কম" } : { en: `${n.toFixed(1)} points`, bn: `${n.toFixed(1)} পয়েন্ট` };

/**
 * "Close to moving" (2026-10-31, Premium · Find): companies within 2 points of
 * a better group, then those within 2 of a lower one, nearest first, each with
 * the check that would move it. Free readers get the counts and two masked
 * rows; the row lock's button goes to the page's one Premium card.
 */
export default function CloseToMoving({ up, down }: { up: CloseRow[]; down: CloseRow[] }) {
  const rows = [...up, ...down];
  if (rows.length === 0) return null;
  return (
    <section id="close" aria-labelledby="close-h" className="rk-close scroll-mt-24">
      <SectionHeader
        id="close-h"
        size="lg"
        title={<T en={`Close to moving · ${rows.length}`} bn={`দল বদলের কাছে · ${rows.length}`} />}
        lead={
          <T
            en={`${up.length} ${up.length === 1 ? "company is" : "companies are"} within 2 points of a better group, ${down.length} within 2 points of a lower one.`}
            bn={`${up.length}টি কোম্পানি ভালো দল থেকে 2 পয়েন্টের মধ্যে, ${down.length}টি নিচের দল থেকে 2 পয়েন্টের মধ্যে।`}
          />
        }
      />
      <div className="soft-card rk-close-card">
        <RowLock
          preview={
            <ul className="rk-close-rows">
              {rows.slice(0, PREVIEW).map((r) => (
                <CloseItem key={r.code} r={r} masked />
              ))}
            </ul>
          }
          panel={
            <LockPanel
              job="find"
              variant="full"
              inset
              title={{
                en: `See the ${rows.length} companies close to moving`,
                bn: `দল বদলের কাছে থাকা ${rows.length}টি কোম্পানি দেখুন`,
              }}
              sub={{
                en: "Premium names each one, how far it is from the line, and which check would move it.",
                bn: "প্রিমিয়ামে প্রতিটির নাম, সীমা থেকে কত দূরে, আর কোন যাচাই এটিকে সরাবে।",
              }}
              tiles={[
                { value: String(up.length), label: { en: "close to a better group", bn: "ভালো দলের কাছে" } },
                { value: String(down.length), label: { en: "close to a lower group", bn: "নিচের দলের কাছে" } },
              ]}
              codes={rows.map((r) => r.code)}
              count={rows.length}
              lock="Company ranking: close to moving"
              what={{ en: "Companies close to another group", bn: "দল বদলের কাছে থাকা কোম্পানি" }}
              href="#rk-premium"
            />
          }
        >
          <ul className="rk-close-rows">
            {rows.map((r) => (
              <CloseItem key={r.code} r={r} />
            ))}
          </ul>
        </RowLock>
      </div>
    </section>
  );
}

function CloseItem({ r, masked = false }: { r: CloseRow; masked?: boolean }) {
  const away = ptsWord(r.pts);
  const from = GROUP_NAMES[r.from].name;
  const to = GROUP_NAMES[r.to].name;
  return (
    <StockRow
      code={r.code}
      name={r.name}
      masked={masked}
      inset="bleed"
      className="rk-close-row"
      leading={
        <span className={`rk-close-dir ${r.dir === "up" ? "text-positive" : "text-negative"}`} aria-hidden="true">
          {r.dir === "up" ? "↑" : "↓"}
        </span>
      }
      tags={<TierPill tier={r.from} />}
      sub={<T en={`${from.en} → ${to.en}, ${away.en} away`} bn={`${from.bn} → ${to.bn}, ${away.bn} দূরে`} />}
      subTone={r.dir === "up" ? "positive" : "negative"}
      // Which check would move it is the Premium answer.
      detail={masked ? undefined : <T en={r.check.en} bn={r.check.bn} />}
      price={r.ltp}
      change={r.change}
    />
  );
}
