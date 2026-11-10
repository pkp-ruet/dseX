"use client";

import { Fragment, useState } from "react";
import Link from "@/components/ui/Link";
import { T } from "@/components/i18n/T";
import Tabs from "@/components/ui/Tabs";
import { useLang } from "@/context/LangContext";
import type { MarketSectorRow, MarketSinceYesterday } from "@/lib/api";
import { sectorBn } from "@/lib/bn";
import MkCard from "@/components/market-analysis/MkCard";

type Period = "today" | "week";

interface Bi {
  en: string;
  bn: string;
}

/** Best five + worst three until the reader asks for all. */
const HEAD = 5;
const TAIL = 3;

function pct(v: number, d: number): string {
  const s = Math.abs(v).toFixed(d);
  return `${v > 0 ? "+" : v < 0 ? "−" : ""}${s}%`;
}

function joinEn(names: string[]): string {
  return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
function joinBn(names: string[]): string {
  return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} আর ${names[names.length - 1]}`;
}

function todayLead(rows: { name: string; v: number }[]): Bi {
  const up = rows.filter((r) => r.v > 0);
  const down = rows.filter((r) => r.v < 0);
  const n = rows.length;
  if (up.length === n) return { en: "Every sector rose today.", bn: "আজ সব সেক্টরের দাম বেড়েছে।" };
  if (down.length === n) return { en: "Every sector fell today.", bn: "আজ সব সেক্টরের দাম কমেছে।" };
  if (down.length === 1) {
    return {
      en: `${up.length} of ${n} sectors rose today. Only ${down[0].name} fell.`,
      bn: `আজ ${n}টির মধ্যে ${up.length}টি সেক্টরের দাম বেড়েছে। কমেছে শুধু ${sectorBn(down[0].name)}।`,
    };
  }
  if (up.length === 1) {
    return {
      en: `${down.length} of ${n} sectors fell today. Only ${up[0].name} rose.`,
      bn: `আজ ${n}টির মধ্যে ${down.length}টি সেক্টরের দাম কমেছে। বেড়েছে শুধু ${sectorBn(up[0].name)}।`,
    };
  }
  return {
    en: `${up.length} sectors rose today and ${down.length} fell.`,
    bn: `আজ ${up.length}টি সেক্টরের দাম বেড়েছে, কমেছে ${down.length}টির।`,
  };
}

function weekLead(sectors: MarketSectorRow[]): Bi {
  const good = sectors.filter((r) => r.tone === "pos").length;
  const bad = sectors.filter((r) => r.tone === "neg").length;
  const mid = sectors.length - good - bad;
  const en: string[] = [];
  const bn: string[] = [];
  if (good) { en.push(`${good} ${good === 1 ? "is" : "are"} doing well`); bn.push(`${good}টি ভালো করছে`); }
  if (mid) { en.push(`${mid} ${mid === 1 ? "is" : "are"} steady`); bn.push(`${mid}টি স্থির`); }
  if (bad) { en.push(`${bad} ${bad === 1 ? "is" : "are"} struggling`); bn.push(`${bad}টি চাপে আছে`); }
  return { en: `This week ${joinEn(en)}.`, bn: `এ সপ্তাহে ${joinBn(bn)}।` };
}

/** "Since yesterday, Engineering, Travel, Other and 4 more moved up a step, and Funds moved down a step." */
function sinceLine(since: MarketSinceYesterday | null | undefined): Bi | null {
  const up = since?.sectors_up ?? [];
  const down = since?.sectors_down ?? [];
  if (!up.length && !down.length) return null;
  const list = (names: string[]) => {
    if (names.length <= 3) return { en: joinEn(names), bn: joinBn(names.map(sectorBn)), n: names.length, more: false };
    return {
      en: `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`,
      bn: `${names.slice(0, 3).map(sectorBn).join(", ")} সহ ${names.length}টি সেক্টর`,
      n: names.length,
      more: true,
    };
  };
  const en: string[] = [];
  const bn: string[] = [];
  if (up.length) {
    const l = list(up);
    en.push(`${l.en} moved up a step`);
    bn.push(`${l.bn} এক ধাপ ওপরে উঠেছে`);
  }
  if (down.length) {
    const l = list(down);
    en.push(`${l.en} moved down a step`);
    bn.push(`${l.bn} এক ধাপ নেমেছে`);
  }
  return { en: `Since yesterday, ${en.join(", and ")}.`, bn: `গতকালের তুলনায় ${bn.join(", আর ")}।` };
}

interface Row {
  name: string;
  slug: string | null;
  v: number;
  status?: Bi;
  tone?: string;
}

function SectorList({ rows, decimals, id }: { rows: Row[]; decimals: number; id: string }) {
  const [open, setOpen] = useState(false);
  const fold = rows.length > HEAD + TAIL + 1;
  const max = Math.max(...rows.map((r) => Math.max(r.v, 0)), 0);
  const min = Math.min(...rows.map((r) => Math.min(r.v, 0)), 0);
  const span = max - min || 1;
  const zero = (-min / span) * 100;

  return (
    <>
      <ul className="mk-sec-rows" id={id}>
        {rows.map((r, i) => {
          const hidden = fold && !open && i >= HEAD && i < rows.length - TAIL;
          const w = (Math.abs(r.v) / span) * 100;
          const name = <T en={r.name} bn={sectorBn(r.name)} />;
          return (
            <Fragment key={r.name}>
              {fold && !open && i === HEAD && (
                <li className="mk-sec-gap" aria-hidden="true">
                  · · ·
                </li>
              )}
            <li hidden={hidden}>
              <div className="mk-sec">
                <span className="min-w-0">
                  {r.slug ? (
                    <Link href={`/sector/${r.slug}`} className="mk-sec-name">
                      {name}
                    </Link>
                  ) : (
                    <span className="mk-sec-name">{name}</span>
                  )}
                  {r.status && (
                    <span className={`mk-sec-word mk-sec-word--${r.tone ?? "neutral"}`}>
                      <T en={r.status.en} bn={r.status.bn} />
                    </span>
                  )}
                </span>
                <span className="mk-dv" style={{ ["--zero" as string]: `${zero}%` }} aria-hidden="true">
                  <span
                    className={r.v >= 0 ? "mk-dv-p" : "mk-dv-n"}
                    style={r.v >= 0 ? { left: `${zero}%`, width: `${w}%` } : { left: `${zero - w}%`, width: `${w}%` }}
                  />
                </span>
                <span className={`mk-sec-val ${r.v > 0 ? "text-positive" : r.v < 0 ? "text-negative" : ""}`}>
                  {pct(r.v, decimals)}
                </span>
              </div>
            </li>
            </Fragment>
          );
        })}
      </ul>
      {fold && (
        <button
          type="button"
          className="btn-quiet btn-sm btn-block mk-more"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={id}
        >
          {open ? (
            <T en="Show fewer" bn="কম দেখান" />
          ) : (
            <T en={`Show all ${rows.length} sectors`} bn={`${rows.length}টি সেক্টরই দেখান`} />
          )}
        </button>
      )}
    </>
  );
}

/**
 * Block 4 of the market page — sectors, as Today and This week tabs. Bars sit
 * around zero; the best five and the worst three show until "Show all". Each
 * sector with a page links to it. Today is each sector's average move over
 * its shares that traded today (`ret_1d`, 2026-11-05); an older backend
 * without it gets the week alone.
 */
export default function SectorsCard({
  sectors,
  since,
}: {
  sectors: MarketSectorRow[];
  since?: MarketSinceYesterday | null;
}) {
  const bn = useLang().lang === "bn";
  const todayRows: Row[] = sectors
    .filter((s) => s.ret_1d != null)
    .map((s) => ({ name: s.name, slug: s.slug ?? null, v: s.ret_1d as number }))
    .sort((a, b) => b.v - a.v);
  const weekRows: Row[] = [...sectors]
    .sort((a, b) => b.ret_1w - a.ret_1w)
    .map((s) => ({
      name: s.name,
      slug: s.slug ?? null,
      v: s.ret_1w,
      status: { en: s.status, bn: s.status_bn ?? s.status },
      tone: s.tone,
    }));
  const hasToday = todayRows.length >= 3;
  const [period, setPeriod] = useState<Period>("today");
  if (!weekRows.length) return null;
  const show: Period = hasToday ? period : "week";
  const since_ = sinceLine(since);

  return (
    <MkCard
      id="mk-sectors"
      title={<T en="Sectors" bn="সেক্টর" />}
      note={<T en="Which parts of the market moved, and how much." bn="বাজারের কোন অংশ কতটা নড়েছে।" />}
    >
      {hasToday && (
        <Tabs
          tabs={[
            { key: "today" as Period, label: <T en="Today" bn="আজ" /> },
            { key: "week" as Period, label: <T en="This week" bn="এ সপ্তাহে" /> },
          ]}
          value={period}
          onChange={setPeriod}
          ariaLabel={bn ? "সময়" : "Period"}
          idBase="mk-sec-tab"
        />
      )}

      {show === "today" ? (
        <div role="tabpanel" aria-labelledby="mk-sec-tab-today">
          <p className="mk-tab-lead">
            <T {...todayLead(todayRows)} />
          </p>
          <SectorList rows={todayRows} decimals={2} id="mk-sec-today" />
          <p className="mk-sec-foot">
            <T
              en="Each sector's average move, over its shares that traded today."
              bn="প্রতিটি সেক্টরে আজ লেনদেন হওয়া শেয়ারের গড় ওঠানামা।"
            />
          </p>
        </div>
      ) : (
        <div role="tabpanel" aria-labelledby={hasToday ? "mk-sec-tab-week" : undefined}>
          <p className="mk-tab-lead">
            <T {...weekLead(sectors)} />
            {since_ && (
              <>
                {" "}
                <T en={since_.en} bn={since_.bn} />
              </>
            )}
          </p>
          <SectorList rows={weekRows} decimals={1} id="mk-sec-week" />
          <p className="mk-sec-foot">
            <T en="Each sector's average move over the last week." bn="গত এক সপ্তাহে প্রতিটি সেক্টরের গড় ওঠানামা।" />
          </p>
        </div>
      )}
    </MkCard>
  );
}
