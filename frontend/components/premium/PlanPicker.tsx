"use client";

import Button from "@/components/ui/Button";
import { T } from "@/components/i18n/T";
import { IconCheck } from "@/components/ui/icons";
import type { PremiumPayment } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import { bnDate } from "@/lib/bn";
import { usePremium } from "@/lib/premium";
import { PROMISES } from "@/lib/premium-copy";
import { PAID_PLANS, planByKey, type PlanKey } from "@/lib/premium-plans";
import { dayWords, dhakaDay } from "@/lib/renewal";
import { useLang } from "@/context/LangContext";
import { MethodName, PaidFrom } from "@/components/premium/payParts";

const tk = (n: number) => `৳${n.toLocaleString("en-IN")}`;

/** The button's words: "Get 1 year · ৳999", "Add 1 year" for a Premium
 *  reader, "Sign up free to buy" for a guest. */
export function BuyWords({ plan, guest }: { plan: PlanKey; guest: boolean }) {
  const { isPremium } = usePremium();
  const p = planByKey(plan) ?? PAID_PLANS[PAID_PLANS.length - 1];
  if (guest) return <T en={`Sign up free to buy · ${tk(p.amount)}`} bn={`কিনতে ফ্রি অ্যাকাউন্ট খুলুন · ${tk(p.amount)}`} />;
  if (isPremium) return <T en={`Add ${p.name} · ${tk(p.amount)}`} bn={`${p.bn} যোগ করুন · ${tk(p.amount)}`} />;
  return <T en={`Get ${p.name} · ${tk(p.amount)}`} bn={`${p.bn} নিন · ${tk(p.amount)}`} />;
}

/**
 * The top of /premium (2026-11-26): the two plans as cards (the year picked
 * by default), a note for a Premium reader on when the new days start, ONE
 * button that opens the payment sheet, and three ticks. A payment still being
 * checked replaces the button with its status; closed payments say so.
 */
export default function PlanPicker({
  plan,
  onPlan,
  onBuy,
  guest,
  pending,
  closed,
}: {
  plan: PlanKey;
  onPlan: (p: PlanKey) => void;
  onBuy: () => void;
  guest: boolean;
  pending: PremiumPayment | null;
  /** The backend has no payment method switched on. */
  closed: boolean;
}) {
  const { bn } = useLang();
  const { isPremium, premiumUntil } = usePremium();
  // 3 months, then the year, left to right; on phones the year comes first
  // (`.pay-plan-best { order: -1 }` below 640px), it is the one we suggest.
  const ordered = PAID_PLANS;

  return (
    <div className="pm-buy">
      {isPremium && premiumUntil ? (
        <p className="pm-runs" role="note">
          <T
            en={`Your Premium runs till ${dayWords(dhakaDay(premiumUntil)).en}. A new plan starts after that, so you keep every day you have left.`}
            bn={`আপনার প্রিমিয়াম চলবে ${dayWords(dhakaDay(premiumUntil)).bn} পর্যন্ত। নতুন প্ল্যান তার পরে শুরু হবে, তাই বাকি দিনগুলো হারাবেন না।`}
          />
        </p>
      ) : null}

      <div role="radiogroup" aria-label={bn ? "প্ল্যান বেছে নিন" : "Choose a plan"} className="pay-plans">
        {ordered.map((p) => {
          const on = p.key === plan;
          const months = Math.max(1, Math.round(p.days / 30));
          const perMonth = Math.round(p.amount / months);
          return (
            <button
              key={p.key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onPlan(p.key)}
              className={`pay-plan ${on ? "pay-plan-on" : ""} ${p.best ? "pay-plan-best" : ""}`}
            >
              {p.best && (
                <span className="pay-plan-flag">
                  <T en="Best value" bn="সবচেয়ে সাশ্রয়ী" />
                </span>
              )}
              <span className="pay-plan-top">
                <span className="pay-radio" aria-hidden />
                <span className="pay-plan-name">
                  <T en={p.name} bn={p.bn} />
                </span>
              </span>
              <span className="pay-plan-price tabular-nums">{tk(p.amount)}</span>
              <span className="pay-plan-per tabular-nums">
                <T en={`About ${tk(perMonth)} a month`} bn={`মাসে প্রায় ${tk(perMonth)}`} />
              </span>
              <span className="pay-plan-days tabular-nums">
                {p.best ? (
                  <T en={`${p.days} days of everything`} bn={`${p.days} দিন সবকিছু খোলা`} />
                ) : (
                  <T en={`${p.days} days · good for trying it out`} bn={`${p.days} দিন · চালিয়ে দেখার জন্য ভালো`} />
                )}
              </span>
            </button>
          );
        })}
      </div>

      {pending ? (
        <div className="pm-pending" role="status">
          <p className="font-semibold text-text-main">
            <T en="We are checking your payment" bn="আপনার পেমেন্ট যাচাই করা হচ্ছে" />
          </p>
          <p className="mt-1 text-sm text-text-main tabular-nums">
            {tk(pending.amount)} · <MethodName method={pending.method} /> · <PaidFrom p={pending} />
            {pending.created_at ? (
              <T en={` · ${formatDate(pending.created_at)}`} bn={` · ${bnDate(pending.created_at)}`} />
            ) : null}
          </p>
          <p className="mt-1 text-sm text-text-muted">
            {pending.granted ? (
              <T
                en="Premium is already on. You can buy again once this check is done."
                bn="প্রিমিয়াম চালু আছে। এই যাচাই শেষ হলে আবার কিনতে পারবেন।"
              />
            ) : (
              <T
                en="Premium switches on as soon as we find it, usually within a day."
                bn="পেমেন্ট পেলেই প্রিমিয়াম চালু হবে, সাধারণত এক দিনের মধ্যে।"
              />
            )}
          </p>
        </div>
      ) : closed ? (
        <p className="pm-pending text-sm text-text-main" role="status">
          <T en="Payments are not open right now. Please check again soon." bn="এখন পেমেন্ট বন্ধ আছে। একটু পরে আবার দেখুন।" />
        </p>
      ) : (
        <Button size="lg" block className="pm-buy-btn" onClick={onBuy}>
          <BuyWords plan={plan} guest={guest} />
        </Button>
      )}

      <ul className="pm-promises">
        {PROMISES.map((p) => (
          <li key={p.en}>
            <span className="pm-tick" aria-hidden>
              <IconCheck size={14} />
            </span>
            <T en={p.en} bn={p.bn} />
          </li>
        ))}
      </ul>
    </div>
  );
}
