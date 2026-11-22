import { TBlock } from "@/components/i18n/T";
import ServiceGrid from "@/components/home/personalized/ServiceGrid";
import StoriesRow from "@/components/home/personalized/StoriesRow";
import MarketLine from "@/components/home/personalized/MarketLine";
import GuestTaps from "@/components/home/guest/GuestTaps";
import GuestBand from "@/components/home/guest/GuestBand";
import GuestSlot from "@/components/home/guest/GuestSlot";
import GuestOurs from "@/components/home/guest/GuestOurs";
import GuestToday from "@/components/home/guest/GuestToday";
import type { MarketIndexData, MarketStateData } from "@/lib/api";
import type { Story } from "@/lib/dash-stories";
import type { ExampleRow, GuestMoney, ShowcasePick, TodayRow } from "@/lib/guest-home";
import type { SampleView } from "@/lib/landing-portfolio";

export interface GuestHomeData {
  when: "today" | "last";
  money: GuestMoney | null;
  stories: { en: Story[]; bn: Story[] };
  marketIndex: MarketIndexData | null;
  market: MarketStateData | null;
  examples: ExampleRow[];
  today: TodayRow[];
  sample: SampleView | null;
  showcase: ShowcasePick | null;
  buyListNew: number;
}

/**
 * The guest home (2026-11-23, mockup v2
 * https://claude.ai/artifact/2rXAyT319sXtJXWBjE6rMG): a visitor who isn't
 * signed in lands on the signed-in home's own six blocks, in the same places
 * and with the same classes (`hm-*`, app/styles/home.css), so signing up only
 * fills the page in.
 *
 *   1 the band: what TopStockBD is, the ask, the sample portfolio as an
 *     example in the money spot, search                      (GuestBand)
 *   2 the icon grid, unchanged — every page in it is public  (ServiceGrid)
 *   3 today's market stories + a "Your shares" tour ring, the market line
 *   4 On your shares: three real rows from today, tagged Example (GuestOurs)
 *   5 the slot: portfolio check · first week free · a free analysis (GuestSlot)
 *   6 Today on TopStockBD: Buy List · strongest · results · dividends (GuestToday)
 *
 * Blocks built from components that take a language (grid, stories, market
 * line, slot) render once per language inside `TBlock`; the CSS shows one.
 * Everything here is server-rendered for search; `NewHere`, the sign-up band
 * and the guides follow it on the page.
 */
export default function GuestHome({ d }: { d: GuestHomeData }) {
  const badges = { buylist: d.buyListNew };
  return (
    <GuestTaps>
      <div className="hm-top">
        <GuestBand money={d.money} when={d.when} />
        <TBlock
          en={<ServiceGrid lang="en" premium={false} badges={badges} listId="hm-grid-list-en" />}
          bn={<ServiceGrid lang="bn" premium={false} badges={badges} listId="hm-grid-list-bn" />}
        />
      </div>

      <div className="hm-side">
        <div className="hm-stories" data-card="guest-stories">
          <TBlock
            en={<StoriesRow stories={d.stories.en} loading={false} quiet={false} starter userId={null} lang="en" />}
            bn={<StoriesRow stories={d.stories.bn} loading={false} quiet={false} starter userId={null} lang="bn" />}
          />
        </div>
        <TBlock
          className="hm-g-mkt"
          en={<MarketLine index={d.marketIndex} mood={d.market?.mood ?? null} history={d.market?.history ?? null} lang="en" />}
          bn={<MarketLine index={d.marketIndex} mood={d.market?.mood ?? null} history={d.market?.history ?? null} lang="bn" />}
        />
      </div>

      <GuestOurs rows={d.examples} />

      <div className="hm-slot hm-g-slot">
        <TBlock
          en={<GuestSlot lang="en" sample={d.sample} showcase={d.showcase} />}
          bn={<GuestSlot lang="bn" sample={d.sample} showcase={d.showcase} />}
        />
      </div>

      <GuestToday rows={d.today} />
    </GuestTaps>
  );
}
