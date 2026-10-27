"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { T } from "@/components/i18n/T";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import {
  apiGetMyPayments,
  apiSubmitPayment,
  getPremiumPlans,
  type PayMethod,
  type PremiumPayment,
  type PremiumPlansResponse,
} from "@/lib/api";
import { AUTH_USER_UPDATED_EVENT, setStoredUser } from "@/lib/auth";
import { formatDate } from "@/lib/formatters";
import { bnDate } from "@/lib/bn";
import { usePremium } from "@/lib/premium";
import { METHOD_LABEL, OFFER, PAID_PLANS, planByKey, type PlanKey } from "@/lib/premium-plans";
import { toast } from "@/lib/toast";
import { trackEvent } from "@/lib/track";

const METHOD_BN: Record<string, string> = { bkash: "বিকাশ", nagad: "নগদ" };

const BASE_MONTHLY = PAID_PLANS.find((p) => p.key === "monthly")?.amount ?? PAID_PLANS[0].amount;

const STATUS: Record<PremiumPayment["status"], { en: string; bn: string; tone: string }> = {
  pending: { en: "Being checked", bn: "যাচাই চলছে", tone: "text-text-muted" },
  accepted: { en: "Received", bn: "পাওয়া গেছে", tone: "text-positive" },
  revoked: { en: "Not found, so Premium was switched off", bn: "পাওয়া যায়নি, তাই প্রিমিয়াম বন্ধ করা হয়েছে", tone: "text-negative" },
};

const ERRORS: Record<string, { en: string; bn: string }> = {
  bad_sender: { en: "That does not look like a mobile number. Please type all 11 digits, such as 01712345678.", bn: "মোবাইল নম্বরটি ঠিক মনে হচ্ছে না। পুরো 11টি সংখ্যা লিখুন, যেমন 01712345678।" },
  payment_pending: { en: "We are still checking your last payment. You can buy again once that is done.", bn: "আপনার আগের পেমেন্ট এখনো যাচাই হচ্ছে। তা শেষ হলে আবার কিনতে পারবেন।" },
  bad_method: { en: "That payment method is not open right now. Please choose the other one.", bn: "এই মাধ্যমটি এখন বন্ধ। অন্যটি বেছে নিন।" },
};

/**
 * Buy Premium by bKash / Nagad (backend `services/payments.py`): pick a plan,
 * Send Money to our number, type the number you sent it from. Premium starts
 * at once; an admin finds the payment later and accepts it, or revokes it,
 * which takes the days back. An account with a revoked payment waits for the
 * check before its days start.
 */
