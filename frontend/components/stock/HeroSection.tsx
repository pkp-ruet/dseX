import Link from "next/link";
import WatchlistButton from "@/components/stock/WatchlistButton";
import AddToPortfolioButton from "@/components/stock/AddToPortfolioButton";
import PriceAlertButton from "@/components/stock/PriceAlertButton";
import ShareButton from "@/components/stock/ShareButton";
import CategoryChip from "@/components/stock/CategoryChip";
import YourPosition from "@/components/stock/YourPosition";
import GradeMedal from "@/components/stock/GradeMedal";
import DaysLeft from "@/components/stock/DaysLeft";
import { IconCalendar } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { taka, signed } from "@/lib/formatters";
import { range52wInfo, type Bi } from "@/lib/plain-language";
import { sectorSlug } from "@/lib/sector";
import { sectorBn } from "@/lib/bn";
import type { CompanyDetail } from "@/lib/api";
import type { NextSection } from "@/lib/stock-report";

interface Props {
  detail: CompanyDetail;
}

const WD_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WD_BN = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহস্পতি", "শুক্র", "শনি"];
const MON_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MON_BN = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];

/** "Tue 4 Nov" / "মঙ্গল 4 নভেম্বর" from an ISO day (a calendar date, no time zone). */
function shortDay(iso: string, lang: "en" | "bn"): string {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return lang === "en" ? `${WD_EN[wd]} ${d} ${MON_EN[m - 1]}` : `${WD_BN[wd]} ${d} ${MON_BN[m - 1]}`;
}

/** Token-tinted chip colours (CategoryChip takes raw CSS colour strings). */
const tint = (token: string, pct: number) => `color-mix(in srgb, var(--${token}) ${pct}%, transparent)`;

// DSE market category, in plain words. Tone mirrors how the score treats it.
const CATEGORY_INFO: Record<string, { note: Bi; color: string; bg: string; border: string }> = {
  A: {
    note: {
      en: "Category A companies pay regular dividends and hold their annual meeting on time. It is the top category.",
      bn: "A ক্যাটাগরির কোম্পানি নিয়মিত ডিভিডেন্ড দেয় আর সময়মতো এজিএম করে। এটি সবচেয়ে ভালো ক্যাটাগরি।",
    },
    color: "var(--positive)", bg: tint("positive", 8), border: tint("positive", 30),
  },
  B: {
    note: {
      en: "Category B companies pay small or irregular dividends. It is below the top category.",
      bn: "B ক্যাটাগরির কোম্পানি কম বা অনিয়মিত ডিভিডেন্ড দেয়। এটি সবচেয়ে ভালো ক্যাটাগরির নিচে।",
    },
    color: "var(--watch)", bg: tint("watch", 8), border: tint("watch", 30),
  },
  N: {
    note: {
      en: "Category N means the company is newly listed, so it has no dividend record yet.",
      bn: "N ক্যাটাগরি মানে কোম্পানিটি নতুন তালিকাভুক্ত, তাই ডিভিডেন্ডের কোনো রেকর্ড এখনো নেই।",
    },
    color: "var(--primary-ink)", bg: tint("primary", 8), border: tint("primary", 30),
  },
  Z: {
    note: {
      en: "Category Z companies have not paid dividends or held their annual meeting. These carry extra risk, so take care.",
      bn: "Z ক্যাটাগরির কোম্পানি ডিভিডেন্ড দেয়নি বা এজিএম করেনি। এগুলোতে ঝুঁকি বেশি, তাই সাবধান থাকুন।",
    },
    color: "var(--negative)", bg: tint("negative", 8), border: tint("negative", 35),
  },
};

const num = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** ৳ crore for the quick facts: ৳19,369 cr. */
function croreText(mn: number | null): Bi | null {
  if (mn == null || !Number.isFinite(mn) || mn <= 0) return null;
  const cr = mn / 10;
  const s = cr >= 100 ? Math.round(cr).toLocaleString("en-US") : cr.toFixed(1);
  return { en: `৳${s} cr`, bn: `৳${s} কোটি` };
}

