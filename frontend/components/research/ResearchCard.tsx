"use client";

import Link from "next/link";
import type { ResearchStock } from "@/lib/api";
import { useLang } from "@/context/LangContext";
import { changePct, changeTone, money, takaGroup } from "@/lib/formatters";
import { getTier, TIER_LABELS, TIER_LABELS_BN } from "@/lib/constants";
import ScoreBadge from "@/components/ui/ScoreBadge";
import SignalChip from "@/components/ui/SignalChip";
import Stat from "@/components/ui/Stat";
import { StockRank } from "@/components/ui/StockRow";
import { PersonalMark } from "@/components/market-analysis/PersonalCodes";
import { IconAlert, IconArrowRight, IconCheck } from "@/components/ui/icons";

const STANCE: Record<string, { en: string; bn: string; tone: string }> = {
  cheap: { en: "Price looks cheap", bn: "দাম সস্তা মনে হচ্ছে", tone: "text-positive" },
  fair: { en: "Price looks fair", bn: "দাম ন্যায্য মনে হচ্ছে", tone: "text-primary-ink" },
  expensive: { en: "Price looks expensive", bn: "দাম বেশি মনে হচ্ছে", tone: "text-negative" },
};

/** Fair-value range as a bar: the shaded zone is our range, the dot is today's price. */
function FairValueBar({ low, high, price, bn }: { low: number; high: number; price: number | null; bn: boolean }) {
  const lo = Math.min(low, price ?? low) * 0.92;
  const hi = Math.max(high, price ?? high) * 1.08;
  const at = (v: number) => `${((v - lo) / (hi - lo)) * 100}%`;
  return (
    <div className="rl-fv-bar" aria-hidden>
      <span className="rl-fv-zone" style={{ left: at(low), width: `calc(${at(high)} - ${at(low)})` }} />
      {price != null && <span className="rl-fv-dot" style={{ left: at(price) }} title={bn ? "আজকের দাম" : "Today's price"} />}
    </div>
  );
}

/**
 * One stock's research card, numbers first: why it is on the list, the price
 * against our fair-value range, three figures that matter, the one thing that
 * could go wrong, then its own number on every check (folded). Every card is
 * Premium — the page puts them all behind one lock (ResearchLock).
 */
export default function ResearchCard({ s }: { s: ResearchStock }) {
  const { bn } = useLang();
  const t = (en: string, b: string) => (bn ? b : en);
  const fb = bn ? "font-bn" : undefined;
  const tier = getTier(s.score);
  const fv = s.fair_value;
  const stance = fv?.stance ? STANCE[fv.stance] : null;

  const stats: { key: string; value: string; label: string; tone?: "positive" | "negative" | "default"; sub?: string }[] = [];
  if (s.quarter?.eps_yoy_pct != null) {
    stats.push({
      key: "q",
      value: changePct(s.quarter.eps_yoy_pct, 0),
      tone: s.quarter.eps_yoy_pct >= 0 ? "positive" : "negative",
      label: t(`Profit, ${s.quarter.label_en ?? "this year"}`, `লাভ, ${s.quarter.label_bn ?? "এ বছর"}`),
    });
  }
  if (s.owners?.now != null) {
    const d = s.owners.delta ?? 0;
    stats.push({
      key: "o",
      value: `${s.owners.now.toFixed(1)}%`,
      label: t("Owners (sponsors) hold", "উদ্যোক্তাদের হাতে"),
      sub: Math.abs(d) >= 0.5 && s.owners.prev != null
        ? t(`was ${s.owners.prev.toFixed(1)}%`, `আগে ${s.owners.prev.toFixed(1)}%`)
        : undefined,
    });
  }
  if (s.cash_per_10k != null) {
    stats.push({
      key: "c",
      value: takaGroup(s.cash_per_10k),
      label: t("Cash a year on ৳10,000", "৳10,000-এ বছরে নগদ"),
    });
  }

  const fairValue =
    fv && fv.low != null && fv.high != null ? (
      <div className="rl-fv">
        <div className="rl-fv-head">
          <span className="text-xs font-semibold text-text-muted">{t("Fair value", "ন্যায্য দাম")}</span>
          {stance && <span className={`text-sm font-semibold ${stance.tone} ${fb ?? ""}`.trim()}>{t(stance.en, stance.bn)}</span>}
        </div>
        <FairValueBar low={fv.low} high={fv.high} price={s.price} bn={bn} />
        <div className="rl-fv-scale nums">
          <span>{money(fv.low)}</span>
          <span className="text-text-main font-semibold">{t("Today", "আজ")} {money(s.price)}</span>
          <span>{money(fv.high)}</span>
        </div>
      </div>
    ) : null;

  return (
    <article className="soft-card rl-card" id={`stock-${s.code}`} lang={bn ? "bn" : undefined}>
      <header className="rl-card-head">
        <StockRank n={s.rank} solid={s.rank <= 3} />
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
      </header>

      <p className={`rl-why ${fb ?? ""}`.trim()}>{t(s.headline_en, s.headline_bn)}</p>

      <div className="rl-card-tags">
        <ScoreBadge score={s.score} size="sm" />
        <span className={`text-sm font-semibold text-text-main ${fb ?? ""}`.trim()}>
          {bn ? TIER_LABELS_BN[tier] : TIER_LABELS[tier]}
        </span>
        <SignalChip signal={s.signal} strength={s.strength} lang={bn ? "bn" : "en"} />
      </div>

      {fairValue}

      {stats.length > 0 && (
        <div className={`rl-stats rl-stats--${stats.length}`}>
          {stats.map((x) => (
            <Stat key={x.key} value={x.value} label={<span className={fb}>{x.label}</span>} sub={x.sub}
              tone={x.tone ?? "default"} size="sm" />
          ))}
        </div>
      )}

      {s.risk && (
        <div className="rl-risk">
          <IconAlert size={16} />
          <p className={fb}>
            <span className="rl-risk-title">{t("What could go wrong: ", "কী ভুল হতে পারে: ")}</span>
            {t(s.risk.en, s.risk.bn)}
            {s.risk.more > 0 && (
              <span className="text-text-muted">
                {t(` (+${s.risk.more} more on the stock page)`, ` (স্টকের পাতায় আরও ${s.risk.more}টি)`)}
              </span>
            )}
          </p>
        </div>
      )}

      <details className="rl-checks">
        <summary>
          <span className="rl-checks-tick"><IconCheck size={12} /></span>
          <span className={fb}>{t(`Passed all ${s.checks.length} checks`, `${s.checks.length}টি যাচাইয়েই পাস`)}</span>
          <span className={`rl-checks-hint ${fb ?? ""}`.trim()}>{t("See the numbers", "সংখ্যা দেখুন")}</span>
        </summary>
        <ul>
          {s.checks.map((c) => (
            <li key={c.key} className={fb}>
              <span className="rl-check-label">{t(c.label_en, c.label_bn)}</span>
              <span className="rl-check-value">{t(c.value_en, c.value_bn)}</span>
            </li>
          ))}
        </ul>
      </details>

      <footer className="rl-card-foot">
        <Link prefetch={false} href={`/stock/${s.code}`} className="btn-link">
          {t("Stock page", "স্টকের পাতা")} <IconArrowRight size={14} />
        </Link>
        {s.has_report && (
          <Link prefetch={false} href={`/stock/${s.code}/analysis`} className="btn-link">
            {t("In-depth report", "বিস্তারিত বিশ্লেষণ")} <IconArrowRight size={14} />
          </Link>
        )}
      </footer>
    </article>
  );
}
