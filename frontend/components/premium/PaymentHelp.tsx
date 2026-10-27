"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { T } from "@/components/i18n/T";
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
  // For placeholders only; visible text uses <T>.
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
      toast({ message: <T en="Sent. We will look into it." bn="পাঠানো হয়েছে। আমরা বিষয়টি দেখছি।" />, tone: "success" });
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
          <p className="font-semibold text-text-main">
            <T en="Thank you. We have your report." bn="ধন্যবাদ। আপনার অভিযোগ আমরা পেয়েছি।" />
          </p>
          <p className="mt-1 text-sm text-text-main">
            <T
              en="We usually reply within a day. If it is urgent, please email us as well."
              bn="সাধারণত এক দিনের মধ্যে উত্তর দিই। জরুরি হলে ইমেইলও করুন।"
            />
          </p>
          <div className="mt-3">
            <Button variant="link" onClick={() => setSent(false)}>
              <T en="Write another" bn="আরেকটি লিখুন" />
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div>
            <label htmlFor="pay-help-msg" className="text-sm font-semibold text-text-main">
              <T en="What went wrong?" bn="কী সমস্যা হয়েছে?" />
            </label>
            <textarea
              id="pay-help-msg"
              rows={4}
              maxLength={1500}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={L(
                "For example: I sent ৳199 by bKash but Premium did not start",
                "যেমন: বিকাশে ৳199 পাঠিয়েছি, কিন্তু প্রিমিয়াম চালু হয়নি",
              )}
              className="input-field mt-2"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pay-help-sender" className="text-sm text-text-main">
                <T
                  en="The number or bank account (last 4 digits) you paid from, if any"
                  bn="যে নম্বর বা ব্যাংক অ্যাকাউন্ট (শেষ 4 সংখ্যা) থেকে পাঠিয়েছেন, যদি থাকে"
                />
              </label>
              <input
                id="pay-help-sender"
                type="text"
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
                  <T en="Your email or phone, so we can reply" bn="আপনার ইমেইল বা ফোন নম্বর, যাতে উত্তর দিতে পারি" />
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
              <p>
                <T
                  en="We could not send that. Please try again, or email us."
                  bn="পাঠানো যায়নি। আবার চেষ্টা করুন, বা ইমেইল করুন।"
                />
              </p>
            </div>
          )}

          <div className="flex flex-col items-start gap-1">
            <Button onClick={() => void submit()} disabled={busy || !canSend}>
              {busy ? <T en="Sending…" bn="পাঠানো হচ্ছে…" /> : <T en="Send report" bn="অভিযোগ পাঠান" />}
            </Button>
          </div>
        </>
      )}

      <p className="border-t border-border pt-4 text-sm text-text-main">
        <T en="Would you rather email? Write to " bn="ইমেইলে জানাতে চাইলে লিখুন " />
        <a href={mailto} className="font-semibold text-primary break-all">{SUPPORT_EMAIL}</a>
        <T
          en=" with the number you paid from and the amount."
          bn=" ঠিকানায়। যে নম্বর থেকে পাঠিয়েছেন আর কত টাকা, তা লিখবেন।"
        />
      </p>
    </div>
  );
}
