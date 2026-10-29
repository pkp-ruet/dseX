import Link from "next/link";
import ScoreBadge from "@/components/ui/ScoreBadge";
import SignalChip from "@/components/ui/SignalChip";
import Chip from "@/components/ui/Chip";
import PfCard from "./PfCard";
import AnswerLock from "@/components/premium/AnswerLock";
import { money, takaGroup } from "@/lib/formatters";
import type { AnalysisLang, RebalancePlan } from "@/lib/portfolio-analysis";

interface Props {
  plan: RebalancePlan;
  lang?: AnalysisLang;
}

/**
 * "What to buy next" (2026-10-28 on the recommendation engine, `planFromEngine`):
 * the gaps in the portfolio, then up to three ideas — every one carries a Buy
 * signal today and passes the engine's safety checks, so this card never
 * contradicts a stock page or the dashboard's "Picked for you". Each idea shows
 * what gap it fills, its numbers, the signal's own reason, one watch-out and
 * an example amount. With gaps but no idea passing, it says so plainly; with
 * no gaps, it shows the reader's best-fitting picks instead of hiding.
 */
export default function RebalanceHelper({ plan, lang = "en" }: Props) {
  if (plan.gaps.length === 0 && plan.picks.length === 0) return null;
  const bn = lang === "bn";
  const L = (en: string, b: string) => (bn ? b : en);

  return (
    <div id="pf-buynext" className="dash-section">
      <PfCard
        title={L("What to buy next", "এরপর কী কিনবেন")}

        note={L(
          "Only stocks with a Buy signal today that also pass our safety checks: a profit, no auditor or regulator warnings, loans under control.",
          "শুধু আজ কেনার সংকেত আছে এবং আমাদের নিরাপত্তা যাচাই পার হয়েছে এমন শেয়ার: মুনাফা আছে, নিরীক্ষক বা নিয়ন্ত্রকের সতর্কতা নেই, ঋণ নিয়ন্ত্রণে।",
        )}
        lang={lang}
        flush
        dataCard="rebalance"
      >
        <div className={bn ? "font-bn" : ""} lang={bn ? "bn" : undefined}>
          {/* Whole or nothing: the gaps and the ideas sit behind one lock. */}
          <AnswerLock
            job="watch"
            lock="Portfolio: what to buy next"
            boxClassName="mx-4 mb-4 sm:mx-6"
            lines={[
              ...(plan.gaps.length > 0
                ? [{
                    en: `What your portfolio is missing: ${plan.gaps.length} gap${plan.gaps.length === 1 ? "" : "s"}`,
                    bn: `আপনার পোর্টফোলিওতে যা কম: ${plan.gaps.length}টি`,
                  }]
                : []),
              {
                en: `${plan.picks.length || "The"} share${plan.picks.length === 1 ? "" : "s"} that pass every safety check and fit what you own`,
                bn: `${plan.picks.length ? `${plan.picks.length}টি ` : ""}শেয়ার যা সব নিরাপত্তা যাচাই পার হয়েছে আর আপনার শেয়ারের সাথে মানায়`,
              },
              { en: "An example amount for each, with its one watch-out", bn: "প্রতিটির জন্য উদাহরণ পরিমাণ, আর একটি সতর্কতা" },
            ]}
          >
          {/* The gaps — or, with none, why these ideas */}
          {plan.gaps.length > 0 ? (
            <div className="px-4 pb-4 sm:px-6">
              <h4 className="text-sm font-bold text-text-main">{L("What your portfolio is missing", "আপনার পোর্টফোলিওতে যা কম")}</h4>
              <ul className="mt-2 flex flex-col gap-2">
                {plan.gaps.map((g, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="pf-dot pf-dot--watch mt-2" aria-hidden />
                    <span className="min-w-0 text-sm leading-relaxed text-text-main">{g}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="px-4 pb-4 text-sm leading-relaxed text-text-main sm:px-6">
              {L(
                "Your portfolio has no big gaps. If you want to add, these fit it best.",
                "আপনার পোর্টফোলিওতে বড় কোনো ফাঁক নেই। আরও কিনতে চাইলে এগুলো সবচেয়ে মানানসই।",
              )}
            </p>
          )}

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
                        <Chip>{p.tag}</Chip>
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
                          : p.kind === "add_more"
                          ? L(
                              `about ${p.suggest.shares} more shares (${takaGroup(p.suggest.amount)}) on top of what you own.`,
                              `আপনার যা আছে তার ওপর প্রায় ${p.suggest.shares}টি শেয়ার (${takaGroup(p.suggest.amount)}) আরও।`,
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
          </AnswerLock>

          <p className="border-t border-cell-rule px-4 py-3 text-xs leading-relaxed text-text-muted sm:px-6">
            {L(
              `Ideas come from the ${plan.passed} of today's ${plan.buyPool} Buy signals that pass every safety check, the same pool as your dashboard's picks, and change as prices move. They are not financial advice, so please check a share yourself before buying.`,
              `প্রস্তাবগুলো আজকের ${plan.buyPool}টি কেনার সংকেতের মধ্যে সব নিরাপত্তা যাচাই পার হওয়া ${plan.passed}টি থেকে নেওয়া (ড্যাশবোর্ডের বাছাইয়ের মতোই), আর দাম বদলালে বদলায়। এগুলো বিনিয়োগ পরামর্শ নয়, তাই কেনার আগে নিজে যাচাই করুন।`,
            )}
          </p>
        </div>
      </PfCard>
    </div>
  );
}
