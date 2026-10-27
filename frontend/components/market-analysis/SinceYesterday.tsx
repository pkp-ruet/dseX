import type { ReactNode } from "react";
import Link from "next/link";
import MkCard from "./MkCard";
import type { MarketNewName, MarketSinceYesterday, MarketStats } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import { bnDate, sectorBn } from "@/lib/bn";
import { T } from "@/components/i18n/T";

type Tone = "pos" | "neg" | "neutral" | "accent";

interface Item {
  key: string;
  tone: Tone;
  text: ReactNode;
  chips?: MarketNewName[];
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function Chips({ names }: { names: MarketNewName[] }) {
  return (
    <span className="mk-chips">
      {names.map((n) => (
        <Link key={n.trading_code} href={`/stock/${n.trading_code}`} className="mk-chip">
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
      text: (
        <T
          en={
            <>
              The market index is <b>{up ? "up" : "down"} {Math.abs(stats.dsex_change_pct).toFixed(1)}%</b>{" "}
              since yesterday&apos;s close.
            </>
          }
          bn={
            <>
              গতকালের সমাপনীর পর সূচক <b>{Math.abs(stats.dsex_change_pct).toFixed(1)}% {up ? "বেড়েছে" : "কমেছে"}</b>।
            </>
          }
        />
      ),
    });
  }

  const br = since.breadth_rank;
  if (br && br.of >= 3) {
    const better = br.better_than >= br.of / 2;
    items.push({
      key: "breadth",
      tone: better ? "pos" : "neg",
      text: better ? (
        <T
          en={
            <>
              <b>More shares rose today</b> than on {br.better_than} of the last {br.of} trading days.
            </>
          }
          bn={
            <>
              গত {br.of}টি লেনদেনের দিনের {br.better_than}টির চেয়ে <b>আজ বেশি শেয়ারের দাম বেড়েছে</b>।
            </>
          }
        />
      ) : (
        <T
          en={
            <>
              <b>Fewer shares rose today</b> than on {br.of - br.better_than} of the last {br.of} trading days.
            </>
          }
          bn={
            <>
              গত {br.of}টি লেনদেনের দিনের {br.of - br.better_than}টির চেয়ে <b>আজ কম শেয়ারের দাম বেড়েছে</b>।
            </>
          }
        />
      ),
    });
  }

  if (since.healthy_delta != null && since.healthy_delta !== 0) {
    const up = since.healthy_delta > 0;
    items.push({
      key: "healthy",
      tone: up ? "pos" : "neg",
      text: (
        <T
          en={
            <>
              <b>{plural(Math.abs(since.healthy_delta), "company", "companies")} {up ? "more" : "fewer"}</b> look
              healthy than yesterday. There are {since.healthy_now} now.
            </>
          }
          bn={
            <>
              গতকালের চেয়ে <b>{Math.abs(since.healthy_delta)}টি কোম্পানি {up ? "বেশি" : "কম"}</b> ভালো অবস্থায় আছে।
              এখন মোট {since.healthy_now}টি।
            </>
          }
        />
      ),
    });
  }

  if (since.cheap_delta != null && Math.abs(since.cheap_delta) >= 1 && stats.cheap_pct != null) {
    const more = since.cheap_delta > 0;
    items.push({
      key: "cheap",
      tone: more ? "pos" : "neg",
      text: (
        <T
          en={
            <>
              <b>{more ? "More" : "Fewer"} shares are cheap</b> than yesterday. That is about{" "}
              {Math.round(stats.cheap_pct)}% of the market now.
            </>
          }
          bn={
            <>
              গতকালের চেয়ে <b>{more ? "বেশি" : "কম"} শেয়ারের দাম কম</b>। এখন বাজারের প্রায়{" "}
              {Math.round(stats.cheap_pct)}%।
            </>
          }
        />
      ),
    });
  }

  if (since.sectors_up.length) {
    items.push({
      key: "sectors-up",
      tone: "pos",
      text: (
        <T
          en={
            <>
              <b>Now doing well:</b> {since.sectors_up.join(", ")}.
            </>
          }
          bn={
            <>
              <b>এখন ভালো করছে:</b> {since.sectors_up.map((s) => sectorBn(s)).join(", ")}।
            </>
          }
        />
      ),
    });
  }
  if (since.sectors_down.length) {
    items.push({
      key: "sectors-down",
      tone: "neg",
      text: (
        <T
          en={
            <>
              <b>Now under pressure:</b> {since.sectors_down.join(", ")}.
            </>
          }
          bn={
            <>
              <b>এখন চাপে আছে:</b> {since.sectors_down.map((s) => sectorBn(s)).join(", ")}।
            </>
          }
        />
      ),
    });
  }

  if (since.new_near_high.length) {
    items.push({
      key: "new-high",
      tone: "pos",
      text: (
        <b>
          <T en="Newly near their highest price of the year" bn="নতুন করে বছরের সর্বোচ্চ দামের কাছে" />
        </b>
      ),
      chips: since.new_near_high,
    });
  }
  if (since.new_near_low.length) {
    items.push({
      key: "new-low",
      tone: "neg",
      text: (
        <b>
          <T en="Newly near their lowest price of the year" bn="নতুন করে বছরের সর্বনিম্ন দামের কাছে" />
        </b>
      ),
      chips: since.new_near_low,
    });
  }
  if (since.new_unusual.length) {
    items.push({
      key: "new-unusual",
      tone: "accent",
      text: (
        <b>
          <T en="Unusual buying has just started" bn="অস্বাভাবিক কেনাকাটা সবে শুরু হয়েছে" />
        </b>
      ),
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
    <MkCard
      className="mt-6"
      id="mk-since-title"
      title={<T en="Since yesterday" bn="গতকালের পর থেকে" />}
      note={<T en="What changed today, compared with the last trading day." bn="আগের লেনদেনের দিনের তুলনায় আজ কী বদলেছে।" />}
      right={
        since.prev_date ? (
          <span className="mk-since-vs">
            <T en={`vs ${formatDate(since.prev_date)}`} bn={`${bnDate(since.prev_date)}-এর তুলনায়`} />
          </span>
        ) : undefined
      }
    >
      <ul className="mk-since-list">
        {items.map((it) => (
          <li className={`mk-since-item mk-since-item--${it.tone}`} key={it.key}>
            <span className="mk-since-dot" aria-hidden="true" />
            <span className="mk-since-text">
              {it.text}
              {it.chips && it.chips.length > 0 && <Chips names={it.chips} />}
            </span>
          </li>
        ))}
      </ul>
    </MkCard>
  );
}
