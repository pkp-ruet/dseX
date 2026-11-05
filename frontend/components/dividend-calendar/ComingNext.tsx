import ExpandRow from "@/components/dividend-calendar/ExpandRow";
import Button from "@/components/ui/Button";
import { T } from "@/components/i18n/T";
import CalendarFold from "@/components/dividend-calendar/CalendarFold";
import PanelHead from "@/components/dividend-calendar/PanelHead";
import { perShareTk } from "@/components/dividend-calendar/DividendRow";
import { dayParts, dayShort, type Pair } from "@/components/dividend-calendar/dates";
import type { DividendForecast } from "@/lib/api";

function pctWord(v: number): string {
  return `${Number.isInteger(v) ? v : v.toFixed(1)}%`;
}

/** "20 Nov" / "20 নভে." — a date inside a window, no weekday. */
function dayMonth(iso: string | null | undefined): Pair {
  const p = dayParts(iso);
  return p ? { en: `${p.day} ${p.month.en}`, bn: `${p.day} ${p.month.bn}` } : { en: "—", bn: "—" };
}

/** When to look for it: the posted board meeting, else last year's date a year on. */
function when(r: DividendForecast): { short: Pair; tone: "watch" | null; line: Pair } {
  const decl = dayShort(r.last_declared, true);
  if (r.meeting) {
    const m = dayShort(r.meeting);
    return {
      short: { en: `Board meets ${m.en}`, bn: `পর্ষদ সভা ${m.bn}` },
      tone: "watch",
      line: {
        en: `The board meets on ${m.en} on its yearly results. Dividends are declared at that meeting.`,
        bn: `বার্ষিক ফল নিয়ে পর্ষদ সভা ${m.bn}। ডিভিডেন্ড সেই সভাতেই ঘোষণা হয়।`,
      },
    };
  }
  if (r.late) {
    return {
      short: { en: "Later than last year", bn: "গত বছরের চেয়ে দেরি" },
      tone: null,
      line: {
        en: `Last year it declared on ${decl.en}. It has not declared yet this year.`,
        bn: `গত বছর ${decl.bn} ঘোষণা করেছিল। এ বছর এখনো করেনি।`,
      },
    };
  }
  const a = dayMonth(r.window_start);
  const b = dayMonth(r.window_end);
  return {
    short: { en: `Expected ${a.en} to ${b.en}`, bn: `সম্ভাব্য ${a.bn} থেকে ${b.bn}` },
    tone: null,
    line: {
      en: `Last year it declared on ${decl.en}, so look for it around the same time this year.`,
      bn: `গত বছর ${decl.bn} ঘোষণা করেছিল, তাই এ বছরও প্রায় একই সময়ে আশা করা যায়।`,
    },
  };
}

/**
 * "Coming next": companies that paid cash for their last year and haven't
 * declared for this one yet — the dividends a reader can expect next.
 * Facts only since 2026-11-05 (user: the calendar is "purely dedicated for
 * finding dividends that are coming next", no analysis): when to look for it
 * (a board meeting DSE has posted, else last year's declaration date a year
 * on, ±2 weeks) and what it paid last year. Our profit-based estimate of the
 * amount and the "May skip" word are no longer shown (the backend still sends
 * them). Board meetings come first, then the expected dates, soonest first.
 */
export default function ComingNext({ rows }: { rows: DividendForecast[] }) {
  const head = (
    <PanelHead
      title={<T en="Dividends coming next" bn="সামনে যেসব ডিভিডেন্ড আসতে পারে" />}
      lead={
        <T
          en="Companies that paid cash last year and haven't declared for this year yet, with when to look for it."
          bn="যে কোম্পানিগুলো গত বছর নগদ ডিভিডেন্ড দিয়েছে কিন্তু এ বছরের জন্য এখনো ঘোষণা করেনি, আর কবে তা আসতে পারে।"
        />
      }
    />
  );
  if (rows.length === 0) {
    return (
      <>
        {head}
        <div className="soft-card">
          <p className="dc-empty">
            <T
              en="Every company that paid last year has declared for this year, or its year isn't over yet."
              bn="গত বছর যারা দিয়েছিল, তারা সবাই এ বছরের ঘোষণা দিয়েছে, অথবা তাদের বছর এখনো শেষ হয়নি।"
            />
          </p>
        </div>
      </>
    );
  }
  const items = rows.map((r) => {
    const w = when(r);
    const decl = dayShort(r.last_declared, true);
    const rec = r.last_record_date ? dayShort(r.last_record_date, true) : null;
    const href = `/stock/${encodeURIComponent(r.trading_code)}#dividends`;
    const head = (
      <>
        <span className="dc-name">{r.company_name || r.trading_code}</span>
        <span className="dc-meta">
          <span className="dc-code">{r.trading_code}</span>
          <span className="dc-sep" aria-hidden="true">·</span>
          <span className={w.tone ? "dc-tone--watch" : undefined}>
            <T en={w.short.en} bn={w.short.bn} />
          </span>
        </span>
      </>
    );
    const fig = (
      <>
        <span className="dc-amt">{perShareTk(r.last_cash_per_share)}</span>
        <span className="dc-amt-x">
          <T en="a share last year" bn="গত বছর শেয়ারপ্রতি" />
        </span>
      </>
    );
    const body = (
      <>
        <p className="dc-x-line">
          <T en={w.line.en} bn={w.line.bn} />
        </p>
        <p className="dc-x-facts">
          <T
            en={`Last year: ${pctWord(r.last_cash_pct)} cash (${perShareTk(r.last_cash_per_share)} a share), declared ${decl.en}${rec ? `, record date ${rec.en}` : ""}`}
            bn={`গত বছর: ${pctWord(r.last_cash_pct)} নগদ (শেয়ারপ্রতি ${perShareTk(r.last_cash_per_share)}), ঘোষণা ${decl.bn}${rec ? `, রেকর্ড ডেট ${rec.bn}` : ""}`}
          />
          {r.last_stock_pct ? (
            <T en={` · also ${pctWord(r.last_stock_pct)} bonus`} bn={` · সঙ্গে ${pctWord(r.last_stock_pct)} বোনাস`} />
          ) : null}
        </p>
        <div className="dc-x-act">
          <Button href={href} variant="quiet" size="sm">
            <T en={`Open the ${r.trading_code} page`} bn={`${r.trading_code}-এর পেজ খুলুন`} />
          </Button>
        </div>
      </>
    );
    return (
      <li key={r.trading_code}>
        <ExpandRow head={head} fig={fig} body={body} href={href} />
      </li>
    );
  });
  return (
    <>
      {head}
      <div className="soft-card dc-board">
        <CalendarFold
          as="ul"
          className="dc-list"
          items={items}
          initial={10}
          more={{ en: `Show all ${items.length} companies`, bn: `সব ${items.length}টি কোম্পানি দেখুন` }}
        />
      </div>
      <p className="dc-fine">
        <T
          en="The board decides the date and the amount. The dates come from a board meeting DSE has posted, else from last year's declaration a year on."
          bn="তারিখ আর পরিমাণ ঠিক করে বোর্ড। তারিখগুলো ডিএসইতে প্রকাশিত পর্ষদ সভা থেকে, না থাকলে গত বছরের ঘোষণার এক বছর পর থেকে ধরা।"
        />
      </p>
    </>
  );
}