const SKIP_WORDS = /^(ltd|limited|plc|the|of|and|bangladesh|company|co)$/i;

/** Two letters for the initials tile: "Square Pharmaceuticals PLC." → "SP". */
function initialsOf(name: string, code: string): string {
  const words = name.replace(/[^A-Za-z ]/g, " ").trim().split(/\s+/).filter((w) => w.length > 1 && !SKIP_WORDS.test(w));
  const two = words.slice(0, 2).map((w) => w[0]).join("");
  return (two.length === 2 ? two : (words[0] ?? code).slice(0, 2)).toUpperCase();
}

/** The next date worth knowing, from the report's "What's next" (a dividend's
 *  last day to buy, a results meeting, a record date, an AGM). */
function nextDate(next: NextSection | undefined, today: string | null): NextSection["items"][number] | null {
  if (!next) return null;
  return next.items.find((it) => it.date && (!today || it.date >= today) && it.kind !== "spot") ?? null;
}

interface Fact {
  label: Bi;
  term?: string;
  value: Bi;
  sub?: Bi;
}

/**
 * The cover (2026-11-05 redesign, user: "the top header of this page looks bit
 * dull"; plan https://claude.ai/artifact/X9ipDsdsLDtoMmQPe1VkS8): ONE card —
 * an initials tile, the name and its tags, the actions, the price with
 * today's move and the year's range, OUR GRADE as a medal (score, group, rank;
 * free), four quick facts with plain names and the next date that matters.
 * The reader's own shares close it.
 */
