"use client";

import { useEffect, useState, type ReactNode } from "react";
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import { T } from "@/components/i18n/T";
import { IconCheck, IconChevronRight } from "@/components/ui/icons";
import { useLang } from "@/context/LangContext";
import { apiSubmitPayment, type BankTransfer, type PayMethod, type PremiumPlansResponse } from "@/lib/api";
import { AUTH_USER_UPDATED_EVENT, setStoredUser } from "@/lib/auth";
import { authHref } from "@/lib/next-path";
import { usePremium } from "@/lib/premium";
import { METHOD_BN, METHOD_LABEL, PAID_PLANS, TRANSFER_LABEL, planByKey, type PlanKey } from "@/lib/premium-plans";
import { dayWords, dhakaDay, extendedUntil } from "@/lib/renewal";
import { toast } from "@/lib/toast";
import { trackEvent } from "@/lib/track";

const tk = (n: number) => `৳${n.toLocaleString("en-IN")}`;

/** Digits only (Bengali digits become Western). */
const BN_ZERO = 0x09e6;
const toDigits = (raw: string) =>
  Array.from(raw, (ch) => {
    const n = ch.charCodeAt(0) - BN_ZERO;
    return n >= 0 && n <= 9 ? String(n) : ch;
  })
    .join("")
    .replace(/\D/g, "");

const METHOD_LINE: Record<string, { en: string; bn: string; mark: string }> = {
  bkash: { en: "Send Money from the bKash app", bn: "বিকাশ অ্যাপ থেকে Send Money", mark: "b" },
  nagad: { en: "Send Money from the Nagad app", bn: "নগদ অ্যাপ থেকে Send Money", mark: "N" },
  bank: { en: "NPSB or BEFTN from your bank's app", bn: "ব্যাংকের অ্যাপ থেকে NPSB বা BEFTN", mark: "৳" },
};

const TRANSFERS: { key: BankTransfer; en: string; bn: string }[] = [
  { key: "npsb", en: "Reaches us in seconds", bn: "সঙ্গে সঙ্গে পৌঁছায়" },
  { key: "beftn", en: "Next working day", bn: "পরের কার্যদিবস" },
];

const ERRORS: Record<string, { en: string; bn: string }> = {
  bad_sender: { en: "That does not look like a mobile number. Please type all 11 digits, such as 01712345678.", bn: "মোবাইল নম্বরটি ঠিক মনে হচ্ছে না। পুরো 11টি সংখ্যা লিখুন, যেমন 01712345678।" },
  payment_pending: { en: "We are still checking your last payment. You can buy again once that is done.", bn: "আপনার আগের পেমেন্ট এখনো যাচাই হচ্ছে। তা শেষ হলে আবার কিনতে পারবেন।" },
  bad_method: { en: "That payment method is not open right now. Please go back and choose another one.", bn: "এই মাধ্যমটি এখন বন্ধ। পেছনে গিয়ে অন্য একটি বেছে নিন।" },
  bad_transfer: { en: "Please choose how you sent the money: NPSB or BEFTN.", bn: "কীভাবে টাকা পাঠিয়েছেন বেছে নিন: NPSB না BEFTN।" },
  bad_account_last4: { en: "Please type the last 4 digits of the account you sent it from.", bn: "যে অ্যাকাউন্ট থেকে পাঠিয়েছেন, তার শেষ 4টি সংখ্যা লিখুন।" },
};

// account = not signed in · method → send → confirm → done
type Step = "account" | "method" | "send" | "confirm" | "done";
const STEP_N: Partial<Record<Step, number>> = { method: 1, send: 2, confirm: 3 };

