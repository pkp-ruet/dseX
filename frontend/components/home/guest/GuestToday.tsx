import type { ComponentType } from "react";
import Link from "@/components/ui/Link";
import { T } from "@/components/i18n/T";
import { IconChevronRight, IconCrown } from "@/components/ui/icons";
import { PAGE_ICON } from "@/components/places/pageIcons";
import type { TodayIcon, TodayRow } from "@/lib/guest-home";

const ICON: Record<TodayIcon, ComponentType<{ size?: number }>> = {
  buylist: PAGE_ICON.buylist,
  rank: PAGE_ICON.companies,
  results: PAGE_ICON.results,
  calendar: PAGE_ICON.calendar,
};

/**
 * Block 6 for a guest: the signed-in "Today for you" rows (same card, same
 * row shape), worded for someone with no shares yet. "For you" needs shares,
 * so this week's results and dividends take its place.
 */
export default function GuestToday({ rows }: { rows: TodayRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section className="hm-today" aria-labelledby="guest-today-h">
      <div className="hm-head">
        <h2 className="hm-head-h" id="guest-today-h">
          <T en="Today on TopStockBD" bn="আজ TopStockBD-তে" />
        </h2>
      </div>
      <div className="hm-today-grid">
        <ul className="hm-tcard hm-sum">
          {rows.map((r) => {
            const Icon = ICON[r.icon];
            return (
              <li key={r.key}>
                <Link href={r.href} className="hm-srow" data-card={`guest-row-${r.key}`}>
                  <span className="hm-srow-ic" aria-hidden>
                    <Icon size={22} />
                    {r.premiumPage && (
                      <span className="hm-crown">
                        <IconCrown size={11} />
                      </span>
                    )}
                  </span>
                  <span className="hm-srow-txt">
                    <span className="hm-srow-title">
                      <T en={r.title.en} bn={r.title.bn} />
                      {r.fresh > 0 && (
                        <span className="hm-new nums">
                          <T en={`${r.fresh} new this week`} bn={`এ সপ্তাহে ${r.fresh}টি নতুন`} />
                        </span>
                      )}
                      {r.premiumPage && (
                        <span className="sr-only">
                          <T en=" · Premium" bn=" · প্রিমিয়াম" />
                        </span>
                      )}
                    </span>
                    <span className="hm-srow-cap">
                      <T en={r.caption.en} bn={r.caption.bn} />
                    </span>
                  </span>
                  <span className="hm-srow-num">
                    <b className="nums">{r.value}</b>
                    <span>
                      <T en={r.unit.en} bn={r.unit.bn} />
                    </span>
                  </span>
                  <span className="hm-chev" aria-hidden>
                    <IconChevronRight size={16} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
