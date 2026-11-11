"use client";

import { useEffect, useMemo, useRef } from "react";
import Button from "@/components/ui/Button";
import Link from "@/components/ui/Link";
import TierPill from "@/components/ui/TierPill";
import { ToneChip, tx } from "@/components/report/chip";
import { IconAlert, IconCheck, IconLock } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import type { PortfolioHolding, ScoreItem } from "@/lib/api";
import { getTier } from "@/lib/constants";
import { takaGroup } from "@/lib/formatters";
import { buildPortfolioFit, suggestSpend, type FitLine } from "@/lib/portfolio-fit";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";
import type { Bi, Tone } from "@/lib/stock-report";

/** What a changed line is about, in a few words (the free reader's count). */
const ABOUT: Partial<Record<FitLine["key"], Bi>> = {
  grade: { en: "your grade", bn: "আপনার গ্রেড" },
  sector: { en: "your spread", bn: "টাকার বণ্টন" },
  finance: { en: "your spread", bn: "টাকার বণ্টন" },
  strong: { en: "money in strong companies", bn: "শক্তিশালী কোম্পানিতে টাকা" },
  cash: { en: "your cash dividends", bn: "নগদ ডিভিডেন্ড" },
  count: { en: "how many shares carry your money", bn: "কয়টি শেয়ার আপনার টাকা বহন করছে" },
  avg: { en: "your average price", bn: "আপনার গড় দাম" },
};

const GRADES = ["A", "B", "C", "D", "F"];

