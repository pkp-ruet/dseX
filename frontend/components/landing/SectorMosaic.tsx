import Link from "next/link";
import { T } from "@/components/i18n/T";
import { sectorBn } from "@/lib/bn";
import { SectorIcon } from "@/lib/sector-icons";
import type { MarketSectorRow } from "@/lib/api";

/**
 * The whole market as one coloured map: a tile per sector, bigger tiles for
 * bigger sectors, green for a week up and red for a week down.
 *
 * Deliberately not the Recharts `SectorHeatmap` used on /dse-today: its
 * ResponsiveContainer measures the browser before drawing, so the server HTML
 * — what Google gets on this page — would carry no sectors at all. These tiles
 * are plain links and render on the server.
 *
 * Colour ramp mirrors SectorHeatmap's (the two locked market tokens mixed
 * toward the surface), with the cut-offs widened for a week's move instead of
 * a day's.
 */

const SHOWN = 12;

const mix = (token: string, pct: number) => `color-mix(in srgb, var(${token}) ${pct}%, var(--surface))`;

function tileColor(pct: number): string {
  if (pct > 4) return mix("--positive", 100);
  if (pct > 1.5) return mix("--positive", 68);
  if (pct > 0) return mix("--positive", 26);
  if (pct > -1.5) return mix("--negative", 26);
  if (pct > -4) return mix("--negative", 68);
  return mix("--negative", 100);
}

/** Light (26%) tiles take dark ink; the saturated ones take surface-white. */
function tileInk(pct: number): string {
  return Math.abs(pct) > 1.5 ? "var(--surface)" : "var(--text)";
}

/** Largest two sectors are 2×2, the next four 2×1, the rest 1×1. */
function span(rank: number): string {
  if (rank < 2) return "col-span-2 row-span-2";
  if (rank < 6) return "col-span-2";
  return "";
}

const LEGEND: { pct: number; label: string; labelBn: string }[] = [
  { pct: -5, label: "Down a lot", labelBn: "অনেক কমেছে" },
  { pct: -1, label: "Down a little", labelBn: "সামান্য কমেছে" },
  { pct: 1, label: "Up a little", labelBn: "সামান্য বেড়েছে" },
  { pct: 5, label: "Up a lot", labelBn: "অনেক বেড়েছে" },
];

export default function SectorMosaic({ sectors }: { sectors: MarketSectorRow[] }) {
  const rows = sectors
    .filter((s) => s.name && Number.isFinite(s.ret_1w))
    .sort((a, b) => b.count - a.count);
  if (rows.length === 0) return null;
  const shown = rows.slice(0, SHOWN);
  const more = rows.length - shown.length;
  const up = rows.filter((s) => s.ret_1w > 0).length;

  return (
    <section className="soft-card overflow-hidden p-3 sm:p-4" aria-labelledby="sector-map-title">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1">
        <h3 id="sector-map-title" className="text-base font-bold text-text-main">
          <T en="This week, sector by sector" bn="এ সপ্তাহে, সেক্টর ধরে ধরে" />
        </h3>
        <p className="text-sm font-semibold text-text-muted">
          <span className="text-positive">
            <T en={`${up} up`} bn={`${up}টি বেড়েছে`} />
          </span>{" "}
          ·{" "}
          <span className="text-negative">
            <T en={`${rows.length - up} down`} bn={`${rows.length - up}টি কমেছে`} />
          </span>
        </p>
      </div>
      <p className="px-1 text-sm text-text-muted">
        <T
          en="A bigger tile means a bigger sector. Green means prices rose this week; red means they fell."
          bn="বড় ঘর মানে বড় সেক্টর। সবুজ মানে এ সপ্তাহে দাম বেড়েছে, লাল মানে কমেছে।"
        />
      </p>

      <ul className="mt-3 grid grid-flow-dense auto-rows-[4.25rem] grid-cols-4 gap-1.5 sm:grid-cols-6 lg:grid-cols-8">
        {shown.map((s, i) => {
          const ink = tileInk(s.ret_1w);
          const big = i < 2;
          const body = (
            <>
              <span className="flex items-start justify-between gap-1">
                <span
                  className={`min-w-0 font-bold leading-tight ${big ? "line-clamp-2 text-sm" : "line-clamp-2 text-xs"}`}
                >
                  <T en={s.name} bn={sectorBn(s.name)} />
                </span>
                {big && (
                  <span className="shrink-0 opacity-80" aria-hidden>
                    <SectorIcon sector={s.name} size={18} />
                  </span>
                )}
              </span>
              <span className={`font-extrabold tabular-nums nums ${big ? "text-xl" : "text-sm"}`}>
                {s.ret_1w > 0 ? "+" : ""}
                {s.ret_1w.toFixed(1)}%
              </span>
            </>
          );
          const cls =
            "flex h-full flex-col justify-between overflow-hidden rounded-lg p-2 transition-transform";
          const style = { background: tileColor(s.ret_1w), color: ink };
          return (
            <li key={s.name} className={span(i)}>
              {s.slug ? (
                <Link
                  href={`/sector/${s.slug}`}
                  prefetch={false}
                  className={`${cls} hover:brightness-95 active:scale-95`}
                  style={style}
                  title={`${s.name}: ${s.count} companies`}
                >
                  {body}
                </Link>
              ) : (
                <div className={cls} style={style} title={`${s.name}: ${s.count} companies`}>
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-semibold text-text-muted">
          {LEGEND.map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm" style={{ background: tileColor(l.pct) }} aria-hidden />
              <T en={l.label} bn={l.labelBn} />
            </span>
          ))}
        </div>
        <Link href="/sectors" className="text-sm font-bold text-primary-ink hover:underline">
          {more > 0 ? (
            <T en={`All ${rows.length} sectors →`} bn={`সব ${rows.length}টি সেক্টর →`} />
          ) : (
            <T en="All sectors →" bn="সব সেক্টর →" />
          )}
        </Link>
      </div>
    </section>
  );
}
