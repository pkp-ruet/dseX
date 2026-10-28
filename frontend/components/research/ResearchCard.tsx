import type { ReactNode } from "react";
import Link from "next/link";
import type { ResearchStock } from "@/lib/api";
import { changePct, changeTone, money, takaGroup } from "@/lib/formatters";
import { getTier, TIER_LABELS, TIER_LABELS_BN } from "@/lib/constants";
import { T } from "@/components/i18n/T";
import { sectorBn } from "@/lib/bn";
import ScoreBadge from "@/components/ui/ScoreBadge";
import SignalChip from "@/components/ui/SignalChip";
import Stat from "@/components/ui/Stat";
import { StockRank } from "@/components/ui/StockRow";
import { PersonalMark } from "@/components/market-analysis/PersonalCodes";
import MaskedName from "@/components/premium/MaskedName";
import { IconAlert, IconArrowRight, IconCheck } from "@/components/ui/icons";

const STANCE: Record<string, { en: string; bn: string; tone: string }> = {
  cheap: { en: "The price looks low", bn: "দাম কম মনে হচ্ছে", tone: "text-positive" },
  fair: { en: "The price looks fair", bn: "দাম ন্যায্য মনে হচ্ছে", tone: "text-primary-ink" },
  expensive: { en: "The price looks high", bn: "দাম বেশি মনে হচ্ছে", tone: "text-negative" },
};

/** Fair-value range as a bar: the shaded zone is our range, the dot is today's price. */
function FairValueBar({ low, high, price }: { low: number; high: number; price: number | null }) {
  const lo = Math.min(low, price ?? low) * 0.92;
  const hi = Math.max(high, price ?? high) * 1.08;
  const at = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  return (
    <div className="rl-fv-bar" aria-hidden>
      <span className="rl-fv-zone" style={{ left: at(low), width: `calc(${at(high)} - ${at(low)})` }} />
      {price != null && <span className="rl-fv-dot" style={{ left: at(price) }} />}
    </div>
  );
}

/**
 * One stock's research card, numbers first: why it is on the list, the price
 * against our fair-value range, three figures that matter, the one thing that
 * could go wrong, then its own number on every check (folded). Every card is
 * Premium — the page puts them all behind one lock (ResearchLock). Every line
 * is a `<T>` pair, so the card renders in the reader's language from the
 * first paint. `masked` = the lock's preview: the same card with the company,
 * its ticker, price and fair-value bar (they would name it) hidden.
 */
