"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import { T } from "@/components/i18n/T";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import {
  apiGetMyPayments,
  apiSubmitPayment,
  getPremiumPlans,
  type BankTransfer,
  type PayMethod,
  type PremiumPayment,
  type PremiumPlansResponse,
} from "@/lib/api";
import { AUTH_USER_UPDATED_EVENT, setStoredUser } from "@/lib/auth";
import { formatDate } from "@/lib/formatters";
import { bnDate } from "@/lib/bn";
import { usePremium } from "@/lib/premium";
import {
  METHOD_BN,
  METHOD_LABEL,
  OFFER,
  PAID_PLANS,
  TRANSFER_LABEL,
  planByKey,
  type PlanKey,
} from "@/lib/premium-plans";
import { toast } from "@/lib/toast";
import { trackEvent } from "@/lib/track";

/** "bKash", "Nagad" (brand names, the same in both languages) or "Bank transfer". */
function MethodName({ method }: { method: string }) {
  const en = METHOD_LABEL[method] ?? method;
  return method === "bank" ? <T en={en} bn={METHOD_BN.bank} /> : <>{en}</>;
}

/** Where the money came from: the mobile number, or the transfer type and the
 *  account's last 4 digits. */
function PaidFrom({ p }: { p: PremiumPayment }): ReactNode {
  if (p.method !== "bank") return p.sender;
  const how = TRANSFER_LABEL[p.transfer ?? ""] ?? "";
  const last4 = p.account_last4 ?? "";
  return <T en={`${how} · account ending ${last4}`} bn={`${how} · অ্যাকাউন্টের শেষ 4 সংখ্যা ${last4}`} />;
}

/** Digits only (Bengali digits become Western), for the last-4 field. */
const BN_ZERO = 0x09e6;
const toDigits = (raw: string) =>
  Array.from(raw, (ch) => {
    const n = ch.charCodeAt(0) - BN_ZERO;
    return n >= 0 && n <= 9 ? String(n) : ch;
  })
    .join("")
    .replace(/\D/g, "");

const TRANSFERS: { key: BankTransfer; en: string; bn: string }[] = [
  { key: "npsb", en: "Reaches us in seconds", bn: "সঙ্গে সঙ্গে পৌঁছায়" },
  { key: "beftn", en: "Can take until the next working day", bn: "পরের কার্যদিবস পর্যন্ত লাগতে পারে" },
];

const BASE_MONTHLY = PAID_PLANS.find((p) => p.key === "monthly")?.amount ?? PAID_PLANS[0].amount;

const STATUS: Record<PremiumPayment["status"], { en: string; bn: string; tone: string }> = {
  pending: { en: "Being checked", bn: "যাচাই চলছে", tone: "text-text-muted" },
  accepted: { en: "Received", bn: "পাওয়া গেছে", tone: "text-positive" },
  revoked: { en: "Not found, so Premium was switched off", bn: "পাওয়া যায়নি, তাই প্রিমিয়াম বন্ধ করা হয়েছে", tone: "text-negative" },
};

const ERRORS: Record<string, { en: string; bn: string }> = {
  bad_sender: { en: "That does not look like a mobile number. Please type all 11 digits, such as 01712345678.", bn: "মোবাইল নম্বরটি ঠিক মনে হচ্ছে না। পুরো 11টি সংখ্যা লিখুন, যেমন 01712345678।" },
  payment_pending: { en: "We are still checking your last payment. You can buy again once that is done.", bn: "আপনার আগের পেমেন্ট এখনো যাচাই হচ্ছে। তা শেষ হলে আবার কিনতে পারবেন।" },
  bad_method: { en: "That payment method is not open right now. Please choose another one.", bn: "এই মাধ্যমটি এখন বন্ধ। অন্য একটি বেছে নিন।" },
  bad_transfer: { en: "Please choose how you sent the money: NPSB or BEFTN.", bn: "কীভাবে টাকা পাঠিয়েছেন বেছে নিন: NPSB না BEFTN।" },
  bad_account_last4: { en: "Please type the last 4 digits of the account you sent it from.", bn: "যে অ্যাকাউন্ট থেকে পাঠিয়েছেন, তার শেষ 4টি সংখ্যা লিখুন।" },
};

