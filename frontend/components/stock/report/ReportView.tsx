"use client";

import StockChapter from "@/components/stock/StockChapter";
import WatchlistButton from "@/components/stock/WatchlistButton";
import BuyBelowAlert from "@/components/stock/report/BuyBelowAlert";
import { money, tx } from "@/components/stock/report/fmt";
import { T } from "@/components/i18n/T";
import { trackEvent } from "@/lib/track";
import { VIEW_CHAPTER, type Bi, type ReportView as View } from "@/lib/stock-report";

function List({ items, mark, tone }: { items: Bi[]; mark: string; tone: "good" | "bad" | "info" }) {
  return (
    <ul>
      {items.map((b, i) => (
        <li key={i}>
          <span className="vw-mark" data-tone={tone} aria-hidden="true">{mark}</span>
          <span>{tx(b)}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Our view (`#ch-view`, 2026-10-30, the full report plan
 * https://claude.ai/artifact/1TuJ9dvifeXTLzs5wVwk2Q): where the report ends.
 * The answer again, the case for and the case against, what would change our
 * answer (the Buy signal's own lines turned into prices and events — the
 * backend's `build_view`), our buy price with an alert, and "watch this
 * report" (following the share brings one push when the answer changes).
 * Premium, like the whole report (2026-11-01, `ReportGate`).
 */
export default function ReportView({
  view,
  code,
  ltp,
  w52High,
  w52Low,
}: {
  view: View;
  code: string;
  ltp: number | null;
  w52High?: number | null;
  w52Low?: number | null;
}) {
  const body = (
    <div className="soft-card p-5 sm:p-6">
      <p className="vw-head">{tx(view.headline)}</p>
      <div className="vw-cases">
        <div className="vw-case">
          <h3><T en="The case for" bn="পক্ষে যুক্তি" /></h3>
          <List items={view.for} mark="✓" tone="good" />
        </div>
        <div className="vw-case">
          <h3><T en="The case against" bn="বিপক্ষে যুক্তি" /></h3>
          <List items={view.against} mark="!" tone="bad" />
        </div>
      </div>
      {view.change.length > 0 && (
        <div className="vw-block">
          <h3><T en="What would change our answer" bn="কী হলে আমাদের উত্তর বদলাবে" /></h3>
          <List items={view.change} mark="→" tone="info" />
        </div>
      )}
      {view.buy_price != null && (
        <div
          className="vw-block vw-row"
          onClickCapture={() => trackEvent("report_view_alert", { code, kind: "buy_price" })}
        >
          <p className="font-bold">
            <T en={`Our buy price: under ${money(view.buy_price)}`} bn={`আমাদের কেনার দাম: ${money(view.buy_price)}-এর নিচে`} />
          </p>
          <BuyBelowAlert code={code} target={view.buy_price} ltp={ltp} w52High={w52High} w52Low={w52Low} />
        </div>
      )}
      <div className="vw-block vw-row" onClickCapture={() => trackEvent("report_view_alert", { code, kind: "follow" })}>
        <p>
          <T
            en="Watch this report: follow the share and we send one notification when our answer changes, a red flag appears or new results land."
            bn="এই রিপোর্টের ওপর নজর রাখুন। শেয়ারটি ফলো করলে আমাদের উত্তর বদলালে, নতুন কোনো বড় সতর্কতা দেখা দিলে বা নতুন ফল প্রকাশ হলে আমরা আপনাকে একটি নোটিফিকেশন পাঠাব।"
          />
        </p>
        <WatchlistButton code={code} />
      </div>
    </div>
  );

  return (
    <StockChapter
      id={VIEW_CHAPTER.id}
      fold={false}
      title={<T en="Our view" bn="আমাদের মত" />}
      lead={
        <T
          en="Everything above, put together: the case for, the case against, and what would change our answer."
          bn="ওপরের সব কথা এক জায়গায়: পক্ষে যুক্তি, বিপক্ষে যুক্তি, আর কী হলে আমাদের উত্তর বদলাবে।"
        />
      }
    >
      {body}
    </StockChapter>
  );
}
