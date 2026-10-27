import type { CompanyDetail } from "@/lib/api";
import { crore, croreShares, money } from "@/lib/formatters";
import { croreBn } from "@/lib/bn";
import type { Bi } from "@/lib/plain-language";
import Card from "@/components/ui/Card";
import SectionTitle from "@/components/stock/SectionTitle";
import { T } from "@/components/i18n/T";

interface Props {
  detail: CompanyDetail;
}

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const same = (s: string): Bi => ({ en: s, bn: s });
const tk = (mn: number): Bi => ({ en: crore(mn), bn: croreBn(mn) });
const sharesBi = (n: number): Bi => ({ en: croreShares(n), bn: croreShares(n).replace(/ Cr$/, " কোটি") });
const tx = (b: Bi) => <T en={b.en} bn={b.bn} />;

interface Fact {
  key: string;
  label: Bi;
  value: Bi;
  desc: Bi;
  tone?: string;
}

/**
 * The raw company figures in one compact strip: size (market value, capital,
 * shares), balance-sheet basics (reserve, loan), listing facts (face value,
 * lot, listed since) and today's trading (range, turnover, trades). P/E and
 * yield live only in the valuation tiles, so nothing here is printed twice.
 */
export default function CompanyFacts({ detail }: Props) {
  const { profile, latest_price, financials } = detail;

  const sortedFins = [...financials].sort(
    (a, b) => Number((b as Record<string, unknown>).year ?? 0) - Number((a as Record<string, unknown>).year ?? 0),
  );
  const latestFin = sortedFins[0] as Record<string, unknown> | undefined;
  const eps = toNum(latestFin?.eps) ?? toNum(latestFin?.eps_cont_basic) ?? toNum(latestFin?.eps_basic);
  const epsYear = latestFin?.year != null ? String(latestFin.year) : null;

  const ltp = toNum(latest_price.ltp);
  const shares = toNum(profile.total_shares);
  const mcapMn = ltp != null && shares != null && shares > 0 ? (ltp * shares) / 1e6 : null;
  const reserve = toNum(profile.reserve_surplus_mn);
  // Banks / finance companies: borrowing (deposits, refinance) IS the business,
  // so a "Total loan" figure next to the reserve reads as a debt problem it isn't.
  const sr = detail.score_row ?? {};
  const isLender = sr.p2_capital != null || /bank|financial institution|leasing/i.test(profile.sector ?? "");
  const loan = isLender ? null : toNum(profile.total_loan_mn);
  const debtLevel = typeof sr.debt_level === "string" ? sr.debt_level : null;
  const paidUp = toNum(profile.paid_up_capital_mn);
  const face = toNum(profile.face_value);
  const lot = toNum(profile.market_lot);
  const listed = toNum(profile.listing_year);

  const dayLow = toNum(latest_price.low);
  const dayHigh = toNum(latest_price.high);
  const ycp = toNum(latest_price.ycp);
  const turnoverMn = toNum(latest_price.value_mn);
  const trades = toNum(latest_price.trade_count);
  const volume = toNum(latest_price.volume);

  const facts: Fact[] = [];
  const push = (f: Fact | null) => { if (f) facts.push(f); };

  push(mcapMn != null ? {
    key: "mcap",
    label: { en: "Market value", bn: "বাজার মূলধন" },
    value: tk(mcapMn),
    desc: { en: "What the whole company is worth at today's price", bn: "আজকের দামে পুরো কোম্পানির মূল্য" },
  } : null);
  push(eps != null ? {
    key: "eps",
    label: { en: "EPS", bn: "ইপিএস" },
    value: same(`৳${eps.toFixed(2)}`),
    desc: epsYear
      ? { en: `Profit for each share in ${epsYear}`, bn: `${epsYear} সালে শেয়ারপ্রতি মুনাফা` }
      : { en: "Profit for each share in the latest year", bn: "সর্বশেষ বছরে শেয়ারপ্রতি মুনাফা" },
    tone: eps < 0 ? "var(--negative)" : undefined,
  } : null);
  push(paidUp != null ? {
    key: "paidup",
    label: { en: "Paid-up capital", bn: "পরিশোধিত মূলধন" },
    value: tk(paidUp),
    desc: { en: "Money shareholders have put in", bn: "শেয়ারহোল্ডারদের দেওয়া মূলধন" },
  } : null);
  push(reserve != null ? {
    key: "reserve",
    label: { en: "Reserve and surplus", bn: "রিজার্ভ ও উদ্বৃত্ত" },
    value: tk(reserve),
    desc: { en: "Profit kept in the company over the years", bn: "বছরের পর বছর কোম্পানিতে রেখে দেওয়া মুনাফা" },
  } : null);
  push(loan != null ? {
    key: "loan",
    label: { en: "Total loans", bn: "মোট ঋণ" },
    value: tk(loan),
    desc: { en: "Money the company owes", bn: "কোম্পানির দেনা" },
    // Same rule as the Health Check and the things to watch (scoring_service.debt_load).
    tone: debtLevel === "over_mcap" || debtLevel === "over_reserve" ? "var(--watch)" : undefined,
  } : null);
  push(shares != null && shares > 0 ? {
    key: "shares",
    label: { en: "Shares", bn: "শেয়ার সংখ্যা" },
    value: sharesBi(shares),
    desc: { en: "Total shares listed", bn: "তালিকাভুক্ত মোট শেয়ার" },
  } : null);
  push(face != null ? {
    key: "face",
    label: { en: "Face value", bn: "অভিহিত মূল্য" },
    value: same(`৳${face % 1 === 0 ? face.toFixed(0) : face.toFixed(2)}`),
    desc: { en: "Dividends are a % of this amount", bn: "ডিভিডেন্ড এই অঙ্কের শতাংশ হিসেবে দেওয়া হয়" },
  } : null);
  push(lot != null && lot > 0 ? {
    key: "lot",
    label: { en: "Market lot", bn: "মার্কেট লট" },
    value: same(lot.toLocaleString("en-US")),
    desc: { en: "The smallest number of shares per trade", bn: "এক লেনদেনে সর্বনিম্ন শেয়ার" },
  } : null);
  push(listed != null && listed > 1900 ? {
    key: "listed",
    label: { en: "Listed since", bn: "তালিকাভুক্তির বছর" },
    value: same(String(listed)),
    desc: { en: `${new Date().getFullYear() - listed} years on the DSE`, bn: `DSE-তে ${new Date().getFullYear() - listed} বছর` },
  } : null);
  push(turnoverMn != null && turnoverMn > 0 ? {
    key: "turnover",
    label: { en: "Traded today", bn: "আজকের লেনদেন" },
    value: tk(turnoverMn),
    desc: { en: "Value of shares bought and sold", bn: "কেনাবেচা হওয়া শেয়ারের মূল্য" },
  } : null);
  push(trades != null && trades > 0 ? {
    key: "trades",
    label: { en: "Trades today", bn: "আজকের লেনদেন সংখ্যা" },
    value: same(trades.toLocaleString("en-US")),
    desc: volume != null
      ? { en: `${croreShares(volume)} shares changed hands`, bn: `${sharesBi(volume).bn} শেয়ার হাতবদল হয়েছে` }
      : { en: "Number of trades", bn: "লেনদেনের সংখ্যা" },
  } : null);

  const hasRange = dayLow != null && dayHigh != null && dayHigh > dayLow && ltp != null;
  const rangePos = hasRange ? Math.max(0, Math.min(1, (ltp - dayLow) / (dayHigh - dayLow))) : null;
  const ycpPos = hasRange && ycp != null ? Math.max(0, Math.min(1, (ycp - dayLow) / (dayHigh - dayLow))) : null;

  if (facts.length === 0 && !hasRange) return null;

  return (
    <section className="mb-8">
      <SectionTitle
        title={<T en="Company facts" bn="কোম্পানির তথ্য" />}
        sub={
          <T
            en="The basic figures: how big the company is, what it owes and how it traded today."
            bn="মূল তথ্য: কোম্পানি কত বড়, কত দেনা আছে, আর আজ কেমন লেনদেন হয়েছে।"
          />
        }
      />

      <Card padding="none" className="rounded-2xl p-4 sm:p-5">
        {hasRange && (
          <div className="mb-5">
            <div className="flex items-center justify-between gap-3 text-xs font-medium mb-2 tabular-nums nums text-text-muted">
              <span>
                <T en="Low" bn="সর্বনিম্ন" /> {money(dayLow)}
              </span>
              <span className="font-bold text-text-main">
                <T en="Today's range" bn="আজকের দামের সীমা" />
              </span>
              <span>
                <T en="High" bn="সর্বোচ্চ" /> {money(dayHigh)}
              </span>
            </div>
            <div
              className="relative h-2 rounded-full"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
            >
              {ycpPos != null && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                  /* taller than the 18px dot+ring and layered above it, so on an unchanged
                     close (ltp === ycp, common on the DSE) the tick still shows through */
                  style={{ left: `${ycpPos * 100}%`, width: 2, height: 22, background: "var(--text-muted)", borderRadius: 1, zIndex: 1 }}
                  aria-hidden="true"
                />
              )}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full"
                style={{
                  left: `${(rangePos as number) * 100}%`,
                  width: 12,
                  height: 12,
                  background: "var(--primary)",
                  boxShadow: "0 0 0 3px var(--surface)",
                }}
                aria-hidden="true"
              />
            </div>
            <p className="text-xs mt-2 text-text-muted">
              <T
                en={`The dot is today's closing price.${ycp != null ? ` The thin line is yesterday's close, ${money(ycp)}.` : ""}`}
                bn={`বিন্দুটি আজকের দিনশেষের দাম।${ycp != null ? ` সরু দাগটি গতকালের দিনশেষের দাম, ${money(ycp)}।` : ""}`}
              />
            </p>
          </div>
        )}

        {facts.length > 0 && (
          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-4">
            {facts.map((f) => (
              <div key={f.key} className="min-w-0">
                <dt className="text-xs font-semibold mb-1 text-text-muted">{tx(f.label)}</dt>
                <dd className="text-lg font-bold tabular-nums nums leading-none truncate" style={{ color: f.tone ?? "var(--text)" }}>
                  {tx(f.value)}
                </dd>
                <dd className="text-xs mt-1 leading-snug text-text-muted">{tx(f.desc)}</dd>
              </div>
            ))}
          </dl>
        )}
      </Card>
    </section>
  );
}