/**
 * Paying for Premium, one thing at a time (2026-11-26, user: "Sheet, make
 * mockup" → "build it"; mockup https://claude.ai/artifact/AWU7kotVBn4cDA65Uao1kg).
 * The plan button on /premium opens it: a bottom sheet on phones, a dialog
 * from 640px (`ui/Sheet`), with the plan and price in its subtitle on every
 * step. 1 How will you pay? (bKash · Nagad · Bank transfer, whichever the
 * backend has on) → 2 the amount and our number (or bank account) with Copy,
 * three numbered steps → 3 the number they sent from (or NPSB / BEFTN, the last
 * 4 digits and a reference) → done: Premium is on till … . A guest first sees
 * "Open a free account first"; signing up brings them back with `?buy=1`,
 * which opens this sheet again. Backend rules unchanged
 * (`services/payments.py`): the days are added at once and an admin checks
 * the payment later.
 */
export default function PaySheet({
  open,
  onClose,
  plan,
  info,
  guest,
  onPaid,
}: {
  open: boolean;
  onClose: () => void;
  plan: PlanKey;
  info: PremiumPlansResponse | null;
  guest: boolean;
  onPaid: () => void;
}) {
  const { bn } = useLang();
  const L = (en: string, b: string) => (bn ? b : en);
  const { isPremium, premiumUntil } = usePremium();
  const p = planByKey(plan) ?? PAID_PLANS[PAID_PLANS.length - 1];

  const [step, setStep] = useState<Step>("method");
  const [method, setMethod] = useState<PayMethod | null>(null);
  const [sender, setSender] = useState("");
  const [transfer, setTransfer] = useState<BankTransfer | null>(null);
  const [last4, setLast4] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ en: string; bn: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [doneUntil, setDoneUntil] = useState<string | null>(null);
  const [doneGranted, setDoneGranted] = useState(true);

  // Every open starts from the first step.
  useEffect(() => {
    if (!open) return;
    setStep(guest ? "account" : "method");
    setMethod(null);
    setSender("");
    setTransfer(null);
    setLast4("");
    setReference("");
    setError(null);
    setCopied(false);
    setDoneUntil(null);
  }, [open, guest]);

  const methods = info?.methods ?? [];
  const methodInfo = methods.find((m) => m.key === method) ?? null;
  const number = methodInfo?.number ?? null;
  const isBank = method === "bank";
  const ready = isBank ? !!transfer && last4.length === 4 : toDigits(sender).length >= 11;
  const mName = method ? { en: METHOD_LABEL[method], bn: METHOD_BN[method] ?? METHOD_LABEL[method] } : null;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      toast({ message: <T en="We could not copy it. Please write the number down." bn="কপি করা যায়নি। নম্বরটি লিখে নিন।" />, tone: "error" });
    }
  };

  const pick = (m: PayMethod) => {
    setMethod(m);
    setCopied(false);
    setError(null);
    setStep("send");
    trackEvent("premium_pay_method", { plan, method: m });
  };

  const submit = async () => {
    if (!method) return;
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
      setDoneGranted(!!payment.granted);
      setDoneUntil(payment.granted && user.premium_until ? user.premium_until : null);
      setStep("done");
      onPaid();
    } catch (err) {
      const e = err as { message?: string };
      setError(ERRORS[e?.message ?? ""] ?? { en: "We could not send that. Please try again.", bn: "পাঠানো যায়নি। আবার চেষ্টা করুন।" });
    } finally {
      setBusy(false);
    }
  };

  const back = () => {
    setError(null);
    if (step === "confirm") setStep("send");
    else if (step === "send") setStep("method");
  };

  // ---- Title, body and footer by step ----
  let title: ReactNode;
  let body: ReactNode;
  let footer: ReactNode;

  const backBtn = (
    <Button variant="quiet" size="lg" onClick={back} disabled={busy}>
      <T en="Back" bn="পেছনে" />
    </Button>
  );

  if (step === "account") {
    const next = `/premium?plan=${plan}&buy=1`;
    title = <T en="Open a free account first" bn="আগে একটি ফ্রি অ্যাকাউন্ট খুলুন" />;
    body = (
      <p className="text-sm text-text-main">
        <T
          en="Premium belongs to an account. It takes about 30 seconds, then you come straight back here to pay."
          bn="প্রিমিয়াম একটি অ্যাকাউন্টে চালু হয়। প্রায় 30 সেকেন্ড লাগে, তারপর সরাসরি এখানে ফিরে পেমেন্ট করবেন।"
        />
      </p>
    );
    footer = (
      <div className="pay-foot">
        <Button href={authHref("/register", next)} size="lg" block>
          <T en="Create free account" bn="ফ্রি অ্যাকাউন্ট খুলুন" />
        </Button>
        <Button href={authHref("/login", next)} size="lg" variant="quiet" block>
          <T en="I have an account · Sign in" bn="অ্যাকাউন্ট আছে · সাইন ইন" />
        </Button>
      </div>
    );
  } else if (step === "method") {
    title = <T en="How will you pay?" bn="কীভাবে পেমেন্ট করবেন?" />;
    body = info ? (
      methods.length ? (
        <div className="pay-methods" role="list">
          {methods.map((m) => {
            const line = METHOD_LINE[m.key];
            return (
              <button key={m.key} type="button" role="listitem" className="pay-method" onClick={() => pick(m.key)}>
                <span className="pay-method-mark" aria-hidden>{line?.mark ?? "৳"}</span>
                <span className="min-w-0 flex-1">
                  <span className="pay-method-name">
                    <T en={METHOD_LABEL[m.key]} bn={METHOD_BN[m.key] ?? METHOD_LABEL[m.key]} />
                  </span>
                  {line && (
                    <span className="pay-method-line">
                      <T en={line.en} bn={line.bn} />
                    </span>
                  )}
                </span>
                <span className="pay-method-chev" aria-hidden>
                  <IconChevronRight size={18} />
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-text-main">
          <T en="Payments are not open right now. Please check again soon." bn="এখন পেমেন্ট বন্ধ আছে। একটু পরে আবার দেখুন।" />
        </p>
      )
    ) : (
      <p className="text-sm text-text-muted">
        <T en="Loading the ways to pay…" bn="পেমেন্টের উপায় আসছে…" />
      </p>
    );
    footer = (
      <p className="pay-fine">
        {isPremium && premiumUntil ? (
          <T
            en={`Your new days start after ${dayWords(dhakaDay(premiumUntil)).en}, so Premium runs till ${dayWords(dhakaDay(extendedUntil(premiumUntil, p.days))).en}.`}
            bn={`নতুন দিনগুলো ${dayWords(dhakaDay(premiumUntil)).bn}-এর পরে শুরু হবে, তাই প্রিমিয়াম চলবে ${dayWords(dhakaDay(extendedUntil(premiumUntil, p.days))).bn} পর্যন্ত।`}
          />
        ) : (
          <T en="No card needed. Premium never renews by itself." bn="কার্ড লাগবে না। প্রিমিয়াম নিজে থেকে নবায়ন হয় না।" />
        )}
      </p>
    );
  } else if (step === "send" && mName) {
    title = isBank ? (
      <T en={`Send ${tk(p.amount)} to our bank account`} bn={`আমাদের ব্যাংক অ্যাকাউন্টে ${tk(p.amount)} পাঠান`} />
    ) : (
      <T en={`Send the money by ${mName.en}`} bn={`${mName.bn} দিয়ে টাকা পাঠান`} />
    );
    const copyBtn = number ? (
      <Button variant="quiet" size="sm" onClick={() => void copy(number)} aria-label={L("Copy the number", "নম্বর কপি করুন")}>
        {copied ? <T en="Copied" bn="কপি হয়েছে" /> : <T en="Copy" bn="কপি" />}
      </Button>
    ) : null;
    body = (
      <div className="flex flex-col gap-4">
        {!isBank && (
          <div className="pay-amount">
            <span className="pay-amount-k">
              <T en="Amount" bn="পরিমাণ" />
            </span>
            <span className="pay-amount-v tabular-nums">{tk(p.amount)}</span>
          </div>
        )}
        {!methodInfo || !number ? (
          <p className="text-sm text-text-muted">
            <T en="Loading the number…" bn="নম্বর আসছে…" />
          </p>
        ) : isBank ? (
          <div className="pay-plate pay-plate--bank">
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
                <dd className="pay-plate-big tabular-nums">{number}</dd>
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
            {copyBtn}
          </div>
        ) : (
          <div className="pay-plate">
            <span className="min-w-0">
              <span className="pay-plate-k">
                <T en={`${mName.en} · Send Money to`} bn={`${mName.bn} · এই নম্বরে Send Money`} />
              </span>
              <span className="pay-plate-big tabular-nums">{number}</span>
            </span>
            {copyBtn}
          </div>
        )}
        <ol className="pay-howto">
          {isBank ? (
            <>
              <li><T en="Open your bank's app or internet banking." bn="আপনার ব্যাংকের অ্যাপ বা ইন্টারনেট ব্যাংকিং খুলুন।" /></li>
              <li>
                <T
                  en={<>Send <strong className="tabular-nums">{tk(p.amount)}</strong> to this account by <strong>NPSB</strong> (arrives in seconds) or <strong>BEFTN</strong> (next working day).</>}
                  bn={<>এই অ্যাকাউন্টে <strong>NPSB</strong> (সঙ্গে সঙ্গে পৌঁছায়) বা <strong>BEFTN</strong> (পরের কার্যদিবস) দিয়ে <strong className="tabular-nums">{tk(p.amount)}</strong> পাঠান।</>}
                />
              </li>
              <li><T en="Come back here and tap the button below." bn="এখানে ফিরে নিচের বোতামে চাপুন।" /></li>
            </>
          ) : (
            <>
              <li>
                <T en={<>Open the {mName.en} app and tap <strong>Send Money</strong>.</>} bn={<>{mName.bn} অ্যাপ খুলে <strong>Send Money</strong>-এ চাপুন।</>} />
              </li>
              <li>
                <T
                  en={<>Paste this number and type <strong className="tabular-nums">{tk(p.amount)}</strong>.</>}
                  bn={<>এই নম্বর পেস্ট করে <strong className="tabular-nums">{tk(p.amount)}</strong> লিখুন।</>}
                />
              </li>
              <li><T en="Send it, then come back here. This stays open." bn="পাঠিয়ে এখানে ফিরে আসুন। এটি খোলা থাকবে।" /></li>
            </>
          )}
        </ol>
      </div>
    );
    footer = (
      <div className="pay-foot pay-foot--row">
        {backBtn}
        <Button
          size="lg"
          block
          disabled={!number}
          onClick={() => {
            setStep("confirm");
            trackEvent("premium_pay_sent", { plan, method: method ?? "" });
          }}
        >
          <T en={`I've sent ${tk(p.amount)}`} bn={`${tk(p.amount)} পাঠিয়েছি`} />
        </Button>
      </div>
    );
  } else if (step === "confirm" && mName) {
    title = isBank ? (
      <T en="Tell us how you sent it" bn="কীভাবে পাঠিয়েছেন জানান" />
    ) : (
      <T en={`Which ${mName.en} number did you send it from?`} bn={`কোন ${mName.bn} নম্বর থেকে পাঠিয়েছেন?`} />
    );
    body = (
      <div className="flex flex-col gap-4">
        {isBank ? (
          <>
            <div>
              <p id="pay-transfer-label" className="text-sm font-semibold text-text-main">
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
                <label htmlFor="pay-last4" className="text-sm font-semibold text-text-main">
                  <T en="Last 4 digits of your account" bn="আপনার অ্যাকাউন্টের শেষ 4টি সংখ্যা" />
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
                <label htmlFor="pay-reference" className="text-sm font-semibold text-text-main">
                  <T en="Reference, if any" bn="রেফারেন্স, যদি থাকে" />
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
          </>
        ) : (
          <div>
            <label htmlFor="pay-sender" className="text-sm font-semibold text-text-main">
              <T en={`Your ${mName.en} number`} bn={`আপনার ${mName.bn} নম্বর`} />
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
            <p className="mt-2 text-sm text-text-muted">
              <T en="All 11 digits. We use it only to find your payment." bn="পুরো 11টি সংখ্যা। শুধু আপনার পেমেন্ট খুঁজতে ব্যবহার করি।" />
            </p>
          </div>
        )}
        {error && (
          <div className="form-error" role="alert">
            <p>
              <T en={error.en} bn={error.bn} />
            </p>
          </div>
        )}
      </div>
    );
    footer = (
      <div className="pay-foot">
        <div className="pay-foot--row">
          {backBtn}
          <Button size="lg" block onClick={() => void submit()} disabled={busy || !ready}>
            {busy ? (
              <T en="Starting…" bn="চালু হচ্ছে…" />
            ) : (
              <T en={`I've paid ${tk(p.amount)} · Start Premium`} bn={`${tk(p.amount)} পাঠিয়েছি · প্রিমিয়াম চালু করুন`} />
            )}
          </Button>
        </div>
        <p className="pay-fine">
          <T
            en={`${isPremium ? "The new days are added after the days you have left." : "Premium starts straight away."}${isBank && transfer === "beftn" ? " You do not need to wait for BEFTN to arrive." : ""} We check every payment, and if we cannot find yours, Premium is switched off.`}
            bn={`${isPremium ? "নতুন দিনগুলো আপনার বাকি দিনের পরে যোগ হবে।" : "প্রিমিয়াম সঙ্গে সঙ্গে চালু হবে।"}${isBank && transfer === "beftn" ? " BEFTN পৌঁছানো পর্যন্ত অপেক্ষা করতে হবে না।" : ""} প্রতিটি পেমেন্ট আমরা যাচাই করি, আর খুঁজে না পেলে প্রিমিয়াম বন্ধ হয়ে যায়।`}
          />
        </p>
      </div>
    );
  } else {
    // done
    const until = doneUntil ? dayWords(dhakaDay(doneUntil)) : null;
    title = doneGranted ? <T en="Premium is on" bn="প্রিমিয়াম চালু হয়েছে" /> : <T en="Thank you" bn="ধন্যবাদ" />;
    body = (
      <div className="pay-done">
        <span className="pay-done-ic" aria-hidden>
          <IconCheck size={32} />
        </span>
        <p className="text-sm text-text-main">
          {until ? (
            <T
              en={`It runs till ${until.en}. We will check your payment within a day.`}
              bn={`চলবে ${until.bn} পর্যন্ত। এক দিনের মধ্যে আমরা পেমেন্ট যাচাই করব।`}
            />
          ) : (
            <T en="We will switch Premium on as soon as we find your payment." bn="পেমেন্ট পেলেই প্রিমিয়াম চালু করব।" />
          )}
        </p>
        {doneGranted && (
          <ul className="pay-next">
            <li>
              <Button href="/portfolio" variant="quiet" block>
                <T en="See your portfolio check" bn="আপনার পোর্টফোলিও যাচাই দেখুন" />
              </Button>
            </li>
            <li>
              <Button href="/buy-list" variant="quiet" block>
                <T en="Open today's Buy List" bn="আজকের কেনার তালিকা খুলুন" />
              </Button>
            </li>
          </ul>
        )}
      </div>
    );
    footer = (
      <Button size="lg" block onClick={onClose}>
        <T en="Done" bn="ঠিক আছে" />
      </Button>
    );
  }

  const n = STEP_N[step];
  return (
    <Sheet
      open={open}
      onClose={onClose}
      dismissible={!busy}
      title={title}
      subtitle={
        step === "done" ? undefined : (
          <span className="tabular-nums">
            {n ? <T en={`Step ${n} of 3 · `} bn={`ধাপ ${n} / 3 · `} /> : null}
            <T en={`Premium · ${p.name} · ${tk(p.amount)}`} bn={`প্রিমিয়াম · ${p.bn} · ${tk(p.amount)}`} />
            {mName ? (
              <>
                {" · "}
                <T en={mName.en} bn={mName.bn} />
              </>
            ) : null}
          </span>
        )
      }
      footer={footer}
    >
      {n ? (
        <div className="pay-dots" aria-hidden>
          {[1, 2, 3].map((i) => (
            <i key={i} className={i <= n ? "on" : ""} />
          ))}
        </div>
      ) : null}
      {body}
    </Sheet>
  );
}
