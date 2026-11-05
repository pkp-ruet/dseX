"use client";

import { useMemo, useState } from "react";
import Tabs from "@/components/ui/Tabs";
import { PersonalCodesProvider } from "@/components/market-analysis/PersonalCodes";
import { T } from "@/components/i18n/T";
import { sectorBn } from "@/lib/bn";
import { dayWords, perShare, signedPct, type ResultsSeason, type SeasonRow } from "@/lib/research-reports";
import { CompanyMeta, CompanyName, RrSection, ShowMore, useMine } from "./parts";

const SECTORS_SHOWN = 10;

const MOVE_WORDS: Record<SeasonRow["move"], { en: string; bn: string }> = {
  up: { en: "Profit up", bn: "মুনাফা বেড়েছে" },
  same: { en: "About the same", bn: "প্রায় একই" },
  down: { en: "Profit down", bn: "মুনাফা কমেছে" },
  to_profit: { en: "Back to a profit", bn: "লোকসান থেকে মুনাফায়" },
  to_loss: { en: "Turned to a loss", bn: "মুনাফা থেকে লোকসানে" },
  loss: { en: "Still a loss", bn: "এখনো লোকসান" },
};

const BUCKETS: { key: keyof ResultsSeason["counts"]; en: string; bn: string; cls: string }[] = [
  { key: "up", en: "Profit up", bn: "মুনাফা বেড়েছে", cls: "up" },
  { key: "same", en: "About the same", bn: "প্রায় একই", cls: "same" },
  { key: "down", en: "Profit down", bn: "মুনাফা কমেছে", cls: "down" },
  { key: "loss", en: "Still a loss", bn: "এখনো লোকসান", cls: "loss" },
];

/** The results season report's body (Premium): one tab per season. */
export default function SeasonView({ seasons }: { seasons: ResultsSeason[] }) {
  const [id, setId] = useState(seasons[0]?.season.id ?? "");
  const cur = seasons.find((x) => x.season.id === id) ?? seasons[0];
  if (!cur) return null;
  return (
    <PersonalCodesProvider>
      {seasons.length > 1 && (
        <div className="rr-season-tabs">
          <Tabs
            ariaLabel="Results season"
            idBase="rr-season"
            value={cur.season.id}
            onChange={setId}
            tabs={seasons.map((x) => ({ key: x.season.id, label: <T en={x.season.title.en} bn={x.season.title.bn} /> }))}
          />
        </div>
      )}
      <div role="tabpanel" aria-labelledby={`rr-season-${cur.season.id}`}>
        <Season key={cur.season.id} data={cur} />
      </div>
    </PersonalCodesProvider>
  );
}

