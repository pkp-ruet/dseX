"use client";

import { useMemo, useState } from "react";
import type { ResearchColumn, ResearchStock } from "@/lib/api";
import { useLang } from "@/context/LangContext";
import { T } from "@/components/i18n/T";
import { formatResearchMetric as fmt } from "@/lib/research-lists";
import { DataTable, SortTh, StockIdent, Th, type SortDir } from "@/components/ui/Table";
import ScoreBadge from "@/components/ui/ScoreBadge";
import { PersonalMark } from "@/components/market-analysis/PersonalCodes";

/**
 * Every stock on the list side by side on the list's own numbers, sortable.
 * Phones get the `.data-table` card dissolve: name + score on line 1, the
 * list's figures as captioned cells on line 2.
 */
export default function ResearchCompare({ columns, stocks }: { columns: ResearchColumn[]; stocks: ResearchStock[] }) {
  const { bn } = useLang();
  const [sort, setSort] = useState<string>("rank");
  const [dir, setDir] = useState<SortDir>("asc");
  const metricCols = columns.filter((c) => c.key !== "score");

  const rows = useMemo(() => {
    const val = (s: ResearchStock): number =>
      sort === "rank" ? s.rank : sort === "score" ? s.score ?? -Infinity : s.metrics[sort] ?? -Infinity;
    return [...stocks].sort((a, b) => (dir === "asc" ? val(a) - val(b) : val(b) - val(a)));
  }, [stocks, sort, dir]);

  const onSort = (col: string) => {
    if (col === sort) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSort(col);
      setDir(col === "rank" ? "asc" : "desc");
    }
  };
  // `data-label` is an attribute, so it follows useLang(); visible headers are <T>.
  const label = (c: ResearchColumn) => (bn ? c.label_bn : c.label_en);

  return (
    <DataTable>
      <thead>
        <tr>
          <SortTh col="rank" label="#" active={sort} dir={dir} onSort={onSort} />
          <Th><T en="Company" bn="কোম্পানি" /></Th>
          <SortTh col="score" label={<T en="Score" bn="স্কোর" />} active={sort} dir={dir} onSort={onSort} align="right" />
          {metricCols.map((c) => (
            <SortTh key={c.key} col={c.key} label={<T en={c.label_en} bn={c.label_bn} />} active={sort} dir={dir} onSort={onSort} align="right" />
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((s) => (
          <tr key={s.code}>
            <td data-cell="rank" className="dt-muted nums">{s.rank}</td>
            <td data-cell="ident">
              <StockIdent code={s.code} name={s.name} after={<PersonalMark code={s.code} />} />
            </td>
            <td data-cell="score" className="dt-num">
              <span className="dt-score"><ScoreBadge score={s.score} size="sm" /></span>
            </td>
            {metricCols.map((c) => {
              const f = fmt(c, s.metrics[c.key]);
              return (
                <td key={c.key} data-cell="meta" data-label={label(c)} className={`dt-num nums ${f.cls}`.trim()}>
                  <T en={f.text} bn={f.textBn} />
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </DataTable>
  );
}
