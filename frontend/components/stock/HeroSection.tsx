import Link from "@/components/ui/Link";
import WatchRulesHint from "@/components/watch-rules/WatchRulesHint";
import CoverActions from "@/components/stock/CoverActions";
import CategoryChip from "@/components/stock/CategoryChip";
import YourPosition from "@/components/stock/YourPosition";
import CoverVerdict from "@/components/stock/analysis/CoverVerdict";
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

/** "Sun 22 Nov 2026" / "রবি 22 নভেম্বর 2026": the cover's dateline. */
function longDay(iso: string, lang: "en" | "bn"): string {
  return `${shortDay(iso, lang)} ${iso.slice(0, 4)}`;
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

/**
 * The cover, made to be a Facebook post as well as the top of the page
 * (2026-11-23, user: "post this screenshot … the follow, watch and all quick
 * buttons are useless"; mockup https://claude.ai/artifact/VTWHEAHf62EEqAj6wBWMDP).
 * ONE card: the brand + "Our analysis" date line, the name with one line of
 * tags, the price with today's move and the year's range, then OUR VERDICT in
 * four rows (2026-11-24, analysis only: the company — free —, its dividend,
 * today's price and problems; no Buy / Sell), and a foot with the next date
 * and the page's address. The quick facts moved to the numbers at the bottom.
 * The buttons sit under the card (`CoverActions`) so a screenshot stops at its
 * edge; the reader's own shares follow them.
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

  // The year bar shows the range as traded, like DSE's own page (user decision
  // 2026-11-22); an older backend without it falls back to the adjusted range.
  const traded = latest_price.w52_high_traded != null && latest_price.w52_low_traded != null;
  const yearHigh = traded ? latest_price.w52_high_traded! : latest_price.w52_high;
  const yearLow = traded ? latest_price.w52_low_traded! : latest_price.w52_low;
  const range = range52wInfo(ltp, yearHigh, yearLow);
  const rangeTextCls =
    range?.tone === "high" ? "text-watch" : range?.tone === "low" ? "text-negative" : "text-info";
  const rangeDotCls =
    range?.tone === "high" ? "bg-watch" : range?.tone === "low" ? "bg-negative" : "bg-info";

  const category = (profile.market_category ?? "").trim().toUpperCase();
  const categoryInfo = CATEGORY_INFO[category];
  const name = profile.company_name ?? code;

  // Quick facts: public figures with plain names (the market word small).
  const nx = nextDate(report?.sections.next, marketDay ?? priceDay);

  const brandDay = marketDay ?? priceDay;
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

      <header id="ch-overview" className="stock-anchor cv soft-card">
        {/* Who made it and when, inside the card, so a cropped screenshot
            still carries both (2026-11-23, the post-ready cover). */}
        <div className="cv-brand">
          <span className="cv-mark" aria-hidden="true">
            <span>TopStock</span>
            <span className="cv-mark-bd">BD</span>
          </span>
          {brandDay && (
            <span className="cv-brand-day">
              <T en={`Our analysis · ${longDay(brandDay, "en")}`} bn={`আমাদের বিশ্লেষণ · ${longDay(brandDay, "bn")}`} />
            </span>
          )}
        </div>

        <div className="cv-id">
          <span className="cv-logo" aria-hidden="true">{initialsOf(name, code)}</span>
          <div className="min-w-0">
            <h1 className="cv-name">{name}</h1>
            <div className="cv-meta">
              <span className="cv-code">{code}</span>
              {profile.sector && (
                <Link href={`/sector/${sectorSlug(profile.sector)}`} prefetch={false} className="cv-sector">
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
            </div>
          </div>
        </div>

        <div className="cv-body">
          <div className="cv-pricebox">
            <div className="cv-price">
              <span className="nums cv-ltp">{ltp != null ? taka(ltp, 1) : "--"}</span>
              {chg != null && (
                <span className="cv-chg nums" data-dir={isPositive ? "up" : isNegative ? "down" : "flat"}>
                  {(isPositive || isNegative) && <span aria-hidden="true">{isPositive ? "▲" : "▼"}</span>}
                  <span>{signed(chg)}%</span>
                  <T en="today" bn="আজ" />
                </span>
              )}
            </div>
            <p className="cv-close">
              {notTraded && priceDay ? (
                <T en={`No trade since ${shortDay(priceDay, "en")}`} bn={`${shortDay(priceDay, "bn")}-এর পর লেনদেন হয়নি`} />
              ) : latest_price.official === false ? (
                <T en="Last trade today · the official close comes after 2:30 PM" bn="আজকের শেষ লেনদেনের দাম · অফিশিয়াল দাম আসবে বেলা 2:30-এর পর" />
              ) : priceDay ? (
                <T en={`Official close, ${shortDay(priceDay, "en")}`} bn={`অফিশিয়াল দাম, ${shortDay(priceDay, "bn")}`} />
              ) : (
                <T en="Official closing price" bn="দিনশেষের অফিশিয়াল দাম" />
              )}
            </p>
            {range && yearHigh != null && yearLow != null && (
              <div className="cv-year">
                {/* Grid, not justify-between: at 360px the caption wraps in the middle
                    cell while Low / High stay pinned to the bar's two ends. */}
                <div className="cv-year-top">
                  <span className="nums whitespace-nowrap">
                    <T en="Year low" bn="বছরের সর্বনিম্ন" /> {taka(yearLow, 1)}
                  </span>
                  <span className={`text-center font-bold leading-tight ${rangeTextCls}`}>
                    <T en={range.caption.en} bn={range.caption.bn} />
                  </span>
                  <span className="nums whitespace-nowrap">
                    <T en="Year high" bn="বছরের সর্বোচ্চ" /> {taka(yearHigh, 1)}
                  </span>
                </div>
                <div className="cv-year-bar">
                  <div className={`cv-year-dot ${rangeDotCls}`} style={{ left: `${range.position * 100}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Our verdict (2026-11-24): the company (free), its dividend, today's
              price and problems (open with the analysis, else locked). */}
          <CoverVerdict rows={report?.analysis?.verdict ?? null} score={score} />
        </div>

        {/* The next date and the page's address: what a reader types after
            seeing a shared screenshot. */}
        <div className="cv-foot">
          {nx?.date ? (
            <p className="cv-next">
              <IconCalendar size={16} />
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
          ) : (
            <span />
          )}
          <span className="cv-url">topstockbd.com/stock/{code}</span>
        </div>
      </header>

      {/* The buttons sit under the card, so a screenshot of the card stops at
          its edge. */}
      <CoverActions
        code={code}
        name={name}
        ltp={ltp}
        w52High={latest_price.w52_high}
        w52Low={latest_price.w52_low}
        score={score}
      />
      <WatchRulesHint code={code} name={name} />

      {/* The reader's own stake (signed-in holder / watcher) — their own
          facts, free for every reader. */}
      <div className="mt-4 empty:hidden">
        <YourPosition code={code} ltp={ltp} />
      </div>
      <div className="mb-6" />
    </>
  );
}
