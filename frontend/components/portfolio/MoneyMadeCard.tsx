"use client";

import PfCard from "./PfCard";
import Stat from "@/components/ui/Stat";
import { takaGroup } from "@/lib/formatters";
import type { MoneyMade } from "@/lib/portfolio-ledger";
import type { AnalysisLang } from "@/lib/portfolio-analysis";
import type { PortfolioSettings } from "@/lib/api";

const signed = (v: number | null) =>
  v == null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${takaGroup(Math.abs(v))}`;
type Tone = "default" | "positive" | "negative";
const tone = (v: number | null): Tone => (v == null || v === 0 ? "default" : v > 0 ? "positive" : "negative");
const TONE_CLS: Record<Tone, string> = { default: "text-text-main", positive: "pf-up", negative: "pf-down" };

/**
 * "Money you've made so far" — the three ways a portfolio pays you, added up:
 * on paper (shares still held) + sold (profit locked in by sales) + cash
 * dividends received, then the same figures after the reader's fee and
 * dividend-tax settings. All free.
 *
 * 2026-10-26 clean look: the total leads as one big number; the three parts
 * are hairline rows (label + small line left, figure right — three columns of
 * money did not fit a phone); "what you take home" is the card's one quiet
 * panel, with the settings link inside it.
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
  const bnText = bn ? "font-bn" : "";

  const parts: { key: string; label: string; sub: string; value: number | null; tone: Tone }[] = [
    {
      key: "paper",
      label: L("On paper", "কাগজে-কলমে"),
      sub: L("Shares you still hold", "যে শেয়ার এখনো আছে"),
      value: made.onPaper,
      tone: tone(made.onPaper),
    },
    {
      key: "sold",
      label: L("From sales", "বিক্রি থেকে"),
      sub: L(`${made.sales} sale${made.sales === 1 ? "" : "s"}`, `${made.sales}টি বিক্রি`),
      value: made.sold,
      tone: tone(made.sold),
    },
    {
      key: "div",
      label: L("Cash dividends", "নগদ ডিভিডেন্ড"),
      sub: L(
        `${made.dividendPayments} payment${made.dividendPayments === 1 ? "" : "s"}`,
        `${made.dividendPayments}টি পেমেন্ট`,
      ),
      value: made.dividends,
      tone: made.dividends > 0 ? "positive" : "default",
    },
  ];

  return (
    <PfCard
      title={L("Money you've made so far", "এ পর্যন্ত আপনার আয়")}

      note={L("On paper, from sales and from dividends, added up.", "কাগজে-কলমে, বিক্রি থেকে আর ডিভিডেন্ড থেকে, সব মিলিয়ে।")}
      lang={lang}
      dataCard="money-made"
    >
      <div className={bnText} lang={bn ? "bn" : undefined}>
        <Stat
          size="xl"
          value={<span className="pv">{signed(made.total)}</span>}
          tone={tone(made.total)}
          label={L("In total, before fees and tax", "মোট, খরচ ও কর বাদ দেওয়ার আগে")}
        />
      </div>

      <ul className={`pf-rows mt-4 border-t border-cell-rule ${bnText}`} lang={bn ? "bn" : undefined}>
        {parts.map((p) => (
          <li key={p.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
            <div className="min-w-0">
              <p className="m-0 text-sm font-semibold text-text-main">{p.label}</p>
              <p className="m-0 text-xs font-semibold text-text-muted">{p.sub}</p>
            </div>
            <span className={`pv pf-num text-base font-bold ${TONE_CLS[p.tone]}`}>{signed(p.value)}</span>
          </li>
        ))}
      </ul>

      <div className={`mt-3 rounded-lg bg-surface-2 px-4 py-3 ${bnText}`} lang={bn ? "bn" : undefined}>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
          <p className="m-0 text-sm font-semibold text-text-main">{L("What you take home", "হাতে যা আসে")}</p>
          <p className={`pv pf-num m-0 text-lg font-bold ${TONE_CLS[tone(made.net.total)]}`}>{signed(made.net.total)}</p>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-text-muted">
          {L(
            `After about ${takaGroup(made.net.fees)} in brokerage fees (${settings.fee_pct}% each way, counting a sale of what you hold today) and ${takaGroup(made.net.tax)} dividend tax (${settings.div_tax_pct}%).`,
            `প্রায় ${takaGroup(made.net.fees)} ব্রোকারেজ খরচ (প্রতি লেনদেনে ${settings.fee_pct}%, আজ সব বিক্রি ধরে) আর ${takaGroup(made.net.tax)} ডিভিডেন্ড কর (${settings.div_tax_pct}%) বাদে।`,
          )}
        </p>
        <button type="button" className="pf-link" onClick={onEditSettings}>
          {L("Change my fee and tax rates", "আমার খরচ ও করের হার বদলান")} <span aria-hidden="true">→</span>
        </button>
      </div>
    </PfCard>
  );
}
