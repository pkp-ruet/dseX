"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Bn from "@/components/i18n/Bn";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { apiSubmitFeedback } from "@/lib/api";
import { toast } from "@/lib/toast";
import { trackEvent } from "@/lib/track";

export const SUPPORT_EMAIL = "topstockbd@gmail.com";
const MAX_LEN = 2000;

/**
 * "Problem with a payment?" on /premium: a short report that lands in the
 * admin feedback inbox (`/admin/feedback`, source "payment" — never publishable
 * on the landing page), or an email to us instead. A signed-in report carries
 * the account; a signed-out one asks how to reach the reader.
 */
export default function PaymentHelp() {
  const { isLoggedIn } = useAuth();
  const { bn } = useLang();
  const L = (en: string, b: string) => (bn ? b : en);
  const [message, setMessage] = useState("");
  const [sender, setSender] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(false);

  const canSend = message.trim().length >= 5 && (isLoggedIn || contact.trim().length >= 5);

  const submit = async () => {
    setError(false);
    setBusy(true);
    const lines = [
      message.trim(),
      sender.trim() ? `Paid from: ${sender.trim()}` : "",
      !isLoggedIn && contact.trim() ? `Contact: ${contact.trim()}` : "",
    ].filter(Boolean);
    try {
      await apiSubmitFeedback({ comment: lines.join("\n\n").slice(0, MAX_LEN), source: "payment", page: "/premium" });
      trackEvent("premium_payment_report", {});
      toast({ message: L("Sent — we'll look into it", "পাঠানো হয়েছে — আমরা দেখছি"), tone: "success" });
      setSent(true);
      setMessage("");
      setSender("");
      setContact("");
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Premium payment problem")}`;

  return (
    <div className="flex flex-col gap-4">
      {sent ? (
        <div role="status">
          <p className="font-semibold text-text-main">{L("Thanks — we got your report", "ধন্যবাদ — আপনার অভিযোগ পেয়েছি")}</p>
          {!bn && <Bn className="text-sm text-text-muted">ধন্যবাদ — আপনার অভিযোগ পেয়েছি।</Bn>}
          <p className="mt-1 text-sm text-text-main">
            {L(
              "We usually reply within a day. If it's urgent, email us too.",
              "সাধারণত এক দিনের মধ্যে উত্তর দিই। জরুরি হলে ইমেইলও করুন।",
            )}
          </p>
          <div className="mt-3">
            <Button variant="link" onClick={() => setSent(false)}>{L("Write another", "আরেকটি লিখুন")}</Button>
          </div>
        </div>
      ) : (
        <>
          <div>
            <label htmlFor="pay-help-msg" className="text-sm font-semibold text-text-main">
              {L("What went wrong?", "কী সমস্যা হয়েছে?")}
            </label>
            {!bn && <Bn className="text-sm text-text-muted">কী সমস্যা হয়েছে লিখুন।</Bn>}
            <textarea
              id="pay-help-msg"
              rows={4}
              maxLength={1500}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={L(
                "e.g. I sent ৳199 by bKash but Premium didn't start",
                "যেমন: বিকাশে ৳199 পাঠিয়েছি কিন্তু প্রিমিয়াম চালু হয়নি",
              )}
              className="input-field mt-2"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pay-help-sender" className="text-sm text-text-main">
                {L("Number you paid from (if any)", "যে নম্বর থেকে টাকা পাঠিয়েছেন (যদি থাকে)")}
              </label>
              <input
                id="pay-help-sender"
                type="tel"
                inputMode="numeric"
                placeholder="01XXXXXXXXX"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                className="input-field mt-2 tabular-nums"
                maxLength={20}
              />
            </div>
            {!isLoggedIn && (
              <div>
                <label htmlFor="pay-help-contact" className="text-sm text-text-main">
                  {L("Your email or phone, so we can reply", "আপনার ইমেইল বা ফোন, যাতে উত্তর দিতে পারি")}
                </label>
                <input
                  id="pay-help-contact"
                  type="text"
                  autoComplete="email"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="input-field mt-2"
                  maxLength={120}
                />
              </div>
            )}
          </div>

          {error && (
            <div className="form-error" role="alert">
              {bn ? (
                <p>পাঠানো যায়নি — আবার চেষ্টা করুন, বা ইমেইল করুন।</p>
              ) : (
                <>
                  <p>Couldn&apos;t send that — try again, or email us.</p>
                  <Bn>পাঠানো যায়নি — আবার চেষ্টা করুন, বা ইমেইল করুন।</Bn>
                </>
              )}
            </div>
          )}

          <div className="flex flex-col items-start gap-1">
            <Button onClick={() => void submit()} disabled={busy || !canSend}>
              {busy ? L("Sending…", "পাঠানো হচ্ছে…") : L("Send report", "অভিযোগ পাঠান")}
            </Button>
          </div>
        </>
      )}

      <p className="border-t border-border pt-4 text-sm text-text-main">
        {L("Prefer email? Write to ", "ইমেইলে জানাতে চাইলে লিখুন ")}
        <a href={mailto} className="font-semibold text-primary break-all">{SUPPORT_EMAIL}</a>
        {L(
          " with the number you paid from and the amount.",
          " ঠিকানায় — যে নম্বর থেকে পাঠিয়েছেন আর কত টাকা, সেটি লিখবেন।",
        )}
      </p>
      {!bn && (
        <Bn className="-mt-3 text-sm text-text-muted">
          ইমেইলে জানাতে চাইলে {SUPPORT_EMAIL} ঠিকানায় লিখুন — নম্বর আর টাকার পরিমাণসহ।
        </Bn>
      )}
    </div>
  );
}