/**
 * Buy Premium (backend `services/payments.py`): pick a plan, then either
 * Send Money by bKash / Nagad to our number and type the number you sent it
 * from, or make a bank transfer (NPSB / BEFTN) to our account and tell us
 * which one, the last 4 digits of the sending account and the reference, if
 * any. Premium starts at once; an admin finds the payment later and accepts
 * it, or revokes it, which takes the days back. An account with a revoked
 * payment waits for the check before its days start.
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
  const [transfer, setTransfer] = useState<BankTransfer | null>(null);
  const [last4, setLast4] = useState("");
  const [reference, setReference] = useState("");
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
  const methodInfo = info?.methods.find((m) => m.key === method) ?? null;
  const number = methodInfo?.number ?? null;
  const isBank = method === "bank";
  const pending = mine?.items.find((p) => p.status === "pending") ?? null;
  const ready = isBank ? !!transfer && last4.length === 4 : sender.trim().length >= 11;

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
      const { payment, user } = await apiSubmitPayment(
        isBank && transfer
          ? { plan, method, transfer, account_last4: last4, reference: reference.trim() }
          : { plan, method, sender },
      );
      setStoredUser(user);
      window.dispatchEvent(new CustomEvent(AUTH_USER_UPDATED_EVENT));
      trackEvent("premium_payment_submit", {
        plan,
        method,
        ...(isBank && transfer ? { transfer } : {}),
        granted: payment.granted ? 1 : 0,
      });
      toast({
        message: payment.granted ? (
          <T en="Premium is on. Thank you." bn="প্রিমিয়াম চালু হয়েছে। ধন্যবাদ।" />
        ) : (
          <T en="Thank you. We will switch Premium on once we find your payment." bn="ধন্যবাদ। পেমেন্ট পেলেই প্রিমিয়াম চালু করব।" />
        ),
        tone: "success",
      });
      setSender("");
      setTransfer(null);
      setLast4("");
      setReference("");
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
              ৳{pending.amount.toLocaleString("en-IN")} · <MethodName method={pending.method} /> · <PaidFrom p={pending} />
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
            <div role="radiogroup" aria-label={L("Pay with", "যেভাবে পেমেন্ট করবেন")} className="flex flex-wrap gap-2">
              {info.methods.map((m) => (
                <Button
                  key={m.key}
                  type="button"
                  variant="tab"
                  size="sm"
                  active={m.key === method}
                  role="radio"
                  aria-checked={m.key === method}
                  onClick={() => {
                    setMethod(m.key);
                    setError(null);
                  }}
                >
                  <MethodName method={m.key} />
                </Button>
              ))}
            </div>
          )}

          {isBank ? (
          <ol className="flex flex-col gap-5">
            <li className="pay-step">
              <span className="pay-step-n" aria-hidden>1</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-text-main">
                  <T
                    en={
                      <>
                        From your bank&apos;s app or internet banking, send{" "}
                        <strong className="tabular-nums">৳{chosen.amount.toLocaleString("en-IN")}</strong> to this account
                        by <strong>NPSB</strong> or <strong>BEFTN</strong>:
                      </>
                    }
                    bn={
                      <>
                        আপনার ব্যাংকের অ্যাপ বা ইন্টারনেট ব্যাংকিং থেকে <strong>NPSB</strong> বা <strong>BEFTN</strong> দিয়ে{" "}
                        <strong className="tabular-nums">৳{chosen.amount.toLocaleString("en-IN")}</strong> পাঠান এই অ্যাকাউন্টে:
                      </>
                    }
                  />
                </p>
                {methodInfo && number ? (
                  <div className="pay-number pay-bank">
                    <dl className="pay-bank-rows">
                      <div>
                        <dt><T en="Bank" bn="ব্যাংক" /></dt>
                        <dd>{methodInfo.bank_name}</dd>
                      </div>
                      {methodInfo.account_name && (
                        <div>
                          <dt><T en="Account name" bn="অ্যাকাউন্টের নাম" /></dt>
                          <dd>{methodInfo.account_name}</dd>
                        </div>
                      )}
                      <div>
                        <dt><T en="Account number" bn="অ্যাকাউন্ট নম্বর" /></dt>
                        <dd className="text-xl font-bold tabular-nums">{number}</dd>
                      </div>
                      {methodInfo.branch && (
                        <div>
                          <dt><T en="Branch" bn="শাখা" /></dt>
                          <dd>{methodInfo.branch}</dd>
                        </div>
                      )}
                      {methodInfo.routing && (
                        <div>
                          <dt><T en="Routing number" bn="রাউটিং নম্বর" /></dt>
                          <dd className="tabular-nums">{methodInfo.routing}</dd>
                        </div>
                      )}
                    </dl>
                    <Button
                      type="button"
                      variant="quiet"
                      size="sm"
                      onClick={() => void copy(number)}
                      aria-label={L("Copy the account number", "অ্যাকাউন্ট নম্বর কপি করুন")}
                    >
                      <T en="Copy" bn="কপি" />
                    </Button>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-text-muted">
                    <T en="Loading the account…" bn="অ্যাকাউন্টের তথ্য আসছে…" />
                  </p>
                )}
              </div>
            </li>
            <li className="pay-step">
              <span className="pay-step-n" aria-hidden>2</span>
              <div className="flex min-w-0 flex-1 flex-col gap-4">
                <div>
                  <p id="pay-transfer-label" className="text-sm text-text-main">
                    <T en="How did you send it?" bn="কীভাবে পাঠিয়েছেন?" />
                  </p>
                  <div role="radiogroup" aria-labelledby="pay-transfer-label" className="mt-2 grid grid-cols-2 gap-2">
                    {TRANSFERS.map((t) => {
                      const on = t.key === transfer;
                      return (
                        <button
                          key={t.key}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          onClick={() => setTransfer(t.key)}
                          className={`pay-choice ${on ? "pay-choice-on" : ""}`}
                        >
                          <span className="pay-radio" aria-hidden />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-text-main">{TRANSFER_LABEL[t.key]}</span>
                            <span className="block text-xs text-text-muted">
                              <T en={t.en} bn={t.bn} />
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="pay-last4" className="text-sm text-text-main">
                      <T
                        en="Last 4 digits of the account you sent it from"
                        bn="যে অ্যাকাউন্ট থেকে পাঠিয়েছেন, তার শেষ 4টি সংখ্যা"
                      />
                    </label>
                    <input
                      id="pay-last4"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="1234"
                      value={last4}
                      onChange={(e) => {
                        // A pasted full account number keeps its last 4.
                        const d = toDigits(e.target.value);
                        setLast4(d.length > 4 ? d.slice(-4) : d);
                      }}
                      className="input-field mt-2 tabular-nums"
                    />
                  </div>
                  <div>
                    <label htmlFor="pay-reference" className="text-sm text-text-main">
                      <T en="Reference you wrote, if any" bn="যে রেফারেন্স লিখেছেন, যদি থাকে" />
                    </label>
                    <input
                      id="pay-reference"
                      type="text"
                      autoComplete="off"
                      placeholder={L("Optional", "না দিলেও চলবে")}
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      className="input-field mt-2"
                      maxLength={50}
                    />
                  </div>
                </div>
              </div>
            </li>
          </ol>
          ) : (
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
          )}

          {error && (
            <div className="form-error" role="alert">
              <p>
                <T en={error.en} bn={error.bn} />
              </p>
            </div>
          )}

          <div className="pay-submit flex flex-col items-start gap-1">
            <Button size="lg" onClick={() => void submit()} disabled={busy || !ready}>
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
                en={`${isPremium ? "The new days are added after the days you have left." : "Premium starts straight away."}${isBank && transfer === "beftn" ? " You do not need to wait for BEFTN to arrive." : ""} We check every payment, and if we cannot find yours, Premium is switched off.`}
                bn={`${isPremium ? "নতুন দিনগুলো আপনার বাকি দিনের পরে যোগ হবে।" : "প্রিমিয়াম সঙ্গে সঙ্গে চালু হবে।"}${isBank && transfer === "beftn" ? " BEFTN পৌঁছানো পর্যন্ত অপেক্ষা করতে হবে না।" : ""} প্রতিটি পেমেন্ট আমরা যাচাই করি, আর খুঁজে না পেলে প্রিমিয়াম বন্ধ হয়ে যায়।`}
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
                    {` · ৳${p.amount.toLocaleString("en-IN")} · `}
                    <MethodName method={p.method} />
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
