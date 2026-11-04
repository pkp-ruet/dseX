import ExpandRow from "@/components/dividend-calendar/ExpandRow";
import Button from "@/components/ui/Button";
import { T } from "@/components/i18n/T";
import { Locked } from "@/components/premium/AnswerLock";
import CalendarFold from "@/components/dividend-calendar/CalendarFold";
import PanelHead from "@/components/dividend-calendar/PanelHead";
import { perShareTk } from "@/components/dividend-calendar/DividendRow";
import { dayShort } from "@/components/dividend-calendar/dates";
import type { DividendForecast } from "@/lib/api";

const TONE: Record<DividendForecast["tone"], string> = {
  good: "dc-safety--safe",
  neutral: "",
  bad: "dc-safety--risk",
};

function pctWord(v: number): string {
  return `${Number.isInteger(v) ? v : v.toFixed(1)}%`;
}

/**
 * "Coming next" (2026-10-31, the Premium Desk plan): companies that paid cash
 * for their last year and haven't declared for this one yet. Free: last
 * year's declaration and cash, and a board meeting DSE has posted. Premium
 * (screen-only `Locked`): when we expect it and how much, with the reason in
 * plain words (backend `dividend_forecast.forecast_row`). Board meetings come
 * first, then the expected dates, soonest first.
 */
export default function ComingNext({ rows }: { rows: DividendForecast[] }) {
  const head = (
    <PanelHead
      title={<T en="Dividends coming next" bn="সামনে যেসব ডিভিডেন্ড আসতে পারে" />}
      lead={
        <T
          en="Companies that paid cash last year and haven't declared for this year yet. Tap one to see when we expect it, and why."
          bn="যে কোম্পানিগুলো গত বছর নগদ ডিভিডেন্ড দিয়েছে কিন্তু এ বছরের জন্য এখনো ঘোষণা করেনি। কবে আসতে পারে আর কেন, দেখতে কোম্পানিতে ট্যাপ করুন।"
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
    const decl = dayShort(r.last_declared, true);
    const meeting = r.meeting ? dayShort(r.meeting) : null;
    const href = `/stock/${encodeURIComponent(r.trading_code)}#dividends`;
    const head = (
      <>
        <span className="dc-name">{r.company_name || r.trading_code}</span>
        <span className="dc-meta">
          <span className="dc-code">{r.trading_code}</span>
          {meeting && (
            <>
              <span className="dc-sep" aria-hidden="true">·</span>
              <span className="dc-tone--watch">
                <T en={`Board meets ${meeting.en}`} bn={`পর্ষদ সভা ${meeting.bn}`} />
              </span>
            </>
          )}
          <Locked as="span" className="dc-word">
            <span className="dc-sep" aria-hidden="true">·</span>{" "}
            <b className={`dc-safety-w ${TONE[r.tone]}`.trim()}>
              <T en={r.word_en} bn={r.word_bn} />
            </b>
          </Locked>
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
        <Locked>
          <dl className="dc-why">
            <div>
              <dt>
                <T en="What we expect" bn="আমাদের অনুমান" />
              </dt>
              <dd>
                <b className={`dc-safety-w ${TONE[r.tone]}`.trim()}>
                  <T en={`${r.word_en}.`} bn={`${r.word_bn}।`} />
                </b>{" "}
                <T en={r.when_en} bn={r.when_bn} />
              </dd>
            </div>
            <div>
              <dt>
                <T en="Why" bn="কেন" />
              </dt>
              <dd>
                <T en={r.why_en} bn={r.why_bn} />
              </dd>
            </div>
          </dl>
        </Locked>
        <p className="dc-x-facts">
          <T
            en={`Last year ${pctWord(r.last_cash_pct)} cash, declared ${decl.en}`}
            bn={`গত বছর ${pctWord(r.last_cash_pct)} নগদ, ঘোষণা ${decl.bn}`}
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
          en="An estimate, not a promise: the board decides. We move last year's cash with the change in profit over the last 12 months, and say so when profit turned to a loss."
          bn="এটি অনুমান, প্রতিশ্রুতি নয়: সিদ্ধান্ত বোর্ডের। গত 12 মাসের মুনাফা যতটা বদলেছে, গত বছরের নগদ ডিভিডেন্ড ততটা বদলে আমরা হিসাব করি, আর মুনাফা লোকসানে গেলে তা জানাই।"
        />
      </p>
    </>
  );
}