const listOf = (xs: string[], and: string) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} ${and} ${xs[xs.length - 1]}` : xs[0] ?? "");

/**
 * "Before you save" (2026-11-11, mockup
 * https://claude.ai/artifact/QJjjrtfUu1ZSJ4rd7wvVeY): in the Add stock and
 * Bought more sheets, under the price and the share count. The same buy run
 * through the portfolio page's own grade before and after
 * (`buildPortfolioFit`, the stock page's "What would it do to your
 * portfolio?").
 * - Everyone: the share's group word, a Z category or a loss in its latest
 *   results, and its part of the money after the buy (facts, all free).
 * - Free: how many things change in the portfolio check, and what they are
 *   about, never which way; one gold line to Premium.
 * - Premium: the grade before and after, each change, a warning when a line
 *   is crossed, and a sensible size with "Use N" to set it in one tap.
 * It never stops the reader from saving.
 */
export default function BeforeYouSave({
  code,
  qty,
  price,
  holdings,
  priceMap,
  onUseQty,
  source,
  plan,
}: {
  code: string;
  qty: number | null;
  price: number | null;
  holdings: PortfolioHolding[];
  priceMap: Map<string, ScoreItem>;
  onUseQty?: (n: number) => void;
  source: "add" | "more";
  /** What the portfolio check's plan says for this share (Bought more), if anything. */
  plan?: { label: Bi; line: Bi } | null;
}) {
  const { bn } = useLang();
  const { isPremium, state } = usePremium();
  const CODE = code.trim().toUpperCase();
  const item = priceMap.get(CODE);
  const ltp = item?.ltp ?? null;

  const fit = useMemo(
    () =>
      CODE && qty && qty > 0 && holdings.length && ltp
        ? buildPortfolioFit({ holdings, priceMap, code: CODE, ltp, qty, price })
        : null,
    [CODE, qty, price, holdings, priceMap, ltp],
  );

  // The sensible size: the stock page's suggestion for this portfolio.
  const sensible = useMemo(() => {
    if (!fit || !ltp) return null;
    const value = (h: PortfolioHolding) => h.qty * (priceMap.get(h.trading_code.toUpperCase())?.ltp ?? h.buy_price);
    const total = holdings.reduce((s, h) => s + value(h), 0);
    const heldValue = holdings.filter((h) => h.trading_code.toUpperCase() === CODE).reduce((s, h) => s + value(h), 0);
    const n = Math.max(1, Math.floor(suggestSpend(total, holdings.length, ltp, heldValue) / ltp));
    const why: Bi =
      heldValue > 0
        ? { en: "a quarter more than you have", bn: "আপনার যা আছে তার এক-চতুর্থাংশ বেশি" }
        : holdings.length < 5
          ? { en: "an equal part of your money", bn: "আপনার টাকার সমান একটি ভাগ" }
          : { en: "about a tenth of your money", bn: "আপনার টাকার প্রায় দশ ভাগের এক ভাগ" };
    return { n, amount: n * ltp, why };
  }, [fit, ltp, holdings, priceMap, CODE]);

  const seen = useRef<string | null>(null);
  useEffect(() => {
    if (!fit || seen.current === CODE) return;
    seen.current = CODE;
    trackEvent("buy_check_view", { source, state, changed: fit.changed, grade_move: fit.gradeFrom === fit.gradeTo ? 0 : 1 });
  }, [fit, CODE, source, state]);

  if (!fit || !item) return null;

  const weight = fit.lines.find((l) => l.key === "weight");
  const changed = fit.lines.filter((l) => l.changed && l.key !== "weight");
  const abouts = [...new Map(changed.map((l) => ABOUT[l.key]).filter(Boolean).map((b) => [b!.en, b!])).values()];
  const z = (item.market_category ?? "").toUpperCase() === "Z";
  const loss = item.eps != null && item.eps <= 0;
  const tier = item.score != null ? getTier(item.score) : null;

  const gUp = GRADES.indexOf(fit.gradeTo) < GRADES.indexOf(fit.gradeFrom);
  const gDown = GRADES.indexOf(fit.gradeTo) > GRADES.indexOf(fit.gradeFrom);
  const good = changed.filter((l) => l.tone === "good").length;
  const bad = changed.filter((l) => l.tone === "bad").length;
  const verdict: { word: Bi; tone: Tone } =
    gUp || (!gDown && !fit.warning && good > bad)
      ? { word: { en: "Better for you", bn: "আপনার জন্য ভালো" }, tone: "good" }
      : gDown || bad > good
        ? { word: { en: "Worse for you", bn: "আপনার জন্য খারাপ" }, tone: "bad" }
        : fit.warning
          ? { word: { en: "Worth a second look", bn: "আরেকবার দেখুন" }, tone: "fair" }
          : { word: { en: "About the same", bn: "প্রায় একই" }, tone: "neutral" };

  const onLock = () => {
    trackEvent("premium_lock_tap", { area: "portfolio", lock: "pf-buy-check", state, job: "watch" });
    savePremiumContext({
      from: "portfolio",
      label: bn ? "কেনার আগে পোর্টফোলিও যাচাই" : "A check on your portfolio before every buy",
      stakes: [bn ? `${CODE} কিনলে আপনার পোর্টফোলিওতে ${abouts.length}টি জিনিস বদলায়` : `Buying ${CODE} changes ${abouts.length} things in your portfolio`],
    });
  };

  return (
    <div className="bys" aria-live="polite">
      <div className="bys-h">
        <p className="bys-title">
          <T en="Before you save" bn="সেভ করার আগে" />
        </p>
        {isPremium ? <ToneChip word={verdict.word} tone={verdict.tone} /> : tier && <TierPill tier={tier} />}
      </div>

      {/* Facts, free for everyone */}
      {isPremium && tier && (
        <p className="bys-fact">
          <TierPill tier={tier} />
        </p>
      )}
      {(z || loss) && (
        <p className="bys-fact bys-fact--bad">
          <IconAlert size={15} />
          <span>
            {z && loss ? (
              <T
                en={`${CODE} is in DSE's Z category, and it made a loss in its latest results.`}
                bn={`${CODE} DSE-এর Z ক্যাটাগরিতে, আর সর্বশেষ ফলে লোকসান করেছে।`}
              />
            ) : z ? (
              <T en={`${CODE} is in DSE's Z category.`} bn={`${CODE} DSE-এর Z ক্যাটাগরিতে।`} />
            ) : (
              <T en={`${CODE} made a loss in its latest results.`} bn={`সর্বশেষ ফলে ${CODE} লোকসান করেছে।`} />
            )}
          </span>
        </p>
      )}
      {weight && (
        <p className="bys-fact">
          <span className="pv">
            {fit.held && weight.from !== "0%" ? (
              <T en={`It would be ${weight.to} of your money, up from ${weight.from}.`} bn={`এটি হবে আপনার টাকার ${weight.to}, এখন ${weight.from}।`} />
            ) : (
              <T en={`It would be ${weight.to} of your money.`} bn={`এটি হবে আপনার টাকার ${weight.to}।`} />
            )}
          </span>
        </p>
      )}
      {!z && !loss && !fit.warning && (
        <p className="bys-fact">
          <IconCheck size={15} />
          <span>
            <T en={`No warnings on ${CODE} today.`} bn={`আজ ${CODE}-এ কোনো সতর্কতা নেই।`} />
          </span>
        </p>
      )}

      {isPremium ? (
        <>
          <div className="bys-grade">
            <span>
              <T en="Your grade" bn="আপনার গ্রেড" />
            </span>
            <span className="bys-ladder">
              <span className={`pf-gbox pf-g-${fit.gradeFrom}`} data-size="sm">{fit.gradeFrom}</span>
              <span aria-hidden="true">→</span>
              <span className={`pf-gbox pf-g-${fit.gradeTo}`} data-size="sm">{fit.gradeTo}</span>
            </span>
          </div>
          {changed.filter((l) => l.key !== "grade").length > 0 && (
            <ul className="bys-lines">
              {changed
                .filter((l) => l.key !== "grade")
                .slice(0, 4)
                .map((l) => (
                  <li key={l.key}>
                    <span>{tx(l.label)}</span>
                    <b className={`pv ${l.tone === "good" ? "pf-up" : l.tone === "bad" ? "pf-down" : ""}`}>
                      {l.from} → {l.to}
                    </b>
                  </li>
                ))}
            </ul>
          )}
          {fit.warning && (
            <p className="pfq-watch">
              <span className="pfq-watch-icon" aria-hidden="true">
                <IconAlert size={16} />
              </span>
              <span>{tx(fit.warning)}</span>
            </p>
          )}
          {plan && (
            <p className="pfq-watch">
              <span className="pfq-watch-icon" aria-hidden="true">
                <IconAlert size={16} />
              </span>
              <span>
                <T en={`Your plan says “${plan.label.en}” for this share.`} bn={`আপনার পরিকল্পনা এই শেয়ারে বলছে “${plan.label.bn}”।`} />{" "}
                {tx(plan.line)}
              </span>
            </p>
          )}
          {/* No size for a share with a problem: the check never suggests putting more into it. */}
          {sensible && sensible.n !== qty && !z && !loss && tier !== "weak" && (!plan || plan.label.en === "Buy more") && (
            <div className="bys-size">
              <span className="pv">
                <T
                  en={`A sensible size: about ${sensible.n.toLocaleString("en-IN")} shares (${takaGroup(sensible.amount)}), ${sensible.why.en}.`}
                  bn={`ভালো পরিমাণ: প্রায় ${sensible.n.toLocaleString("en-IN")}টি শেয়ার (${takaGroup(sensible.amount)}), ${sensible.why.bn}।`}
                />
              </span>
              {onUseQty && (
                <Button
                  type="button"
                  variant="quiet"
                  size="sm"
                  onClick={() => {
                    trackEvent("buy_check_use_size", { source });
                    onUseQty(sensible.n);
                  }}
                >
                  <T en={`Use ${sensible.n.toLocaleString("en-IN")}`} bn={`${sensible.n.toLocaleString("en-IN")}টি নিন`} />
                </Button>
              )}
            </div>
          )}
        </>
      ) : (
        abouts.length > 0 && (
          <p className="bys-lock">
            <IconLock size={15} />
            <span>
              <T
                en={`This changes ${abouts.length} thing${abouts.length === 1 ? "" : "s"} in your portfolio check: ${listOf(abouts.map((a) => a.en), "and")}. `}
                bn={`এতে আপনার পোর্টফোলিও যাচাইয়ে ${abouts.length}টি জিনিস বদলায়: ${listOf(abouts.map((a) => a.bn), "আর")}। `}
              />
              <Link href={`${PREMIUM_PATH}#pay`} onClick={onLock} className="bys-lock-link">
                <T en="See how with Premium" bn="প্রিমিয়ামে দেখুন কীভাবে" />
              </Link>
            </span>
          </p>
        )
      )}
    </div>
  );
}
