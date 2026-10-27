import Link from "next/link";
import ScoreBadge from "@/components/ui/ScoreBadge";
import SignalChip from "@/components/ui/SignalChip";
import Chip from "@/components/ui/Chip";
import PfCard from "./PfCard";
import PremiumBlur from "@/components/premium/PremiumBlur";
import { money, takaGroup } from "@/lib/formatters";
import type { AnalysisLang, RebalancePick, RebalancePlan } from "@/lib/portfolio-analysis";

interface Props {
  plan: RebalancePlan;
  lang?: AnalysisLang;
}

/**
 * "What to buy next" (rebuilt 2026-10-26, `buildRebalancePlan`): the gaps in
 * the portfolio, then up to three ideas — every one carries a Buy signal
 * today, so this card never contradicts a stock page. Each idea shows what
 * gap it fills, its numbers, the signal's own reason, one watch-out and an
 * example amount. With gaps but no idea passing, it says so plainly.
 * Renders nothing when there is no gap.
 */
export default function RebalanceHelper({ plan, lang = "en" }: Props) {
  if (plan.gaps.length === 0) return null;
  const bn = lang === "bn";
  const L = (en: string, b: string) => (bn ? b : en);

  const kindTag = (p: RebalancePick) =>
    p.kind === "swap"
      ? L(`Instead of ${p.replaces}`, `${p.replaces}-এর বদলে`)
      : p.kind === "dividend"
        ? L("Steady dividend", "নিয়মিত ডিভিডেন্ড")
        : p.kind === "new_sector"
          ? L("New sector for you", "আপনার নতুন সেক্টর")
          : L("Spreads your money", "টাকা ছড়ায়");

  return (
    <div id="pf-buynext" className="dash-section">
      <PfCard
        title={L("What to buy next", "এরপর কী কিনবেন")}

        note={L(
          "Only stocks with a Buy signal today: a good company, a good price, enough trading, fresh accounts.",
          "শুধু আজ কেনার সংকেত আছে এমন শেয়ার: ভালো কোম্পানি, ভালো দাম, যথেষ্ট লেনদেন, নতুন হিসাব।",
        )}
        lang={lang}
        flush
        dataCard="rebalance"
      >
        <div className={bn ? "font-bn" : ""} lang={bn ? "bn" : undefined}>
          {/* The gaps */}
          <div className="px-4 pb-4 sm:px-6">
            <h4 className="text-sm font-bold text-text-main">{L("What your portfolio is missing", "আপনার পোর্টফোলিওতে যা কম")}</h4>
            <PremiumBlur lang={lang} cta={false}>
            <ul className="mt-2 flex flex-col gap-2">
              {plan.gaps.map((g, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="pf-dot pf-dot--watch mt-2" aria-hidden />
                  <span className="min-w-0 text-sm leading-relaxed text-text-main">{g}</span>
                </li>
              ))}
            </ul>
            </PremiumBlur>
          </div>

          <PremiumBlur lang={lang}>
          {plan.picks.length === 0 ? (
            <p className="border-t border-cell-rule px-4 py-4 text-sm leading-relaxed text-text-main sm:px-6">
              {plan.noneReason}
            </p>
          ) : (
            <ul className="pf-rows border-t border-cell-rule">
              {plan.picks.map((p) => (
                <li key={p.code} className="px-4 py-5 sm:px-6">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Chip>{kindTag(p)}</Chip>
                        <SignalChip signal="buy" strength={p.strong ? "strong" : "normal"} lang={bn ? "bn" : "en"} />
                      </div>
                      <Link
                        prefetch={false}
                        href={`/stock/${p.code}`}
                        className="mt-2 block truncate text-base font-bold text-text-main hover:text-primary-ink"
                      >
                        {p.companyName ?? p.code}
                      </Link>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-text-muted">
                        <span className="font-bold text-text-main">{p.code}</span>
                        {p.sector && <span className="truncate">{p.sector}</span>}
                        {p.ltp != null && <span className="pf-num">{money(p.ltp)}</span>}
                      </p>
                    </div>
                    {p.score != null && <ScoreBadge score={p.score} size="sm" />}
                  </div>

                  <p className="mt-3 text-sm font-semibold leading-relaxed text-text-main">{p.why}</p>

                  {(p.evidence.length > 0 || p.watch) && (
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {p.evidence.map((e, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-text-main">
                          <span className="pf-dot pf-dot--good mt-1.5" aria-hidden />
                          <span className="min-w-0">{e}</span>
                        </li>
                      ))}
                      {p.watch && (
                        <li className="flex items-start gap-2.5 text-sm text-text-main">
                          <span className="pf-dot pf-dot--watch mt-1.5" aria-hidden />
                          <span className="min-w-0">
                            <span className="font-semibold">{L("Watch: ", "নজর রাখুন: ")}</span>
                            {p.watch}
                          </span>
                        </li>
                      )}
                    </ul>
                  )}

                  {p.signalReason && (
                    <p className="mt-3 text-sm leading-relaxed text-text-muted">
                      <span className="font-semibold text-text-main">{L("Why it's a Buy today: ", "আজ কেন কেনার সংকেত: ")}</span>
                      {p.signalReason}
                    </p>
                  )}

                  {p.suggest && (
                    <div className="mt-3 rounded-lg bg-surface-2 px-3 py-2.5 text-sm text-text-main">
                      <span className="font-semibold">{L("Example: ", "উদাহরণ: ")}</span>
                      <span className="pv pf-num">
                        {p.kind === "swap"
                          ? L(
                              `about ${p.suggest.shares} shares (${takaGroup(p.suggest.amount)}), roughly the money now in ${p.replaces}.`,
                              `প্রায় ${p.suggest.shares}টি শেয়ার (${takaGroup(p.suggest.amount)}), এখন ${p.replaces}-এ যত টাকা আছে প্রায় ততটা।`,
                            )
                          : L(
                              `about ${p.suggest.shares} shares (${takaGroup(p.suggest.amount)}) would make it about ${Math.round(p.suggest.targetPct)}% of your money.`,
                              `প্রায় ${p.suggest.shares}টি শেয়ার (${takaGroup(p.suggest.amount)}) কিনলে এটি আপনার টাকার প্রায় ${Math.round(p.suggest.targetPct)}% হবে।`,
                            )}
                      </span>
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap gap-x-4">
                    <Link prefetch={false} href={`/stock/${p.code}`} className="pf-link">
                      {L(`Read ${p.code}'s full page`, `${p.code}-এর পুরো পেজ দেখুন`)}
                    </Link>
                    <a href="#pf-whatif" className="pf-link">
                      {L("Try it in the what-if check", "যদি-এমন-করি যাচাইয়ে দেখুন")}
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
          </PremiumBlur>

          <p className="border-t border-cell-rule px-4 py-3 text-xs leading-relaxed text-text-muted sm:px-6">
            {L(
              `Ideas come from today's ${plan.buyPool} Buy signals and change as prices move. They are not financial advice, so please check a share yourself before buying.`,
              `প্রস্তাবগুলো আজকের ${plan.buyPool}টি কেনার সংকেত থেকে নেওয়া, আর দাম বদলালে বদলায়। এগুলো বিনিয়োগ পরামর্শ নয়, তাই কেনার আগে নিজে যাচাই করুন।`,
            )}
          </p>
        </div>
      </PfCard>
    </div>
  );
}
