"use client";

import Card from "@/components/ui/Card";
import Stat from "@/components/ui/Stat";
import Button from "@/components/ui/Button";
import Bn from "@/components/i18n/Bn";
import PremiumGate from "@/components/premium/PremiumGate";
import { takaGroup } from "@/lib/formatters";
import type { MoneyMade } from "@/lib/portfolio-ledger";
import type { AnalysisLang } from "@/lib/portfolio-analysis";
import type { PortfolioSettings } from "@/lib/api";

const signed = (v: number | null) => (v == null ? "—" : `${v > 0 ? "+" : ""}${takaGroup(v)}`);
const tone = (v: number | null) => (v == null || v === 0 ? "default" : v > 0 ? "positive" : "negative") as
  | "default"
  | "positive"
  | "negative";
const TONE_CLS = { default: "text-text-main", positive: "text-positive", negative: "text-negative" } as const;

/**
 * "Money you've made so far" — the three ways a portfolio pays you, added up:
 * on paper (shares still held) + sold (profit locked in by sales) + cash
 * dividends received. Free. The same figures after the reader's fee and
 * dividend-tax settings sit behind the Premium lock.
 *
 * Renders nothing until there is a sale or a dividend in the log — before that
 * it would only repeat the hero's profit line.
 */
export default function MoneyMadeCard({
  made,
  settings,
  lang,
  onEditSettings,
}: {
  made: MoneyMade;
  settings: PortfolioSettings;
  lang: AnalysisLang;
  onEditSettings: () => void;
}) {
  if (!made.hasHistory) return null;
  const bn = lang === "bn";
  const L = (en: string, b: string) => (bn ? b : en);

  return (
    <Card padding="none" className="p-5 sm:p-6" data-card="money-made">
      <h2 className={`text-lg font-bold text-text-main ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
        {L("Money you've made so far", "এ পর্যন্ত আপনার আয়")}
      </h2>
      {!bn && <Bn className="text-sm text-text-muted">এ পর্যন্ত আপনার আয় — কাগজে, বিক্রিতে আর ডিভিডেন্ডে।</Bn>}

      <div className="mt-4">
        <Stat
          size="xl"
          value={<span className="pv">{signed(made.total)}</span>}
          tone={tone(made.total)}
          label={L("In total — before fees and tax", "মোট — খরচ ও কর বাদ দেওয়ার আগে")}
        />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4">
        <Stat
          size="sm"
          value={<span className="pv">{signed(made.onPaper)}</span>}
          tone={tone(made.onPaper)}
          label={L("On paper", "কাগজে-কলমে")}
          sub={L("shares you still hold", "যে শেয়ার এখনো আছে")}
        />
        <Stat
          size="sm"
          value={<span className="pv">{signed(made.sold)}</span>}
          tone={tone(made.sold)}
          label={L("From sales", "বিক্রি থেকে")}
          sub={L(`${made.sales} sale${made.sales === 1 ? "" : "s"}`, `${made.sales}টি বিক্রি`)}
        />
        <Stat
          size="sm"
          value={<span className="pv">{signed(made.dividends)}</span>}
          tone={made.dividends > 0 ? "positive" : "default"}
          label={L("Cash dividends", "নগদ ডিভিডেন্ড")}
          sub={L(`${made.dividendPayments} payment${made.dividendPayments === 1 ? "" : "s"}`, `${made.dividendPayments}টি`)}
        />
      </div>

      <PremiumGate
        className="mt-4"
        compact
        label={L("After fees and tax", "খরচ ও কর বাদে")}
        stakes={[L("What you actually take home, after fees and tax", "খরচ ও কর বাদে আসলে যা হাতে আসে")]}
      >
        <div className="rounded-lg bg-surface-2 p-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className={`text-sm font-semibold text-text-main ${bn ? "font-bn" : ""}`}>
              {L("What you take home", "হাতে যা আসে")}
            </p>
            <p className={`pv nums text-lg font-bold ${TONE_CLS[tone(made.net.total)]}`}>
              {signed(made.net.total)}
            </p>
          </div>
          <p className={`mt-1 text-sm text-text-muted ${bn ? "font-bn" : ""}`}>
            {L(
              `After about ${takaGroup(made.net.fees)} in brokerage fees (${settings.fee_pct}% a side, including selling what you hold today) and ${takaGroup(made.net.tax)} dividend tax (${settings.div_tax_pct}%).`,
              `প্রায় ${takaGroup(made.net.fees)} ব্রোকারেজ খরচ (প্রতি লেনদেনে ${settings.fee_pct}%, আজ সব বিক্রি ধরে) আর ${takaGroup(made.net.tax)} ডিভিডেন্ড কর (${settings.div_tax_pct}%) বাদে।`,
            )}
          </p>
          <Button type="button" variant="link" size="sm" onClick={onEditSettings} className="-ml-2 mt-1">
            {L("Change my fee and tax rates", "আমার খরচ ও করের হার বদলান")}
          </Button>
        </div>
      </PremiumGate>
    </Card>
  );
}
