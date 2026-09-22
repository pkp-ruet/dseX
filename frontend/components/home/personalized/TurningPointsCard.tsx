import type { MarketTurningStock, MarketUnusualStock } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { t } from "@/lib/home-copy";
import { ACC } from "@/components/home/personalized/accents";
import DashHeader from "@/components/home/personalized/DashHeader";
import OwnerMark from "@/components/home/personalized/OwnerMark";
import { IconArrowDown, IconArrowUp, IconRocket, IconTarget } from "@/components/home/personalized/DashIcons";
import StockRow, { type StockRowTone } from "@/components/ui/StockRow";

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
  tone,
  rows,
  held,
  watched,
  lang,
}: {
  title: string;
  icon: React.ReactNode;
  tone: StockRowTone;
  rows: Row[];
  held: Set<string>;
  watched: Set<string>;
  lang: Lang;
}) {
  if (rows.length === 0) return null;
  const ico: Record<StockRowTone, string> = {
    positive: "text-positive bg-positive/10",
    negative: "text-negative bg-negative/10",
    watch: "text-watch bg-watch/10",
    info: "text-info bg-info/10",
    primary: "text-primary bg-primary/10",
    muted: "text-text-muted bg-surface-2",
  };
  return (
    <div className="min-w-0 pb-1">
      <div className="flex items-center gap-2 px-4 pt-3 sm:px-5">
        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md ${ico[tone]}`} aria-hidden>
          {icon}
        </span>
        <h3 className="text-xs font-extrabold uppercase tracking-[0.1em] text-text-main">{title}</h3>
      </div>
      <ul className="mt-1 divide-y divide-cell-rule">
        {rows.map((r) => (
          <StockRow
            key={r.code}
            code={r.code}
            name={r.name}
            lang={lang}
            mark={<OwnerMark code={r.code} held={held} watched={watched} lang={lang} />}
            sub={<span className="font-medium">{r.meta}</span>}
            subTone={tone}
            price={r.price}
          />
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
      <DashHeader title={t(lang, "turningTitle")} href="/market-analysis" linkLabel={t(lang, "fullPicture")} accent={ACC.amber} icon={<IconTarget size={15} />} />
      {/* Stacked on a phone the three groups ran together — a hairline between
          them replaces the column rules that only exist from md up. */}
      <div className="grid grid-cols-1 divide-y divide-cell-rule pb-1 md:grid-cols-3 md:divide-x md:divide-y-0">
        <Group title={t(lang, "nearHigh")} icon={<IconArrowUp size={14} />} tone="positive" rows={hi} held={held} watched={watched} lang={lang} />
        <Group title={t(lang, "nearLow")} icon={<IconArrowDown size={14} />} tone="negative" rows={lo} held={held} watched={watched} lang={lang} />
        <Group title={t(lang, "unusual")} icon={<IconRocket size={14} />} tone="primary" rows={un} held={held} watched={watched} lang={lang} />
      </div>
    </section>
  );
}
