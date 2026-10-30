import Link from "next/link";
import { getTier, TIER_LABELS, TIER_LABELS_BN } from "@/lib/constants";
import { checkWord, landingAnswer, landingLights, PILLARS, shortName, type LandingStock } from "@/lib/landing";
import { pillarColor } from "@/lib/insight-utils";
import { changePct, changeTone, money } from "@/lib/formatters";
import { sectorBn } from "@/lib/bn";
import { T } from "@/components/i18n/T";
import ScoreBadge from "@/components/ui/ScoreBadge";

/**
 * The hero's proof (2026-10-31): the stock page's answer card for one real
 * company — "Should you buy it today?", the answer, the three lights and the
 * five checks behind the grade. Everything comes from the /api/scores row the
 * page already has; the answer follows the backend signal, so it never
 * disagrees with the stock page's Buy / Sell chip.
 */
export default function AnswerCard({ stock }: { stock: LandingStock }) {
  const tier = getTier(stock.score);
  const answer = landingAnswer(stock);
  const lights = landingLights(stock, tier, TIER_LABELS[tier], TIER_LABELS_BN[tier]);
  const initials = shortName(stock)
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <article className="soft-card lp-lift p-5 sm:p-6" aria-label={`${stock.name ?? stock.code}, our answer`}>
      <div className="flex items-center gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-sm font-bold text-text-main"
          aria-hidden
        >
          {initials || stock.code.slice(0, 2)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold leading-snug text-text-main">{stock.name ?? stock.code}</p>
          <p className="truncate text-sm text-text-main">
            {stock.code}
            {stock.sector && (
              <>
                {" · "}
                <T en={stock.sector} bn={sectorBn(stock.sector)} />
              </>
            )}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold tabular-nums nums text-text-main">{money(stock.ltp)}</p>
          {stock.chg != null && (
            <p className={`text-sm font-semibold tabular-nums nums ${changeTone(stock.chg)}`}>
              {changePct(stock.chg)} <T en="today" bn="আজ" />
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 border-t border-border pt-5">
        <p className="text-sm font-semibold text-text-main">
          <T en="Should you buy it today?" bn="আজ কি এটি কেনা উচিত?" />
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="lp-word" data-size="lg" data-tone={answer.tone}>
            <T en={answer.en} bn={answer.bn} />
          </span>
          {(stock.reasonEn || stock.reasonBn) && (
            <p className="min-w-0 flex-1 basis-56 text-sm leading-relaxed text-text-main">
              <T en={stock.reasonEn ?? ""} bn={stock.reasonBn ?? stock.reasonEn ?? ""} />
            </p>
          )}
        </div>
      </div>

      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {lights.map((l) => (
          <li
            key={l.key}
            className="flex items-center justify-between gap-2 rounded-lg bg-bg px-3 py-2.5 sm:flex-col sm:items-start sm:justify-start"
          >
            <span className="text-xs font-semibold text-text-main">
              <T en={l.label.en} bn={l.label.bn} />
            </span>
            <span className="flex items-center gap-1.5 text-sm font-bold text-text-main">
              <span className="lp-dot" data-tone={l.word.tone} aria-hidden />
              <T en={l.word.en} bn={l.word.bn} />
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-5 border-t border-border pt-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-text-main">
            <T en="The five checks behind the grade" bn="গ্রেডের পেছনের পাঁচটি যাচাই" />
          </p>
          <ScoreBadge score={stock.score} tier={tier} size="sm" />
        </div>
        <div className="flex flex-col gap-2">
          {PILLARS.map((p, i) => {
            const v = stock.pillars[i];
            if (v == null) return null;
            const color = pillarColor(v);
            const word = checkWord(v);
            return (
              <div key={p.key} className="flex items-center gap-3 text-sm">
                <span className="w-24 shrink-0 text-text-main">
                  <T en={p.en} bn={p.bn} />
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                  <span className="block h-full rounded-full" style={{ width: `${Math.max(4, Math.min(100, v * 10))}%`, background: color }} />
                </span>
                <span className="w-20 shrink-0 text-right font-semibold text-text-main">
                  <T en={word.en} bn={word.bn} />
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <Link
        href={`/stock/${stock.code}`}
        prefetch={false}
        className="mt-5 flex min-h-11 items-center justify-between rounded-lg bg-surface-2 px-4 text-sm font-semibold text-primary-ink hover:bg-border/40"
      >
        <T en={`Open the ${stock.code} report`} bn={`${stock.code}-এর রিপোর্ট খুলুন`} />
        <span aria-hidden>→</span>
      </Link>
    </article>
  );
}
