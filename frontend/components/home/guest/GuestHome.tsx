import { TBlock } from "@/components/i18n/T";
import MarketLine from "@/components/home/personalized/MarketLine";
import GuestTaps from "@/components/home/guest/GuestTaps";
import GuestBand from "@/components/home/guest/GuestBand";
import GuestOurs from "@/components/home/guest/GuestOurs";
import GuestShares from "@/components/home/guest/GuestShares";
import type { MarketIndexData, MarketStateData } from "@/lib/api";
import type { ExampleRow, ExampleShare, GuestMoney } from "@/lib/guest-home";

export interface GuestHomeData {
  when: "today" | "last";
  money: GuestMoney | null;
  marketIndex: MarketIndexData | null;
  market: MarketStateData | null;
  examples: ExampleRow[];
  shares: ExampleShare[];
}

/**
 * The guest home (2026-11-23; four blocks since 2026-11-25, step 2 of the
 * simplify review): a visitor who isn't signed in lands on the signed-in
 * home's own blocks, in the same places and with the same classes (`hm-*`,
 * app/styles/home.css), so signing up only fills the page in.
 *
 *   1 the band: what TopStockBD is, the ask, the sample portfolio as an
 *     example in the money spot, search                      (GuestBand)
 *   2 New on your shares: three real rows from today, in the feed's own row,
 *     tagged Example                                         (GuestOurs)
 *   3 Your shares: the sample portfolio at today's prices    (GuestShares)
 *   4 the market in one line                                 (MarketLine)
 *
 * The icon grid, the market stories, the slot and "Today on TopStockBD" left
 * the same day as on the signed-in home. The market line takes a language,
 * so it renders once per language inside `TBlock`; the CSS shows one.
 * Everything here is server-rendered for search; `NewHere`, the sign-up band
 * and the guides follow it on the page.
 */
export default function GuestHome({ d }: { d: GuestHomeData }) {
  return (
    <GuestTaps>
      <div className="hm-top">
        <GuestBand money={d.money} when={d.when} />
      </div>
      <GuestOurs rows={d.examples} />
      <GuestShares rows={d.shares} />
      <div className="hm-mline">
        <TBlock
          en={<MarketLine index={d.marketIndex} mood={d.market?.mood ?? null} history={d.market?.history ?? null} lang="en" />}
          bn={<MarketLine index={d.marketIndex} mood={d.market?.mood ?? null} history={d.market?.history ?? null} lang="bn" />}
        />
      </div>
    </GuestTaps>
  );
}
