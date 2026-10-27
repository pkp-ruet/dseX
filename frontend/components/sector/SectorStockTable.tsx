"use client";

import { useMemo, useState } from "react";
import TierPill from "@/components/ui/TierPill";
import SignalChip from "@/components/ui/SignalChip";
import ScoreBadge from "@/components/ui/ScoreBadge";
import StarButton from "@/components/ui/StarButton";
import { DataTable, SortTh, Th, StockIdent, Price, Change } from "@/components/ui/Table";
import { pct } from "@/lib/formatters";
import type { SectorStockRow } from "@/lib/api";
import SectionHeader from "@/components/ui/SectionHeader";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import { sectorBn } from "@/lib/bn";

type SortCol = "score" | "trading_code" | "ltp" | "change_pct" | "return_7d_pct" | "pe" | "div_yield_pct";

/**
 * Every company in the sector, sortable. Score-descending by default, which is
 * the same order the rankings page uses.
 *
 * Rows with no score sort last whichever direction is picked — an unscored
 * company isn't "worst", it's unmeasured.
 */
export default function SectorStockTable({
  stocks,
  sectorName,
}: {
  stocks: SectorStockRow[];
  sectorName: string;
}) {
  const { lang } = useLang();
  const L = (en: string, bn: string) => (lang === "bn" ? bn : en);
  const [sort, setSort] = useState<SortCol>("score");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const rows = [...stocks];
    rows.sort((a, b) => {
      if (sort === "trading_code") {
        const cmp = a.trading_code.localeCompare(b.trading_code);
        return dir === "asc" ? cmp : -cmp;
      }
      const av = a[sort] as number | null;
      const bv = b[sort] as number | null;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return dir === "asc" ? av - bv : bv - av;
    });
    return rows;
  }, [stocks, sort, dir]);

  function onSort(col: SortCol) {
    if (col === sort) {
      setDir(dir === "asc" ? "desc" : "asc");
      return;
    }
    setSort(col);
    setDir(col === "trading_code" ? "asc" : "desc");
  }

  const th = { active: sort, dir, onSort };

  return (
    <section className="mb-8" id="companies">
      <SectionHeader
        title={
          <T
            en={`All ${stocks.length} ${sectorName} companies`}
            bn={`${sectorBn(sectorName)} সেক্টরের সব ${stocks.length}টি কোম্পানি`}
          />
        }
        className="mt-8"
      />

      <DataTable>
        <thead>
          <tr>
            <Th srLabel={L("Watchlist", "ওয়াচলিস্ট")} />
            <SortTh col="trading_code"  label={<T en="Share" bn="শেয়ার" />}  {...th} />
            <SortTh col="score"         label={<T en="Score" bn="স্কোর" />}  {...th} align="right" />
            <SortTh col="ltp"           label={<T en="Price" bn="দাম" />}  {...th} align="right" />
            <SortTh col="change_pct"    label={<T en="Today" bn="আজ" />}  {...th} align="right" />
            <SortTh col="return_7d_pct" label={<T en="7 days" bn="7 দিন" />} {...th} align="right" />
            <SortTh col="pe"            label={<T en="P/E" bn="পিই" />}    {...th} align="right" />
            <SortTh col="div_yield_pct" label={<T en="Yield" bn="ইল্ড" />}  {...th} align="right" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => (
            <tr key={s.trading_code}>
              <td data-cell="star">
                <StarButton code={s.trading_code} />
              </td>

              <td data-cell="ident">
                <StockIdent
                  code={s.trading_code}
                  name={s.company_name}
                  after={
                    <>
                      <SignalChip
                        signal={s.signal?.signal}
                        strength={s.signal?.strength}
                        reason={lang === "bn" ? s.signal?.reason_bn || s.signal?.reason_en : s.signal?.reason_en}
                      />
                      {s.stale_data && (
                        <span
                          title={L(
                            "Its latest accounts are more than two years old",
                            "সর্বশেষ আর্থিক হিসাব দুই বছরের বেশি পুরোনো",
                          )}
                          className="text-xs font-semibold text-text-muted"
                        >
                          <T en="old accounts" bn="পুরোনো হিসাব" />
                        </span>
                      )}
                    </>
                  }
                />
              </td>

              <td data-cell="score" className="dt-num">
                <span className="dt-score">
                  {s.tier && (
                    <span className="dt-tier"><TierPill tier={s.tier} /></span>
                  )}
                  <ScoreBadge score={s.score} tier={s.tier ?? undefined} size="sm" />
                </span>
              </td>

              <td data-cell="price" className="dt-num">
                <Price value={s.ltp} />
              </td>

              <td data-cell="change" className="dt-num">
                <Change value={s.change_pct} />
              </td>

              <td data-cell="meta" data-label={L("7 days", "7 দিন")} className="dt-num">
                <Change value={s.return_7d_pct} decimals={1} />
              </td>

              <td data-cell="meta" data-label={L("P/E", "পিই")} className="dt-num nums dt-muted">
                {s.pe != null ? s.pe.toFixed(1) : "—"}
              </td>

              <td data-cell="meta" data-label={L("Yield", "ইল্ড")} className="dt-num nums">
                {s.div_yield_pct ? pct(s.div_yield_pct, 1) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>

      <p className="mt-2.5 text-xs font-semibold text-text-muted">
        <T
          en="The score is our rating out of 100. It measures how strong the company is, not whether the price is about to move. Tap any column heading to sort again."
          bn="স্কোর হলো 100-এর মধ্যে আমাদের রেটিং। এটি কোম্পানি কতটা শক্তিশালী তা মাপে, দাম শিগগির বাড়বে কি না তা নয়। আবার সাজাতে যেকোনো কলামের শিরোনামে চাপ দিন।"
        />
      </p>
    </section>
  );
}
