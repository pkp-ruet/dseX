import { TBlock } from "@/components/i18n/T";
import MarketLine from "@/components/home/personalized/MarketLine";
import GuestTaps from "@/components/home/guest/GuestTaps";
import GuestBand from "@/components/home/guest/GuestBand";
import GuestShares from "@/components/home/guest/GuestShares";
import Shortcuts from "@/components/home/daily/Shortcuts";
import WeekOnDse from "@/components/home/daily/WeekOnDse";
import TodaysLists from "@/components/home/daily/TodaysLists";
import { shortcutBadges } from "@/lib/home-today";
import type { HomeToday, MarketIndexData, MarketStateData } from "@/lib/api";
import type { ExampleShare, GuestMoney } from "@/lib/guest-home";

export interface GuestHomeData {
  when: "today" | "last";
  money: GuestMoney | null;
  marketIndex: MarketIndexData | null;
  market: MarketStateData | null;
  shares: ExampleShare[];
  /** `/api/home/today`: the week strip, today's lists, the shortcut numbers. */
  today: HomeToday | null;
  todayIso: string;
}

/**
 * The guest home (2026-11-23; four blocks since 2026-11-25, step 2 of the
 * simplify review): a visitor who isn't signed in lands on the signed-in
 * home's own blocks, in the same places and with the same classes (`hm-*`,
 * app/styles/home.css), so signing up only fills the page in.
 *
 *   1 the band: what TopStockBD is, the ask, the sample portfolio as an
 *     example in the money spot, search                      (GuestBand)
 *   2 Your shares: the sample portfolio at today's prices    (GuestShares)
 *   3 the market in one line                                 (MarketLine)
 *
 * The icon grid, the market stories, the slot and "Today on TopStockBD" left
 * the same day as on the signed-in home. The fuller home (later the same
 * day) brought back, as on the signed-in home: the eight shortcuts under the
 * band, "This week on the DSE" and "Today's lists" after the market line —
 * real daily content on the page search sees. Recently opened and Explore
 * stay signed-in only (`NewHere` below does Explore's job for a visitor).
 * "New on your shares" (`GuestOurs`, three example rows) left the same
 * evening with the signed-in block. The market line takes a language, so it
 * renders once per language inside `TBlock`; the CSS shows one.
 * Everything here is server-rendered for search; `NewHere`, the sign-up band
 * and the guides follow it on the page.
 */
export default function GuestHome({ d }: { d: GuestHomeData }) {
  const badges = d.today && d.today.as_of === d.todayIso ? shortcutBadges(d.today) : {};
  const today = d.today && d.today.as_of === d.todayIso ? d.today : null;
  return (
    <GuestTaps>
      <div className="hm-top">
        <GuestBand money={d.money} when={d.when} />
      </div>
      <TBlock
        en={<Shortcuts lang="en" badges={badges} crowns />}
        bn={<Shortcuts lang="bn" badges={badges} crowns />}
      />
      <GuestShares rows={d.shares} />
      <div className="hm-mline">
        <TBlock
          en={<MarketLine index={d.marketIndex} mood={d.market?.mood ?? null} history={d.market?.history ?? null} lang="en" />}
          bn={<MarketLine index={d.marketIndex} mood={d.market?.mood ?? null} history={d.market?.history ?? null} lang="bn" />}
        />
      </div>
      {today?.days && (
        <TBlock
          en={<WeekOnDse lang="en" days={today.days} todayIso={d.todayIso} />}
          bn={<WeekOnDse lang="bn" days={today.days} todayIso={d.todayIso} />}
        />
      )}
      {today && (
        <TBlock
          en={<TodaysLists lang="en" data={today} premium={false} />}
          bn={<TodaysLists lang="bn" data={today} premium={false} />}
        />
      )}
    </GuestTaps>
  );
}