export default function PayBox() {
  const { isLoggedIn, isLoading } = useAuth();
  const { premiumUntil, isPremium } = usePremium();
  const { bn } = useLang();
  // For attributes only; visible text uses <T>.
  const L = (en: string, b: string) => (bn ? b : en);
  const [plan, setPlan] = useState<PlanKey>("yearly");
  const [info, setInfo] = useState<PremiumPlansResponse | null>(null);
  const [method, setMethod] = useState<PayMethod>("bkash");
  const [sender, setSender] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ en: string; bn: string } | null>(null);
  const [mine, setMine] = useState<{ items: PremiumPayment[] } | null>(null);

  useEffect(() => {
    getPremiumPlans()
      .then((r) => {
        setInfo(r);
        if (r.methods.length && !r.methods.some((m) => m.key === "bkash")) setMethod(r.methods[0].key);
      })
      .catch(() => setInfo({ plans: [], methods: [] }));
  }, []);

  const loadMine = useCallback(() => {
    apiGetMyPayments().then(setMine).catch(() => setMine(null));
  }, []);

  useEffect(() => {
    if (isLoggedIn) loadMine();
    else setMine(null);
  }, [isLoggedIn, loadMine]);

  const chosen = planByKey(plan) ?? PAID_PLANS[PAID_PLANS.length - 1];
  const number = info?.methods.find((m) => m.key === method)?.number ?? null;
  const pending = mine?.items.find((p) => p.status === "pending") ?? null;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ message: <T en="Copied" bn="কপি হয়েছে" />, tone: "success" });
    } catch {
      toast({ message: <T en="We could not copy it. Please write the number down." bn="কপি করা যায়নি। নম্বরটি লিখে নিন।" />, tone: "error" });
    }
  };

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const { payment, user } = await apiSubmitPayment({ plan, method, sender });
      setStoredUser(user);
      window.dispatchEvent(new CustomEvent(AUTH_USER_UPDATED_EVENT));
      trackEvent("premium_payment_submit", { plan, method, granted: payment.granted ? 1 : 0 });
      toast({
        message: payment.granted ? (
          <T en="Premium is on. Thank you." bn="প্রিমিয়াম চালু হয়েছে। ধন্যবাদ।" />
        ) : (
          <T en="Thank you. We will switch Premium on once we find your payment." bn="ধন্যবাদ। পেমেন্ট পেলেই প্রিমিয়াম চালু করব।" />
        ),
        tone: "success",
      });
      setSender("");
      loadMine();
    } catch (err) {
      const e = err as { status?: number; message?: string };
      setError(ERRORS[e?.message ?? ""] ?? { en: "We could not send that. Please try again.", bn: "পাঠানো যায়নি। আবার চেষ্টা করুন।" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Plans */}
      <div role="radiogroup" aria-label={L("Choose a plan", "প্ল্যান বেছে নিন")} className="pay-plans">
        {PAID_PLANS.map((p) => {
          const on = p.key === plan;
          // 30 / 180 / 365 days → 1 / 6 / 12 months. On an offer plan the
          // saving is the discount off its regular price; otherwise it is
          // against paying the one-month price that many times.
          const months = Math.max(1, Math.round(p.days / 30));
          const perMonth = Math.round(p.amount / months);
          const save = p.listAmount ? p.listAmount - p.amount : BASE_MONTHLY * months - p.amount;
          return (
            <button
              key={p.key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setPlan(p.key)}
              className={`pay-plan ${on ? "pay-plan-on" : ""} ${p.best ? "pay-plan-best" : ""}`}
            >
              {p.best && (
                <span className="pay-plan-flag">
                  <T en="Best value" bn="সবচেয়ে সাশ্রয়ী" />
                </span>
              )}
              <span className="flex items-center gap-2">
                <span className="pay-radio" aria-hidden />
                <span className="font-semibold text-text-main">
                  <T en={p.name} bn={p.bn} />
                </span>
              </span>
              {p.listAmount && (
                <span className="pay-plan-offer">
                  <T en={OFFER.label.en} bn={OFFER.label.bn} />
                </span>
              )}
              <span className="pay-plan-price tabular-nums">
                ৳{p.amount.toLocaleString("en-IN")}
                {p.listAmount && (
                  <s className="pay-plan-was">
                    <span className="sr-only">
                      <T en="Regular price " bn="আগের দাম " />
                    </span>
                    ৳{p.listAmount.toLocaleString("en-IN")}
                  </s>
                )}
              </span>
              <span className="block text-sm text-text-muted">
                <T en={p.per} bn={p.perBn} />
              </span>
              <span className="pay-plan-foot">
                {months > 1 ? (
                  <>
                    <span className="text-sm font-semibold text-text-main tabular-nums">
                      <T en={`৳${perMonth} a month`} bn={`মাসে ৳${perMonth}`} />
                    </span>
                    {save > 0 && (
                      <span className="pay-plan-save tabular-nums">
                        <T en={`Save ৳${save}`} bn={`৳${save} সাশ্রয়`} />
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-text-muted">
                    <T en={p.note} bn={p.noteBn} />
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {isLoading ? null : !isLoggedIn ? (
        <div className="flex flex-col items-start gap-2">
          <Button href="/register" size="lg">
            <T en="Sign up free to buy" bn="কিনতে ফ্রি অ্যাকাউন্ট খুলুন" />
          </Button>
          <p className="text-sm text-text-muted">
            <T
              en="Premium needs an account to belong to, so please open a free one first."
              bn="প্রিমিয়াম চালু করতে একটি অ্যাকাউন্ট লাগবে, তাই আগে একটি ফ্রি অ্যাকাউন্ট খুলুন।"
            />
          </p>
        </div>
      ) : pending ? (
        <div className="premium-card" role="status">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-text-main">
              <T en="We are checking your payment" bn="আপনার পেমেন্ট যাচাই করা হচ্ছে" />
            </p>
            <p className="mt-2 text-sm text-text-main tabular-nums">
              ৳{pending.amount.toLocaleString("en-IN")} · {METHOD_LABEL[pending.method]} · {pending.sender}
              {pending.created_at ? (
                <T en={` · ${formatDate(pending.created_at)}`} bn={` · ${bnDate(pending.created_at)}`} />
              ) : null}
            </p>
            <p className="mt-1 text-sm text-text-main">
              {pending.granted ? (
                <T
                  en={`Premium is already on${premiumUntil && isPremium ? ` until ${formatDate(premiumUntil)}` : ""}. If we cannot find the payment, it will be switched off.`}
                  bn={`প্রিমিয়াম চালু আছে${premiumUntil && isPremium ? `, ${bnDate(premiumUntil)} পর্যন্ত` : ""}। পেমেন্ট খুঁজে না পেলে এটি বন্ধ হয়ে যাবে।`}
                />
              ) : (
                <T
                  en="Premium switches on as soon as we find it, usually within a day."
                  bn="পেমেন্ট পেলেই প্রিমিয়াম চালু হবে, সাধারণত এক দিনের মধ্যে।"
                />
              )}
            </p>
          </div>
        </div>
      ) : info && info.methods.length === 0 ? (
        <p className="text-sm text-text-muted">
          <T
            en="Payments are not open right now. Please check again soon."
            bn="এখন পেমেন্ট বন্ধ আছে। একটু পরে আবার দেখুন।"
          />
        </p>
      ) : (
        <div className="soft-card pay-form flex flex-col gap-5">
          {info && info.methods.length > 1 && (
            <div role="radiogroup" aria-label={L("Pay with", "যেভাবে পেমেন্ট করবেন")} className="flex gap-2">
              {info.methods.map((m) => (
                <Button
                  key={m.key}
                  type="button"
                  variant="tab"
                  size="sm"
                  active={m.key === method}
                  role="radio"
                  aria-checked={m.key === method}
                  onClick={() => setMethod(m.key)}
                >
                  {METHOD_LABEL[m.key]}
                </Button>
              ))}
            </div>
          )}

          <ol className="flex flex-col gap-5">
            <li className="pay-step">
              <span className="pay-step-n" aria-hidden>1</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-text-main">
                  <T
                    en={
                      <>
                        Open {METHOD_LABEL[method]}, choose <strong>Send Money</strong> and send{" "}
                        <strong className="tabular-nums">৳{chosen.amount.toLocaleString("en-IN")}</strong> to this number:
                      </>
                    }
                    bn={
                      <>
                        {METHOD_BN[method] ?? METHOD_LABEL[method]} অ্যাপে <strong>Send Money</strong> দিয়ে{" "}
                        <strong className="tabular-nums">৳{chosen.amount.toLocaleString("en-IN")}</strong> পাঠান এই নম্বরে:
                      </>
                    }
                  />
                </p>
                {number ? (
                  <div className="pay-number">
                    <span className="min-w-0">
                      <span className="block text-xs text-text-muted">{METHOD_LABEL[method]} · Send Money</span>
                      <span className="block text-xl font-bold text-text-main tabular-nums">{number}</span>
                    </span>
                    <Button type="button" variant="quiet" size="sm" onClick={() => void copy(number)}>
                      <T en="Copy" bn="কপি" />
                    </Button>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-text-muted">
                    <T en="Loading the number…" bn="নম্বর আসছে…" />
                  </p>
                )}
              </div>
            </li>
            <li className="pay-step">
              <span className="pay-step-n" aria-hidden>2</span>
              <div className="min-w-0 flex-1">
                <label htmlFor="pay-sender" className="text-sm text-text-main">
                  <T
                    en={`Type the ${METHOD_LABEL[method]} number you sent it from`}
                    bn={`যে ${METHOD_BN[method] ?? METHOD_LABEL[method]} নম্বর থেকে টাকা পাঠিয়েছেন, সেটি লিখুন`}
                  />
                </label>
                <input
                  id="pay-sender"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="01XXXXXXXXX"
                  value={sender}
                  onChange={(e) => setSender(e.target.value)}
                  className="input-field mt-2 tabular-nums"
                  maxLength={20}
                />
              </div>
            </li>
          </ol>

          {error && (
            <div className="form-error" role="alert">
              <p>
                <T en={error.en} bn={error.bn} />
              </p>
            </div>
          )}

          <div className="pay-submit flex flex-col items-start gap-1">
            <Button size="lg" onClick={() => void submit()} disabled={busy || sender.trim().length < 11}>
              {busy ? (
                <T en="Starting…" bn="চালু হচ্ছে…" />
              ) : (
                <T
                  en={`I have paid ৳${chosen.amount.toLocaleString("en-IN")}. Start Premium`}
                  bn={`৳${chosen.amount.toLocaleString("en-IN")} পাঠিয়েছি। প্রিমিয়াম চালু করুন`}
                />
              )}
            </Button>
            <p className="text-sm text-text-muted">
              <T
                en={`${isPremium ? "The new days are added after the days you have left." : "Premium starts straight away."} We check every payment, and if we cannot find yours, Premium is switched off.`}
                bn={`${isPremium ? "নতুন দিনগুলো আপনার বাকি দিনের পরে যোগ হবে।" : "প্রিমিয়াম সঙ্গে সঙ্গে চালু হবে।"} প্রতিটি পেমেন্ট আমরা যাচাই করি, আর খুঁজে না পেলে প্রিমিয়াম বন্ধ হয়ে যায়।`}
              />
            </p>
          </div>
        </div>
      )}

      {mine && mine.items.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-text-main">
            <T en="Your payments" bn="আপনার পেমেন্ট" />
          </p>
          <ul className="soft-card divide-y divide-border overflow-hidden">
            {mine.items.map((p) => {
              const s = STATUS[p.status];
              const pl = planByKey(p.plan);
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3 text-sm">
                  <span className="text-text-main tabular-nums">
                    <T
                      en={`${p.created_at ? formatDate(p.created_at) : "—"} · ${pl?.name ?? p.plan}`}
                      bn={`${p.created_at ? bnDate(p.created_at) : "—"} · ${pl?.bn ?? p.plan}`}
                    />
                    {` · ৳${p.amount.toLocaleString("en-IN")} · ${METHOD_LABEL[p.method]}`}
                  </span>
                  <span className={`font-semibold ${s.tone}`}>
                    <T en={s.en} bn={s.bn} />
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
