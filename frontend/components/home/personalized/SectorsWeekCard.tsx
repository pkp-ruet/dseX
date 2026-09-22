"use client";

import { useState } from "react";
import Link from "next/link";
import type { MarketSectorRow } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { sectorBn } from "@/lib/bn";
import { SectorIcon } from "@/lib/sector-icons";
import { t } from "@/lib/home-copy";
import { ACC } from "@/components/home/personalized/accents";
import { IconList } from "@/components/home/personalized/DashIcons";
import DashHeader from "@/components/home/personalized/DashHeader";

const INITIAL = 8;

/**
 * Every DSE sector as one row: icon, name, a centred bar for the week's move
 * (green right / red left) with a dot for the month, and the week figure.
 * Sorted best week first. Rows link to the sector page when one exists.
 * Eight rows show; the rest open on "Show all".
 */
export default function SectorsWeekCard({ sectors, lang = "en" }: { sectors: MarketSectorRow[]; lang?: Lang }) {
  const [open, setOpen] = useState(false);
  const bn = lang === "bn";
  const rows = [...sectors].sort((a, b) => b.ret_1w - a.ret_1w);
  if (rows.length === 0) return null;
  const shown = open ? rows : rows.slice(0, INITIAL);
  // Bar scale: the biggest weekly move on the board, never under 3% so a flat
  // week does not draw hairline moves as full bars.
  const scale = Math.max(3, ...rows.map((s) => Math.abs(s.ret_1w)), ...rows.map((s) => Math.abs(s.ret_1m ?? 0)));
  const half = (v: number) => `${Math.min(50, (Math.abs(v) / scale) * 50)}%`;
  const dotLeft = (v: number) => `${Math.min(97, Math.max(3, 50 + (Math.max(-scale, Math.min(scale, v)) / scale) * 47))}%`;

  return (
    <section className={`soft-card overflow-hidden ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
      <DashHeader title={t(lang, "sectorsTitle")} href="/sectors" linkLabel={t(lang, "allSectors")} accent={ACC.steel} icon={<IconList size={15} />} />
      <p className="px-4 pt-2.5 text-xs font-semibold text-text-muted sm:px-5">{t(lang, "weekDotLegend")}</p>
      <ul className="mt-1 divide-y divide-cell-rule">
        {shown.map((s) => {
          const up = s.ret_1w >= 0;
          const color = up ? "var(--positive)" : "var(--negative)";
          const inner = (
            <>
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-text-muted"
                style={{ background: "var(--surface-2)" }}
                aria-hidden
              >
                <SectorIcon sector={s.name} size={17} />
              </span>
              {/* basis, not width+shrink-0: a shrink-0 item with a percentage
                  width demands its max-content during intrinsic sizing, and a
                  name like "Pharmaceuticals & Chemicals" then made the whole
                  row wider than a 360px phone. Same 34% on screen. */}
              <span className="min-w-0 shrink basis-[34%]">
                <span className="block truncate text-sm font-bold leading-tight text-text-main">
                  {bn ? sectorBn(s.name) : s.name}
                </span>
                <span className="block text-xs font-medium text-text-muted">
                  {t(lang, "companiesN", { n: s.count })}
                </span>
              </span>
              <span className="relative h-2 min-w-0 flex-1 rounded-full bg-surface-2" aria-hidden>
                <span className="absolute inset-y-0 left-1/2 w-px bg-border" />
                <span
                  className="absolute inset-y-0 rounded-full"
                  style={up ? { left: "50%", width: half(s.ret_1w), background: color } : { right: "50%", width: half(s.ret_1w), background: color }}
                />
                {s.ret_1m != null && (
                  <span
                    className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface"
                    style={{ left: dotLeft(s.ret_1m), background: "var(--text)" }}
                    title={`${t(lang, "month")} ${s.ret_1m >= 0 ? "+" : ""}${s.ret_1m.toFixed(1)}%`}
                  />
                )}
              </span>
              <span className="w-14 shrink-0 text-right text-sm font-bold tabular-nums nums" style={{ color }}>
                {up ? "+" : ""}
                {s.ret_1w.toFixed(1)}%
              </span>
            </>
          );
          const cls = "flex items-center gap-3 px-4 py-2 sm:px-5";
          return (
            <li key={s.name}>
              {s.slug ? (
                <Link
                  prefetch={false}
                  href={`/sector/${s.slug}`}
                  className={`${cls} transition-colors hover:bg-surface-2 active:bg-surface-2`}
                >
                  {inner}
                </Link>
              ) : (
                <div className={cls}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
      {rows.length > INITIAL && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="block w-full border-t border-border px-4 py-2.5 text-center text-xs font-semibold text-primary transition-colors hover:bg-surface-2 active:bg-surface-2"
        >
          {open ? t(lang, "showFewer") : t(lang, "showAll", { n: rows.length })}
        </button>
      )}
    </section>
  );
}