function Season({ data }: { data: ResultsSeason }) {
  const mine = useMine();
  const byCode = useMemo(() => new Map(data.rows.map((r) => [r.code, r])), [data.rows]);
  const rowsOf = (codes: string[]) => codes.map((c) => byCode.get(c)).filter((r): r is SeasonRow => !!r);
  const mineRows = data.rows.filter((r) => mine.has(r.code));
  const n = data.reported;
  const med = data.median_pct;

  return (
    <>
      <RrSection
        id="rr-overall"
        title={<T en={data.season.title.en} bn={data.season.title.bn} />}
        lead={
          <T
            en={`${n} companies have posted results for this period. Each is compared with the same months a year earlier.`}
            bn={`এই সময়ের ফল দিয়েছে ${n}টি কোম্পানি। প্রতিটির তুলনা এক বছর আগের একই মাসগুলোর সঙ্গে।`}
          />
        }
      >
        <div className="rr-card rr-split-card">
          <p className="rr-big">
            <T
              en={`${data.counts.up} of ${n} companies made more profit than a year earlier.`}
              bn={`${n}টির মধ্যে ${data.counts.up}টি কোম্পানি এক বছর আগের চেয়ে বেশি মুনাফা করেছে।`}
            />
          </p>
          <SplitBar counts={data.counts} total={n} />
          <ul className="rr-legend">
            {BUCKETS.map((b) => (
              <li key={b.key}>
                <span className={`rr-sw rr-sw--${b.cls}`} aria-hidden="true" />
                <T en={b.en} bn={b.bn} />
                <b className="nums">{data.counts[b.key]}</b>
              </li>
            ))}
          </ul>
          <ul className="rr-facts">
            {med != null && (
              <li>
                <T
                  en={`For the company in the middle, profit ${med >= 0 ? "rose" : "fell"} ${Math.abs(med)}%.`}
                  bn={`মাঝামাঝি কোম্পানির মুনাফা ${Math.abs(med)}% ${med >= 0 ? "বেড়েছে" : "কমেছে"}।`}
                />
              </li>
            )}
            {(data.to_profit > 0 || data.to_loss > 0) && (
              <li>
                <T
                  en={`${data.to_profit} went from a loss back to a profit, and ${data.to_loss} went from a profit to a loss.`}
                  bn={`${data.to_profit}টি লোকসান থেকে মুনাফায় ফিরেছে, আর ${data.to_loss}টি মুনাফা থেকে লোকসানে গেছে।`}
                />
              </li>
            )}
            {data.coming.length > 0 && (
              <li>
                <T
                  en={`${data.coming.length} more companies meet to approve their results in the next 2 weeks.`}
                  bn={`আরও ${data.coming.length}টি কোম্পানি আগামী 2 সপ্তাহে ফল অনুমোদনের সভা করবে।`}
                />
              </li>
            )}
          </ul>
        </div>
      </RrSection>

      {mineRows.length > 0 && (
        <RrSection id="rr-mine" title={<T en="Your shares" bn="আপনার শেয়ার" />}>
          <ul className="rr-card rr-list">
            {mineRows.map((r) => (
              <MoveRow key={r.code} r={r} />
            ))}
          </ul>
        </RrSection>
      )}

      <SectorBlock data={data} />

      <div className="rr-two">
        <RrSection id="rr-top-up" title={<T en="Profit grew most" bn="মুনাফা সবচেয়ে বেশি বেড়েছে" />}>
          <ul className="rr-card rr-list">
            {rowsOf(data.top_up).map((r) => (
              <MoveRow key={r.code} r={r} />
            ))}
          </ul>
        </RrSection>
        <RrSection id="rr-top-down" title={<T en="Profit fell most" bn="মুনাফা সবচেয়ে বেশি কমেছে" />}>
          <ul className="rr-card rr-list">
            {rowsOf(data.top_down).map((r) => (
              <MoveRow key={r.code} r={r} />
            ))}
          </ul>
        </RrSection>
      </div>

      {(data.turned_profit.length > 0 || data.turned_loss.length > 0) && (
        <div className="rr-two">
          {data.turned_profit.length > 0 && (
            <RrSection id="rr-to-profit" title={<T en="Back to a profit" bn="লোকসান থেকে মুনাফায়" />}>
              <NameList rows={rowsOf(data.turned_profit)} />
            </RrSection>
          )}
          {data.turned_loss.length > 0 && (
            <RrSection id="rr-to-loss" title={<T en="Turned to a loss" bn="মুনাফা থেকে লোকসানে" />}>
              <NameList rows={rowsOf(data.turned_loss)} />
            </RrSection>
          )}
        </div>
      )}

      {data.cash_out.length > 0 && (
        <RrSection
          id="rr-cash"
          title={<T en="Profit up, but no cash came in" bn="মুনাফা বেড়েছে, কিন্তু নগদ আসেনি" />}
          lead={
            <T
              en="These companies earned more on paper, but their business paid out more cash than it took in. Profit that never turns into cash deserves a closer look."
              bn="এসব কোম্পানির কাগজে মুনাফা বেড়েছে, কিন্তু ব্যবসায় যত নগদ এসেছে, খরচ হয়েছে তার বেশি। যে মুনাফা নগদে আসে না, তা ভালো করে দেখা দরকার।"
            />
          }
        >
          <NameList rows={rowsOf(data.cash_out)} />
        </RrSection>
      )}

      {data.dividends && data.dividends.declared > 0 && <DividendBlock data={data} />}

      {data.coming.length > 0 && (
        <RrSection
          id="rr-coming"
          title={<T en="Results still to come" bn="যাদের ফল এখনো বাকি" />}
          lead={<T en="Results meetings in the next 2 weeks." bn="আগামী 2 সপ্তাহে ফল অনুমোদনের সভা।" />}
        >
          <ComingList rows={data.coming} />
        </RrSection>
      )}
    </>
  );
}

