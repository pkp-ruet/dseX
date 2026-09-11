import type { ReactNode } from "react";
import Link from "next/link";
import Bn from "@/components/i18n/Bn";
import {
  IconArrowDown,
  IconArrowUp,
  IconSparkle,
  IconTag,
  IconTrendDown,
  IconTrendUp,
} from "@/components/home/personalized/DashIcons";
import type { MarketNewName, MarketSinceYesterday, MarketStats } from "@/lib/api";
import { formatDate } from "@/lib/formatters";

type Tone = "pos" | "neg" | "neutral" | "accent";

interface Item {
  key: string;
  tone: Tone;
  icon: ReactNode;
  text: ReactNode;
  chips?: MarketNewName[];
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function Chips({ names }: { names: MarketNewName[] }) {
  return (
    <span className="ms-chips">
      {names.map((n) => (
        <Link key={n.trading_code} href={`/stock/${n.trading_code}`} className="ms-chip">
          {n.trading_code}
        </Link>
      ))}
    </span>
  );
}

function buildItems(since: MarketSinceYesterday, stats: MarketStats): Item[] {
  const items: Item[] = [];

  if (stats.dsex_change_pct != null && Math.abs(stats.dsex_change_pct) >= 0.05) {
    const up = stats.dsex_change_pct > 0;
    items.push({
      key: "index",
      tone: up ? "pos" : "neg",
      icon: up ? <IconTrendUp size={16} /> : <IconTrendDown size={16} />,
      text: (
        <>
          The market index is <b>{up ? "up" : "down"} {Math.abs(stats.dsex_change_pct).toFixed(1)}%</b>{" "}
          since yesterday&apos;s close.
        </>
      ),
    });
  }

  const br = since.breadth_rank;
  if (br && br.of >= 3) {
    const better = br.better_than >= br.of / 2;
    items.push({
      key: "breadth",
      tone: better ? "pos" : "neg",
      icon: better ? <IconArrowUp size={16} /> : <IconArrowDown size={16} />,
      text: better ? (
        <>
          <b>More shares rose today</b> than on {br.better_than} of the last {br.of} trading days.
        </>
      ) : (
        <>
          <b>Fewer shares rose today</b> than on {br.of - br.better_than} of the last {br.of} trading days.
        </>
      ),
    });
  }

  if (since.healthy_delta != null && since.healthy_delta !== 0) {
    const up = since.healthy_delta > 0;
    items.push({
      key: "healthy",
      tone: up ? "pos" : "neg",
      icon: up ? <IconArrowUp size={16} /> : <IconArrowDown size={16} />,
      text: (
        <>
          <b>{plural(Math.abs(since.healthy_delta), "company", "companies")} {up ? "more" : "fewer"}</b> look
          healthy than yesterday — {since.healthy_now} now.
        </>
      ),
    });
  }

  if (since.cheap_delta != null && Math.abs(since.cheap_delta) >= 1 && stats.cheap_pct != null) {
    const more = since.cheap_delta > 0;
    items.push({
      key: "cheap",
      tone: more ? "pos" : "neg",
      icon: <IconTag size={16} />,
      text: (
        <>
          <b>{more ? "More" : "Fewer"} shares are cheap</b> than yesterday — about {Math.round(stats.cheap_pct)}% of
          the market now.
        </>
      ),
    });
  }

  if (since.sectors_up.length) {
    items.push({
      key: "sectors-up",
      tone: "pos",
      icon: <IconTrendUp size={16} />,
      text: (
        <>
          <b>Now doing well:</b> {since.sectors_up.join(", ")}.
        </>
      ),
    });
  }
  if (since.sectors_down.length) {
    items.push({
      key: "sectors-down",
      tone: "neg",
      icon: <IconTrendDown size={16} />,
      text: (
        <>
          <b>Now struggling:</b> {since.sectors_down.join(", ")}.
        </>
      ),
    });
  }

  if (since.new_on_sale.length) {
    items.push({
      key: "new-on-sale",
      tone: "accent",
      icon: <IconTag size={16} />,
      text: <b>New on the &ldquo;good companies on sale&rdquo; list</b>,
      chips: since.new_on_sale,
    });
  }
  if (since.new_near_high.length) {
    items.push({
      key: "new-high",
      tone: "pos",
      icon: <IconArrowUp size={16} />,
      text: <b>New at a one-year high</b>,
      chips: since.new_near_high,
    });
  }
  if (since.new_near_low.length) {
    items.push({
      key: "new-low",
      tone: "neg",
      icon: <IconArrowDown size={16} />,
      text: <b>New at a one-year low</b>,
      chips: since.new_near_low,
    });
  }
  if (since.new_unusual.length) {
    items.push({
      key: "new-unusual",
      tone: "accent",
      icon: <IconSparkle size={16} />,
      text: <b>Unusual buying just started</b>,
      chips: since.new_unusual,
    });
  }

  return items;
}

/**
 * "Since yesterday" — what changed against the previous trading day, built
 * from the stored daily snapshots. Gives a returning reader a reason to come
 * back tomorrow. Renders nothing when there is nothing to say.
 */
export default function SinceYesterday({
  since,
  stats,
}: {
  since: MarketSinceYesterday;
  stats: MarketStats;
}) {
  const items = buildItems(since, stats);
  if (items.length === 0) return null;
  return (
    <section className="ms-card ms-since" aria-labelledby="ms-since-title">
      <div className="ms-since-head">
        <div>
          <p className="ms-card-title" id="ms-since-title" style={{ marginBottom: 2 }}>
            Since yesterday
          </p>
          <Bn className="ms-since-bn">গতকালের তুলনায় আজ কী বদলেছে</Bn>
        </div>
        {since.prev_date && <span className="ms-since-vs">vs {formatDate(since.prev_date)}</span>}
      </div>
      <ul className="ms-since-list">
        {items.map((it) => (
          <li className={`ms-since-item ms-since-item--${it.tone}`} key={it.key}>
            <span className="ms-since-ico" aria-hidden="true">
              {it.icon}
            </span>
            <span className="ms-since-text">
              {it.text}
              {it.chips && it.chips.length > 0 && <Chips names={it.chips} />}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
