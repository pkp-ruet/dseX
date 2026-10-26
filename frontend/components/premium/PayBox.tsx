"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Bn from "@/components/i18n/Bn";
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
import { usePremium } from "@/lib/premium";
import { METHOD_LABEL, PAID_PLANS, planByKey, type PlanKey } from "@/lib/premium-plans";
import { toast } from "@/lib/toast";
import { trackEvent } from "@/lib/track";

const BASE_MONTHLY = PAID_PLANS.find((p) => p.key === "monthly")?.amount ?? PAID_PLANS[0].amount;

const STATUS: Record<PremiumPayment["status"], { en: string; bn: string; tone: string }> = {
  pending: { en: "Checking", bn: "যাচাই চলছে", tone: "text-text-muted" },
  accepted: { en: "Received", bn: "পেয়েছি", tone: "text-positive" },
  revoked: { en: "Not found — Premium removed", bn: "পাওয়া যায়নি — প্রিমিয়াম বন্ধ", tone: "text-negative" },
};

const ERRORS: Record<string, { en: string; bn: string }> = {
  bad_sender: { en: "That doesn't look like a mobile number. Use the 11 digits, like 01712345678.", bn: "মোবাইল নম্বরটি ঠিক নেই। 11 সংখ্যায় লিখুন, যেমন 01712345678।" },
  payment_pending: { en: "We're still checking your last payment. You can buy again once it's done.", bn: "আপনার আগের পেমেন্ট এখনো যাচাই হচ্ছে। শেষ হলে আবার কিনতে পারবেন।" },
  bad_method: { en: "That payment method isn't open right now. Pick the other one.", bn: "এই মাধ্যম এখন বন্ধ। অন্যটি বেছে নিন।" },
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
  // English mode: English + the Bengali line under it. Bengali mode: Bengali only.
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
      toast({ message: L("Copied", "কপি হয়েছে"), tone: "success" });
    } catch {
      toast({ message: L("Couldn't copy — write it down instead", "কপি হয়নি — নম্বরটি লিখে নিন"), tone: "error" });
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
        message: payment.granted
          ? L("Premium is on — thank you!", "প্রিমিয়াম চালু হয়েছে — ধন্যবাদ!")
          : L("Thanks — we'll switch Premium on once we find your payment", "ধন্যবাদ — পেমেন্ট পেলেই প্রিমিয়াম চালু করব"),
        tone: "success",
      });
      setSender("");
      loadMine();
    } catch (err) {
      const e = err as { status?: number; message?: string };
      setError(ERRORS[e?.message ?? ""] ?? { en: "Couldn't send that — try again.", bn: "পাঠানো যায়নি — আবার চেষ্টা করুন।" });
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
          // 30 / 90 / 365 days → 1 / 3 / 12 months; the saving is against
          // paying the one-month price that many times (matches each note).
          const months = Math.max(1, Math.round(p.days / 30));
          const perMonth = Math.round(p.amount / months);
          const save = BASE_MONTHLY * months - p.amount;
          return (
            <button
              key={p.key}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setPlan(p.key)}
              className={`pay-plan ${on ? "pay-plan-on" : ""} ${p.best ? "pay-plan-best" : ""}`}
            >
              {p.best && <span className="pay-plan-flag">{L("Best value", "সবচেয়ে সাশ্রয়ী")}</span>}
              <span className="flex items-center gap-2">
                <span className="pay-radio" aria-hidden />
                <span className="font-semibold text-text-main">{L(p.name, p.bn)}</span>
              </span>
              <span className="pay-plan-price tabular-nums">৳{p.amount.toLocaleString("en-IN")}</span>
              <span className="block text-sm text-text-muted">{L(p.per, p.perBn)}</span>
              <span className="pay-plan-foot">
                {months > 1 ? (
                  <>
                    <span className="text-sm font-semibold text-text-main tabular-nums">
                      {L(`৳${perMonth} a month`, `মাসে ৳${perMonth}`)}
                    </span>
                    {save > 0 && (
                      <span className="pay-plan-save tabular-nums">{L(`Save ৳${save}`, `৳${save} সাশ্রয়`)}</span>
                    )}
                  </>
                ) : (
                  <span className="text-sm text-text-muted">{L(p.note, p.noteBn)}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {isLoading ? null : !isLoggedIn ? (
        <div className="flex flex-col items-start gap-2">
          <Button href="/register" size="lg">{L("Sign up free to buy", "কিনতে ফ্রি অ্যাকাউন্ট খুলুন")}</Button>
          <p className="text-sm text-text-muted">
            {L("You need an account so Premium has somewhere to go.", "প্রিমিয়াম চালু করতে একটি ফ্রি অ্যাকাউন্ট লাগবে।")}
          </p>
          {!bn && <Bn className="text-sm text-text-muted">প্রিমিয়াম চালু করতে একটি ফ্রি অ্যাকাউন্ট লাগবে।</Bn>}
        </div>
      ) : pending ? (
        <div className="premium-card" role="status">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-text-main">{L("We're checking your payment", "আপনার পেমেন্ট যাচাই করা হচ্ছে")}</p>
            {!bn && <Bn className="text-sm text-text-muted">আপনার পেমেন্ট যাচাই করা হচ্ছে।</Bn>}
            <p className="mt-2 text-sm text-text-main tabular-nums">
              ৳{pending.amount.toLocaleString("en-IN")} · {METHOD_LABEL[pending.method]} · {pending.sender}
              {pending.created_at ? ` · ${formatDate(pending.created_at)}` : ""}
            </p>
            {pending.granted ? (
              <>
                <p className="mt-1 text-sm text-text-main">
                  {bn
                    ? "প্রিমিয়াম চালু আছে। পেমেন্ট খুঁজে না পেলে বন্ধ হয়ে যাবে।"
                    : `Premium is already on${premiumUntil && isPremium ? ` until ${formatDate(premiumUntil)}` : ""}. If we can't find the payment, it will be switched off.`}
                </p>
                {!bn && <Bn className="text-sm text-text-muted">প্রিমিয়াম চালু আছে। পেমেন্ট খুঁজে না পেলে বন্ধ হয়ে যাবে।</Bn>}
              </>
            ) : (
              <>
                <p className="mt-1 text-sm text-text-main">
                  {L("Premium switches on as soon as we find it, usually within a day.", "পেমেন্ট পেলেই প্রিমিয়াম চালু হবে, সাধারণত এক দিনের মধ্যে।")}
                </p>
                {!bn && <Bn className="text-sm text-text-muted">পেমেন্ট পেলেই প্রিমিয়াম চালু হবে, সাধারণত এক দিনের মধ্যে।</Bn>}
              </>
            )}
          </div>
        </div>
      ) : info && info.methods.length === 0 ? (
        <p className="text-sm text-text-muted">
          {L("Payments aren't open right now — please check back soon.", "এখন পেমেন্ট বন্ধ আছে — একটু পরে আবার দেখুন।")}
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
                {bn ? (
                  <p className="text-sm text-text-main">
                    {METHOD_LABEL[method]} অ্যাপে <strong>Send Money</strong> দিয়ে{" "}
                    <strong className="tabular-nums">৳{chosen.amount.toLocaleString("en-IN")}</strong> পাঠান এই নম্বরে:
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-text-main">
                      Open {METHOD_LABEL[method]}, choose <strong>Send Money</strong> and send{" "}
                      <strong className="tabular-nums">৳{chosen.amount.toLocaleString("en-IN")}</strong> to
                    </p>
                    <Bn className="text-sm text-text-muted">
                      {METHOD_LABEL[method]} অ্যাপে Send Money দিয়ে ৳{chosen.amount} পাঠান এই নম্বরে:
                    </Bn>
                  </>
                )}
                {number ? (
                  <div className="pay-number">
                    <span className="min-w-0">
                      <span className="block text-xs text-text-muted">{METHOD_LABEL[method]} · Send Money</span>
                      <span className="block text-xl font-bold text-text-main tabular-nums">{number}</span>
                    </span>
                    <Button type="button" variant="quiet" size="sm" onClick={() => void copy(number)}>{L("Copy", "কপি")}</Button>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-text-muted">{L("Loading the number…", "নম্বর আসছে…")}</p>
                )}
              </div>
            </li>
            <li className="pay-step">
              <span className="pay-step-n" aria-hidden>2</span>
              <div className="min-w-0 flex-1">
                <label htmlFor="pay-sender" className="text-sm text-text-main">
                  {bn
                    ? `যে ${METHOD_LABEL[method]} নম্বর থেকে টাকা পাঠিয়েছেন সেটি লিখুন`
                    : `Type the ${METHOD_LABEL[method]} number you sent it from`}
                </label>
                {!bn && <Bn className="text-sm text-text-muted">যে নম্বর থেকে টাকা পাঠিয়েছেন সেটি লিখুন।</Bn>}
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
              {bn ? <p>{error.bn}</p> : <><p>{error.en}</p><Bn>{error.bn}</Bn></>}
            </div>
          )}

          <div className="pay-submit flex flex-col items-start gap-1">
            <Button size="lg" onClick={() => void submit()} disabled={busy || sender.trim().length < 11}>
              {busy
                ? L("Starting…", "চালু হচ্ছে…")
                : bn
                  ? `৳${chosen.amount.toLocaleString("en-IN")} পাঠিয়েছি — প্রিমিয়াম চালু করুন`
                  : `I've paid ৳${chosen.amount.toLocaleString("en-IN")} — start Premium`}
            </Button>
            {!bn && (
              <p className="text-sm text-text-muted">
                {isPremium
                  ? "The new days are added after the days you have left. "
                  : "Premium starts straight away. "}
                We check every payment; if we can&apos;t find yours, Premium is switched off.
              </p>
            )}
            <Bn className="text-sm text-text-muted">
              {isPremium ? "নতুন দিনগুলো আপনার বাকি দিনের পরে যোগ হবে। " : "প্রিমিয়াম সঙ্গে সঙ্গে চালু হবে। "}
              প্রতিটি পেমেন্ট আমরা যাচাই করি; খুঁজে না পেলে প্রিমিয়াম বন্ধ হয়ে যাবে।
            </Bn>
          </div>
        </div>
      )}

      {mine && mine.items.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-text-main">{L("Your payments", "আপনার পেমেন্ট")}</p>
          {!bn && <Bn className="text-xs text-text-muted mb-2">আপনার পেমেন্ট।</Bn>}
          <ul className="soft-card divide-y divide-border overflow-hidden">
            {mine.items.map((p) => {
              const s = STATUS[p.status];
              return (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3 text-sm">
                  <span className="text-text-main tabular-nums">
                    {p.created_at ? formatDate(p.created_at) : "—"} · {(bn ? planByKey(p.plan)?.bn : planByKey(p.plan)?.name) ?? p.plan} · ৳{p.amount.toLocaleString("en-IN")} · {METHOD_LABEL[p.method]}
                  </span>
                  <span className={`font-semibold ${s.tone}`}>
                    {bn ? s.bn : <>{s.en} <Bn as="span" className="font-normal text-text-muted">· {s.bn}</Bn></>}
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