function SplitBar({ counts, total }: { counts: ResultsSeason["counts"]; total: number }) {
  if (total <= 0) return null;
  return (
    <span className="rr-split" aria-hidden="true">
      {BUCKETS.map((b) =>
        counts[b.key] > 0 ? (
          <span key={b.key} className={`rr-sw--${b.cls}`} style={{ width: `${(counts[b.key] / total) * 100}%` }} />
        ) : null,
      )}
    </span>
  );
}

function SectorBlock({ data }: { data: ResultsSeason }) {
  const [open, setOpen] = useState(false);
  const shown = open ? data.sectors : data.sectors.slice(0, SECTORS_SHOWN);
  if (data.sectors.length === 0) return null;
  return (
    <RrSection
      id="rr-season-sectors"
      title={<T en="Sector by sector" bn="সেক্টর ধরে ধরে" />}
      lead={<T en="Sectors with at least 3 reports, biggest first." bn="অন্তত 3টি ফল আসা সেক্টর, বড়টি আগে।" />}
    >
      <ul className="rr-card rr-list">
        {shown.map((sr) => {
          const loss = sr.n - sr.up - sr.same - sr.down;
          return (
            <li key={sr.sector} className="rr-sec">
              <span className="rr-bars-top">
                <b>
                  <T en={sr.sector} bn={sectorBn(sr.sector)} />
                </b>
                <span className="nums rr-bars-n">
                  <T en={`${sr.up} of ${sr.n} up`} bn={`${sr.n}টির মধ্যে ${sr.up}টির বেড়েছে`} />
                </span>
              </span>
              <SplitBar counts={{ up: sr.up, same: sr.same, down: sr.down, loss: Math.max(0, loss) }} total={sr.n} />
              {sr.median_pct != null && (
                <span className="rr-sec-m">
                  <T
                    en={`Middle company: profit ${signedPct(sr.median_pct)}`}
                    bn={`মাঝামাঝি কোম্পানি: মুনাফা ${signedPct(sr.median_pct)}`}
                  />
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <ShowMore open={open} total={data.sectors.length} shown={SECTORS_SHOWN} onToggle={() => setOpen((v) => !v)} />
    </RrSection>
  );
}

function periodWords(months: number) {
  return months === 12
    ? { en: "for the year", bn: "পুরো বছরে" }
    : { en: `in ${months} months`, bn: `${months} মাসে` };
}

function MoveRow({ r }: { r: SeasonRow }) {
  const tone = r.bucket === "up" ? "rr-up" : r.bucket === "down" || r.bucket === "loss" ? "rr-down" : "";
  const p = periodWords(r.months);
  return (
    <li className="rr-co">
      <div className="rr-co-head">
        <CompanyName code={r.code} name={r.name} hash="#an-profit" />
        <span className={`rr-move nums ${tone}`}>
          {r.pct != null ? signedPct(r.pct) : <T en={MOVE_WORDS[r.move].en} bn={MOVE_WORDS[r.move].bn} />}
        </span>
      </div>
      <CompanyMeta sector={r.sector} tier={r.tier} />
      <p className="rr-co-line">
        <T
          en={`Profit ${p.en}: ${perShare(r.eps)} a share, against ${perShare(r.eps_prev)} a year earlier.`}
          bn={`${p.bn} শেয়ারপ্রতি মুনাফা ${perShare(r.eps)}, এক বছর আগে ছিল ${perShare(r.eps_prev)}।`}
        />
      </p>
    </li>
  );
}

function NameList({ rows }: { rows: SeasonRow[] }) {
  const [open, setOpen] = useState(false);
  const shown = open ? rows : rows.slice(0, 6);
  return (
    <>
      <ul className="rr-card rr-list">
        {shown.map((r) => (
          <MoveRow key={r.code} r={r} />
        ))}
      </ul>
      <ShowMore open={open} total={rows.length} shown={6} onToggle={() => setOpen((v) => !v)} />
    </>
  );
}

function ComingList({ rows }: { rows: ResultsSeason["coming"] }) {
  const [open, setOpen] = useState(false);
  const shown = open ? rows : rows.slice(0, 8);
  return (
    <>
      <ul className="rr-card rr-list">
        {shown.map((m) => {
          const d = dayWords(m.date, false);
          return (
            <li key={m.code} className="rr-co rr-co--row">
              <CompanyName code={m.code} name={m.name} hash="#an-dates" />
              <span className="rr-date nums">
                <T en={d.en} bn={d.bn} />
              </span>
            </li>
          );
        })}
      </ul>
      <ShowMore open={open} total={rows.length} shown={8} onToggle={() => setOpen((v) => !v)} />
    </>
  );
}

const DIV_ROWS: { key: "raised" | "same" | "cut" | "none" | "first"; en: string; bn: string; cls: string }[] = [
  { key: "raised", en: "Paid more cash", bn: "বেশি নগদ দিয়েছে", cls: "up" },
  { key: "same", en: "Paid the same", bn: "একই দিয়েছে", cls: "same" },
  { key: "cut", en: "Paid less cash", bn: "কম নগদ দিয়েছে", cls: "down" },
  { key: "none", en: "Paid no dividend", bn: "কোনো ডিভিডেন্ড দেয়নি", cls: "loss" },
  { key: "first", en: "Paid after none last year", bn: "গত বছর না দিয়ে এবার দিয়েছে", cls: "up" },
];

function DividendBlock({ data }: { data: ResultsSeason }) {
  const d = data.dividends!;
  const cuts = data.rows
    .filter((r) => r.dividend?.move === "cut")
    .sort((a, b) => (a.dividend!.cash_pct! - a.dividend!.prev_cash_pct!) - (b.dividend!.cash_pct! - b.dividend!.prev_cash_pct!));
  const skipped = data.rows.filter((r) => r.dividend?.move === "none" && (r.dividend.prev_cash_pct ?? 0) > 0);
  return (
    <RrSection
      id="rr-dividends"
      title={<T en="Dividends compared with last year" bn="গত বছরের সঙ্গে ডিভিডেন্ডের তুলনা" />}
      lead={
        <T
          en={`${d.declared} companies declared their dividend with these results. Figures are cash as a % of the share's face value, so 10% on a ৳10 share is ৳1.`}
          bn={`এই ফলের সঙ্গে ${d.declared}টি কোম্পানি ডিভিডেন্ড ঘোষণা করেছে। হিসাব শেয়ারের অভিহিত মূল্যের % হিসেবে, তাই ৳10 শেয়ারে 10% মানে ৳1।`}
        />
      }
    >
      <div className="rr-card rr-divs">
        {DIV_ROWS.filter((r) => d[r.key] > 0).map((r) => (
          <div key={r.key} className="rr-div">
            <span className={`rr-sw rr-sw--${r.cls}`} aria-hidden="true" />
            <span className="rr-div-l">
              <T en={r.en} bn={r.bn} />
            </span>
            <b className="nums">{d[r.key]}</b>
          </div>
        ))}
      </div>
      {cuts.length > 0 && (
        <>
          <h3 className="rr-h3 rr-h3--sub">
            <T en="Who paid less cash" bn="কারা কম নগদ দিয়েছে" />
          </h3>
          <DivList rows={cuts} />
        </>
      )}
      {skipped.length > 0 && (
        <>
          <h3 className="rr-h3 rr-h3--sub">
            <T en="Who paid nothing after paying last year" bn="গত বছর দিয়ে এবার কিছুই দেয়নি" />
          </h3>
          <DivList rows={skipped} />
        </>
      )}
    </RrSection>
  );
}

function DivList({ rows }: { rows: SeasonRow[] }) {
  const [open, setOpen] = useState(false);
  const shown = open ? rows : rows.slice(0, 6);
  return (
    <>
      <ul className="rr-card rr-list">
        {shown.map((r) => (
          <li key={r.code} className="rr-co rr-co--row">
            <CompanyName code={r.code} name={r.name} hash="#an-dividend" />
            <span className="rr-date nums">
              <T
                en={`${r.dividend!.prev_cash_pct ?? 0}% → ${r.dividend!.cash_pct ?? 0}%`}
                bn={`${r.dividend!.prev_cash_pct ?? 0}% → ${r.dividend!.cash_pct ?? 0}%`}
              />
            </span>
          </li>
        ))}
      </ul>
      <ShowMore open={open} total={rows.length} shown={6} onToggle={() => setOpen((v) => !v)} />
    </>
  );
}