export default function HeroSection({ detail }: Props) {
  const { profile, latest_price, score_row } = detail;
  const code = profile.trading_code;
  const score = num(score_row?.score);
  const report = detail.report ?? null;

  const ltp = latest_price.ltp;
  // A share whose latest row is older than the market's latest day didn't
  // trade since: no "today" on an old change (2026-11-04, audit SP4).
  const priceDay = latest_price.date ? String(latest_price.date).slice(0, 10) : null;
  const marketDay = latest_price.market_date ? String(latest_price.market_date).slice(0, 10) : null;
  const notTraded = priceDay != null && marketDay != null && priceDay < marketDay;
  const chg = notTraded ? null : latest_price.change_pct;
  const isPositive = chg != null && chg > 0;
  const isNegative = chg != null && chg < 0;

  const range = range52wInfo(ltp, latest_price.w52_high, latest_price.w52_low);
  const rangeTextCls =
    range?.tone === "high" ? "text-positive" : range?.tone === "low" ? "text-negative" : "text-info";
  const rangeDotCls =
    range?.tone === "high" ? "bg-positive" : range?.tone === "low" ? "bg-negative" : "bg-info";

  const category = (profile.market_category ?? "").trim().toUpperCase();
  const categoryInfo = CATEGORY_INFO[category];
  const name = profile.company_name ?? code;

  // Quick facts: public figures with plain names (the market word small).
  const shares = num(profile.total_shares);
  const mcap = ltp != null && shares ? croreText((ltp * shares) / 1e6) : null;
  const pe = num(score_row?.current_pe);
  const eps = num(score_row?.eps);
  const epsTtm = score_row?.eps_basis === "ttm";
  const dv = report?.sections.dividend;
  const cashPs = dv?.year_cash_ps ?? null;
  const yieldPct = dv?.year_yield_pct ?? num(score_row?.div_yield_pct);
  const facts: Fact[] = [];
  if (mcap) facts.push({ label: { en: "Market value", bn: "বাজারমূল্য" }, value: mcap });
  if (pe != null && pe > 0) {
    facts.push({
      label: { en: "Price for its profit", bn: "মুনাফার তুলনায় দাম" },
      term: "P/E",
      value: { en: pe.toFixed(1), bn: pe.toFixed(1) },
      sub: { en: `you pay ${Math.round(pe)} years of profit`, bn: `${Math.round(pe)} বছরের মুনাফার সমান দাম` },
    });
  } else if (eps != null && eps <= 0) {
    facts.push({
      label: { en: "Price for its profit", bn: "মুনাফার তুলনায় দাম" },
      term: "P/E",
      value: { en: "None", bn: "নেই" },
      sub: { en: "it made a loss", bn: "লোকসান হয়েছে" },
    });
  }
  if (cashPs != null && cashPs > 0) {
    const ps = Math.abs(cashPs - Math.round(cashPs)) < 0.005 ? `৳${Math.round(cashPs)}` : `৳${cashPs.toFixed(2)}`;
    facts.push({
      label: { en: "Cash dividend", bn: "নগদ ডিভিডেন্ড" },
      value: { en: `${ps} a share`, bn: `শেয়ারপ্রতি ${ps}` },
      sub: yieldPct != null ? { en: `${yieldPct.toFixed(1)}% a year`, bn: `বছরে ${yieldPct.toFixed(1)}%` } : undefined,
    });
  } else if (dv) {
    facts.push({
      label: { en: "Cash dividend", bn: "নগদ ডিভিডেন্ড" },
      value: { en: "None", bn: "নেই" },
      sub: { en: "for its latest year", bn: "সর্বশেষ বছরে" },
    });
  }
  if (eps != null) {
    const v = `${eps < 0 ? "-" : ""}৳${Math.abs(eps).toFixed(2)}`;
    facts.push({
      label: { en: "Profit a share", bn: "শেয়ারপ্রতি মুনাফা" },
      term: "EPS",
      value: { en: v, bn: v },
      sub: epsTtm ? { en: "last 12 months", bn: "গত 12 মাসে" } : { en: "latest year", bn: "সর্বশেষ বছরে" },
    });
  }

  const nx = nextDate(report?.sections.next, marketDay ?? priceDay);

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-3">
        <ol className="flex items-center gap-1 text-xs text-text-muted">
          <li>
            <Link href="/" className="inline-flex items-center min-h-10 hover:text-primary transition-colors">
              <T en="Home" bn="হোম" />
            </Link>
          </li>
          <li aria-hidden="true" className="opacity-40">/</li>
          <li>
            <Link href="/dsestockranking" className="inline-flex items-center min-h-10 hover:text-primary transition-colors">
              <T en="Company ranking" bn="কোম্পানির র‍্যাঙ্কিং" />
            </Link>
          </li>
          <li aria-hidden="true" className="opacity-40">/</li>
          <li aria-current="page" className="font-semibold text-text-main">{code}</li>
        </ol>
      </nav>

      <header id="ch-overview" className="stock-anchor cv soft-card mb-6">
        <div className="cv-top">
          <span className="cv-logo" aria-hidden="true">{initialsOf(name, code)}</span>
          <div className="min-w-0">
            <h1 className="min-w-0 break-words text-xl font-bold leading-tight tracking-tight text-text-main text-balance sm:text-3xl">
              {name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="cv-tag cv-tag-code">{code}</span>
              {profile.sector && (
                <Link href={`/sector/${sectorSlug(profile.sector)}`} prefetch={false} className="cv-tag hover:border-text-muted">
                  <T en={profile.sector} bn={sectorBn(profile.sector)} /> <span aria-hidden="true">→</span>
                </Link>
              )}
              {categoryInfo && (
                <CategoryChip
                  category={category}
                  note={<T en={categoryInfo.note.en} bn={categoryInfo.note.bn} />}
                  color={categoryInfo.color}
                  bg={categoryInfo.bg}
                  border={categoryInfo.border}
                />
              )}
              {profile.listing_year ? (
                <span className="cv-tag">
                  <T en={`Listed ${profile.listing_year}`} bn={`তালিকাভুক্ত ${profile.listing_year}`} />
                </span>
              ) : null}
            </div>
          </div>
          <div className="cv-actions">
            <WatchlistButton code={code} />
            <AddToPortfolioButton code={code} ltp={ltp} />
            <PriceAlertButton code={code} ltp={ltp} w52High={latest_price.w52_high} w52Low={latest_price.w52_low} />
            <ShareButton code={code} companyName={profile.company_name} score={score} ltp={ltp} />
          </div>
        </div>

        <div className="cv-main">
          <div className="min-w-0">
            <span className="nums block text-4xl font-bold leading-none tracking-tight text-text-main sm:text-5xl">
              {ltp != null ? taka(ltp, 1) : "--"}
            </span>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
              {chg != null && (
                <span className="cv-chg nums" data-dir={isPositive ? "up" : isNegative ? "down" : "flat"}>
                  <span aria-hidden="true">{isPositive ? "▲ " : isNegative ? "▼ " : ""}</span>
                  {signed(chg)}% <T en="today" bn="আজ" />
                </span>
              )}
              <span className="text-xs font-semibold text-text-muted">
                {notTraded && priceDay ? (
                  <T en={`No trade since ${shortDay(priceDay, "en")}`} bn={`${shortDay(priceDay, "bn")}-এর পর লেনদেন হয়নি`} />
                ) : latest_price.official === false ? (
                  <T en="Last trade today · the official close comes after 2:30 PM" bn="আজকের শেষ লেনদেনের দাম · অফিশিয়াল দাম আসবে বেলা 2:30-এর পর" />
                ) : priceDay ? (
                  <T en={`Official close, ${shortDay(priceDay, "en")}`} bn={`অফিশিয়াল দাম, ${shortDay(priceDay, "bn")}`} />
                ) : (
                  <T en="Official closing price" bn="দিনশেষের অফিশিয়াল দাম" />
                )}
              </span>
            </div>
            {range && latest_price.w52_high != null && latest_price.w52_low != null && (
              <div className="mt-4 max-w-md">
                {/* Grid, not justify-between: at 360px the caption wraps in the middle
                    cell while Low / High stay pinned to the bar's two ends. */}
                <div className="mb-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 text-xs font-semibold text-text-muted">
                  <span className="nums whitespace-nowrap">
                    <T en="Year low" bn="বছরের সর্বনিম্ন" /> {taka(latest_price.w52_low, 1)}
                  </span>
                  <span className={`text-center font-bold leading-tight ${rangeTextCls}`}>
                    <T en={range.caption.en} bn={range.caption.bn} />
                  </span>
                  <span className="nums whitespace-nowrap">
                    <T en="Year high" bn="বছরের সর্বোচ্চ" /> {taka(latest_price.w52_high, 1)}
                  </span>
                </div>
                <div className="relative h-1.5 rounded-full bg-surface-2">
                  <div
                    className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-[3px] ring-surface ${rangeDotCls}`}
                    style={{ left: `${range.position * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          <GradeMedal score={score} rank={num(score_row?.overall_rank)} total={num(score_row?.total_scored)} />
        </div>

        {facts.length > 0 && (
          <dl className="cv-facts">
            {facts.map((f) => (
              <div key={f.label.en}>
                <dt className="text-xs font-semibold text-text-main">
                  <T en={f.label.en} bn={f.label.bn} />
                  {f.term && <span className="cv-term">{f.term}</span>}
                </dt>
                <dd className="nums mt-0.5 text-base font-bold leading-tight text-text-main sm:text-lg">
                  <T en={f.value.en} bn={f.value.bn} />
                  {f.sub && (
                    <span className="mt-0.5 block text-xs font-semibold">
                      <T en={f.sub.en} bn={f.sub.bn} />
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {nx?.date && (
          <p className="cv-next">
            <IconCalendar size={18} />
            <span className="min-w-0">
              <T en={nx.label.en} bn={nx.label.bn} />
              {": "}
              <b>
                {nx.approx && <T en="around " bn="আনুমানিক " />}
                <T en={shortDay(nx.date, "en")} bn={shortDay(nx.date, "bn")} />
              </b>
              {!nx.approx && (
                <>
                  {" · "}
                  <DaysLeft date={nx.date} />
                </>
              )}
            </span>
          </p>
        )}

        {/* The reader's own stake (signed-in holder / watcher) — their own
            facts, free for every reader. */}
        <div className="mt-4 empty:hidden">
          <YourPosition code={code} ltp={ltp} />
        </div>
      </header>
    </>
  );
}