export default function ResearchCard({ s, masked = false }: { s: ResearchStock; masked?: boolean }) {
  const tier = getTier(s.score);
  const fv = s.fair_value;
  const stance = fv?.stance ? STANCE[fv.stance] : null;

  const stats: { key: string; value: string; label: ReactNode; tone?: "positive" | "negative" | "default"; sub?: ReactNode }[] = [];
  if (s.quarter?.eps_yoy_pct != null) {
    stats.push({
      key: "q",
      value: changePct(s.quarter.eps_yoy_pct, 0),
      tone: s.quarter.eps_yoy_pct >= 0 ? "positive" : "negative",
      label: (
        <T
          en={`Profit, ${s.quarter.label_en ?? "this year"}`}
          bn={`মুনাফা, ${s.quarter.label_bn ?? "এ বছর"}`}
        />
      ),
    });
  }
  if (s.owners?.now != null) {
    const d = s.owners.delta ?? 0;
    stats.push({
      key: "o",
      value: `${s.owners.now.toFixed(1)}%`,
      label: <T en="Held by sponsors and directors" bn="উদ্যোক্তা-পরিচালকদের হাতে" />,
      sub:
        Math.abs(d) >= 0.5 && s.owners.prev != null ? (
          <T en={`Was ${s.owners.prev.toFixed(1)}%`} bn={`আগে ছিল ${s.owners.prev.toFixed(1)}%`} />
        ) : undefined,
    });
  }
  if (s.cash_per_10k != null) {
    stats.push({
      key: "c",
      value: takaGroup(s.cash_per_10k),
      label: <T en="Cash a year on ৳10,000" bn="৳10,000-এ বছরে নগদ" />,
    });
  }

  const fairValue =
    fv && fv.low != null && fv.high != null ? (
      <div className="rl-fv">
        <div className="rl-fv-head">
          <span className="text-xs font-semibold text-text-muted">
            <T en="Fair value" bn="ন্যায্য দাম" />
          </span>
          {stance && (
            <span className={`text-sm font-semibold ${stance.tone}`}>
              <T en={stance.en} bn={stance.bn} />
            </span>
          )}
        </div>
        <FairValueBar low={fv.low} high={fv.high} price={s.price} />
        <div className="rl-fv-scale nums">
          <span>{money(fv.low)}</span>
          <span className="text-text-main font-semibold">
            <T en="Today" bn="আজ" /> {money(s.price)}
          </span>
          <span>{money(fv.high)}</span>
        </div>
      </div>
    ) : null;

  return (
    <article className="soft-card rl-card" id={masked ? undefined : `stock-${s.code}`}>
      <header className="rl-card-head">
        <StockRank n={s.rank} solid={s.rank <= 3} />
        {masked ? (
          <div className="rl-card-ident">
            <MaskedName name={s.name} />
            {s.sector && (
              <span className="rl-card-code">
                <T en={s.sector} bn={sectorBn(s.sector)} />
              </span>
            )}
          </div>
        ) : (
          <>
            <div className="rl-card-ident">
              <Link prefetch={false} href={`/stock/${s.code}`} className="rl-card-name">
                {s.name || s.code}
              </Link>
              <span className="rl-card-code">
                {s.code}
                <PersonalMark code={s.code} />
              </span>
            </div>
            <div className="rl-card-price">
              <span className="nums text-base font-bold text-text-main">{money(s.price)}</span>
              {s.change_pct != null && <span className={`nums text-xs font-semibold ${changeTone(s.change_pct)}`}>{changePct(s.change_pct)}</span>}
            </div>
          </>
        )}
      </header>

      <p className="rl-why">
        <T en={s.headline_en} bn={s.headline_bn} />
      </p>

      <div className="rl-card-tags">
        <ScoreBadge score={s.score} size="sm" />
        <span className="text-sm font-semibold text-text-main">
          <T en={TIER_LABELS[tier]} bn={TIER_LABELS_BN[tier]} />
        </span>
        <SignalChip signal={s.signal} strength={s.strength} />
      </div>

      {!masked && fairValue}

      {stats.length > 0 && (
        <div className={`rl-stats rl-stats--${stats.length}`}>
          {stats.map((x) => (
            <Stat key={x.key} value={x.value} label={x.label} sub={x.sub} tone={x.tone ?? "default"} size="sm" />
          ))}
        </div>
      )}

      {s.risk && (
        <div className="rl-risk">
          <IconAlert size={16} />
          <p>
            <span className="rl-risk-title">
              <T en="What could go wrong: " bn="ঝুঁকি কোথায়: " />
            </span>
            <T en={s.risk.en} bn={s.risk.bn} />
            {s.risk.more > 0 && (
              <span className="text-text-muted">
                <T
                  en={` ${s.risk.more} more on the share's page.`}
                  bn={` শেয়ারের পেজে আরও ${s.risk.more}টি আছে।`}
                />
              </span>
            )}
          </p>
        </div>
      )}

      <details className="rl-checks">
        <summary>
          <span className="rl-checks-tick"><IconCheck size={12} /></span>
          <span>
            <T en={`Passed all ${s.checks.length} checks`} bn={`${s.checks.length}টি যাচাইয়েই পাস`} />
          </span>
          <span className="rl-checks-hint">
            <T en="See the numbers" bn="সংখ্যা দেখুন" />
          </span>
        </summary>
        <ul>
          {s.checks.map((c) => (
            <li key={c.key}>
              <span className="rl-check-label">
                <T en={c.label_en} bn={c.label_bn} />
              </span>
              <span className="rl-check-value">
                <T en={c.value_en} bn={c.value_bn} />
              </span>
            </li>
          ))}
        </ul>
      </details>

      {!masked && (
      <footer className="rl-card-foot">
        <Link prefetch={false} href={`/stock/${s.code}`} className="btn-link">
          <T en="Share page" bn="শেয়ারের পেজ" /> <IconArrowRight size={14} />
        </Link>
        {s.has_report && (
          <Link prefetch={false} href={`/stock/${s.code}/analysis`} className="btn-link">
            <T en="In-depth report" bn="বিস্তারিত বিশ্লেষণ" /> <IconArrowRight size={14} />
          </Link>
        )}
      </footer>
      )}
    </article>
  );
}
