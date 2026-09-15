import Link from "next/link";
import type { MarketTurningStock, MarketUnusualStock } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { money } from "@/lib/formatters";
import { t } from "@/lib/home-copy";
import DashHeader from "@/components/home/personalized/DashHeader";
import OwnerMark from "@/components/home/personalized/OwnerMark";
import { IconArrowDown, IconArrowUp, IconRocket } from "@/components/home/personalized/DashIcons";

const ROWS = 3;

interface Row {
  code: string;
  name: string | null;
  meta: string;
  price: number | null;
}

function Group({
  title,
  icon,
  color,
  rows,
  held,
  watched,
  lang,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  rows: Row[];
  held: Set<string>;
  watched: Set<string>;
  lang: Lang;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="min-w-0 pb-1">
      <div className="flex items-center gap-2 px-4 pt-3 sm:px-5">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md" style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)` }} aria-hidden>
          {icon}
        </span>
        <h3 className="text-[0.75rem] font-extrabold uppercase tracking-[0.1em] text-[var(--text)]">{title}</h3>
      </div>
      <ul className="mt-1 divide-y divide-[var(--cell-rule)]">
        {rows.map((r) => (
          <li key={r.code}>
            <Link
              prefetch={false}
              href={`/stock/${r.code}`}
              className="flex items-center gap-3 px-4 py-2 transition-colors hover:bg-[var(--surface-2)] active:bg-[var(--surface-2)] sm:px-5"
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[0.86rem] font-bold leading-tight text-[var(--text)]">{r.name ?? r.code}</span>
                  <OwnerMark code={r.code} held={held} watched={watched} lang={lang} />
                </span>
                <span className="block text-[0.72rem] font-medium" style={{ color }}>
                  {r.meta}
                </span>
              </span>
              <span className="shrink-0 text-[0.84rem] font-bold tabular-nums nums text-[var(--text)]">{money(r.price)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * "Worth watching": stocks near their yearly high, near their yearly low, and
 * with unusual buying — three groups of three from the market bundle. On a
 * phone they stack; on a wide card they sit side by side.
 */
export default function TurningPointsCard({
  nearHigh,
  nearLow,
  unusual,
  held,
  watched,
  lang = "en",
}: {
  nearHigh: MarketTurningStock[];
  nearLow: MarketTurningStock[];
  unusual: MarketUnusualStock[];
  held: Set<string>;
  watched: Set<string>;
  lang?: Lang;
}) {
  const bn = lang === "bn";
  const hi: Row[] = nearHigh.slice(0, ROWS).map((s) => ({
    code: s.trading_code,
    name: s.company_name,
    meta: t(lang, "fromHigh", { n: Math.abs(s.gap_pct).toFixed(1) }),
    price: s.last_price ?? null,
  }));
  const lo: Row[] = nearLow.slice(0, ROWS).map((s) => ({
    code: s.trading_code,
    name: s.company_name,
    meta: t(lang, "aboveLow", { n: Math.abs(s.gap_pct).toFixed(1) }),
    price: s.last_price ?? null,
  }));
  const un: Row[] = unusual.slice(0, ROWS).map((s) => ({
    code: s.trading_code,
    name: s.company_name,
    meta: t(lang, "volumeX", { n: s.volume_ratio.toFixed(1) }),
    price: s.last_price ?? null,
  }));
  if (hi.length + lo.length + un.length === 0) return null;

  return (
    <section className={`soft-card overflow-hidden ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
      <DashHeader title={t(lang, "turningTitle")} href="/market-analysis" linkLabel={t(lang, "fullPicture")} />
      {/* Stacked on a phone the three groups ran together — a hairline between
          them replaces the column rules that only exist from md up. */}
      <div className="grid grid-cols-1 divide-y divide-[var(--cell-rule)] pb-1 md:grid-cols-3 md:divide-x md:divide-y-0">
        <Group title={t(lang, "nearHigh")} icon={<IconArrowUp size={14} />} color="var(--positive)" rows={hi} held={held} watched={watched} lang={lang} />
        <Group title={t(lang, "nearLow")} icon={<IconArrowDown size={14} />} color="var(--negative)" rows={lo} held={held} watched={watched} lang={lang} />
        <Group title={t(lang, "unusual")} icon={<IconRocket size={14} />} color="var(--primary)" rows={un} held={held} watched={watched} lang={lang} />
      </div>
    </section>
  );
}
