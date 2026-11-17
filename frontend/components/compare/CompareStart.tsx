"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { T } from "@/components/i18n/T";
import { IconArrowRight, IconBriefcase } from "@/components/ui/icons";
import { useAuth } from "@/context/AuthContext";
import { loadMainHoldings } from "@/lib/main-holdings";
import { loadWatchlist } from "@/lib/watchlist";
import { PARTS, PRESETS, QUESTION_WORDS, joinBn, joinEn, presetLabel, type PickOption } from "@/lib/compare";

interface Props {
  options: PickOption[];
  limit: number;
  /** Start a comparison; `mine` = the reader's own shares. */
  onPick: (codes: string[], mine: boolean) => void;
}

/** How many of the reader's own shares the first comparison puts up. */
const MINE_MAX = 3;

type Mine = { codes: string[]; from: "held" | "watched" | "both" };

/**
 * The page with nothing picked yet (2026-11-18): the reader's own shares
 * first (main-portfolio holdings by money put in, then followed shares — the
 * dashboard card's rule), four ready comparisons as tiles naming only the
 * shares this reader will compare, and the seven questions by part, so a new
 * reader knows what they will get. The search lives in the shares card above.
 */
export default function CompareStart({ options, limit, onPick }: Props) {
  const { user } = useAuth();
  const [mine, setMine] = useState<Mine | null>(null);

  useEffect(() => {
    if (!user) {
      setMine(null);
      return;
    }
    let live = true;
    const graded = new Set(options.map((o) => o.code));
    Promise.all([loadMainHoldings().catch(() => []), loadWatchlist().catch(() => [] as string[])]).then(([holdings, watched]) => {
      if (!live) return;
      const money = new Map<string, number>();
      for (const h of holdings) {
        const c = h.trading_code.toUpperCase();
        money.set(c, (money.get(c) ?? 0) + (Number(h.qty) || 0) * (Number(h.buy_price) || 0));
      }
      const held = [...money.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
      const want = Math.min(limit, MINE_MAX);
      const codes: string[] = [];
      let fromHeld = 0;
      for (const c of [...held, ...watched.map((w) => w.toUpperCase())]) {
        if (codes.length >= want) break;
        if (codes.includes(c) || !graded.has(c)) continue;
        codes.push(c);
        if (money.has(c)) fromHeld += 1;
      }
      setMine(
        codes.length >= 2
          ? { codes, from: fromHeld === codes.length ? "held" : fromHeld === 0 ? "watched" : "both" }
          : null,
      );
    });
    return () => {
      live = false;
    };
  }, [user, options, limit]);

  const name = (c: string) => options.find((o) => o.code === c)?.name ?? c;

  return (
    <div className="cmp-start">
      {mine && (
        <section className="cmp-card cmp-mine" aria-labelledby="cmp-mine-t">
          <span className="cmp-mine-ic" aria-hidden="true">
            <IconBriefcase size={18} />
          </span>
          <div className="min-w-0">
            <h2 id="cmp-mine-t">
              <T en="Compare your own shares" bn="নিজের শেয়ারগুলো তুলনা করুন" />
            </h2>
            <p>
              {(() => {
                const ns = mine.codes.map(name);
                const from =
                  mine.from === "held"
                    ? { en: "the biggest in your portfolio", bn: "আপনার পোর্টফোলিওর সবচেয়ে বড়গুলো" }
                    : mine.from === "watched"
                      ? { en: "shares you follow", bn: "যে শেয়ারগুলো আপনি অনুসরণ করেন" }
                      : { en: "from your portfolio and the shares you follow", bn: "আপনার পোর্টফোলিও আর অনুসরণ করা শেয়ার থেকে" };
                return <T en={`${joinEn(ns)}: ${from.en}.`} bn={`${joinBn(ns)}: ${from.bn}।`} />;
              })()}
            </p>
          </div>
          <Button className="cmp-mine-btn" onClick={() => onPick(mine.codes, true)}>
            <T en={`Compare these ${mine.codes.length}`} bn={`এই ${mine.codes.length}টি তুলনা করুন`} />
            <IconArrowRight size={16} />
          </Button>
        </section>
      )}

      <section aria-labelledby="cmp-ready-t">
        <h2 id="cmp-ready-t" className="cmp-start-h">
          {mine ? <T en="Or start with one of these" bn="অথবা এগুলোর একটি দিয়ে শুরু করুন" /> : <T en="Start with one of these" bn="এগুলোর একটি দিয়ে শুরু করুন" />}
        </h2>
        <ul className="cmp-tiles">
          {PRESETS.map((p) => {
            const label = presetLabel(p, limit);
            return (
              <li key={p.codes.join(",")}>
                <button type="button" className="cmp-tile" onClick={() => onPick(p.codes.slice(0, limit), false)}>
                  <b>
                    <T en={label.en} bn={label.bn} />
                  </b>
                  <span>
                    <T en={p.sector.en} bn={p.sector.bn} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="cmp-card cmp-seven" aria-labelledby="cmp-seven-t">
        <h2 id="cmp-seven-t" className="cmp-start-h">
          <T en="What you'll see" bn="যা দেখবেন" />
        </h2>
        <ul>
          {PARTS.map((p) => {
            const qs = p.qs.map((k) => QUESTION_WORDS[k]);
            if (p.key === "cash") qs.push({ en: "Record dates, AGMs and results coming up", bn: "সামনের রেকর্ড ডেট, এজিএম আর আর্থিক ফল" });
            return (
              <li key={p.key}>
                <b>
                  <T en={p.title.en} bn={p.title.bn} />
                </b>
                <span>
                  <T en={qs.map((x) => x.en).join(" · ")} bn={qs.map((x) => x.bn).join(" · ")} />
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
