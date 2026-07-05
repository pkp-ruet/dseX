"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiSubmitFeedback } from "@/lib/api";
import { isFeedbackDismissed, dismissFeedback } from "@/lib/feedback";
import StarRating from "@/components/feedback/StarRating";
import Button from "@/components/ui/Button";

// Hold off a few seconds after load so the popup doesn't feel jarring.
const SHOW_DELAY_MS = 6000;

// Don't ask brand-new users for feedback — give them time to actually use the
// app and form an opinion first. Only prompt once the account is this old.
const MIN_ACCOUNT_AGE_DAYS = 3;

function accountAgeDays(createdAt?: string | null): number | null {
  if (!createdAt) return null;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return null;
  return (Date.now() - created) / (24 * 60 * 60 * 1000);
}

export default function FeedbackPrompt() {
  const { isLoading, isLoggedIn, user } = useAuth();
  const userId = user?.user_id;

  const [visible, setVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoading || !isLoggedIn || !userId) return;
    if (isFeedbackDismissed(userId)) return;
    // New users get a grace period — don't ask before they've had time to use it.
    const age = accountAgeDays(user?.created_at);
    if (age == null || age < MIN_ACCOUNT_AGE_DAYS) return;
    const t = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, [isLoading, isLoggedIn, userId, user?.created_at]);

  function close() {
    setVisible(false);
    dismissFeedback(userId); // never show again — whether they reviewed or not
  }

  const canSubmit = rating > 0 || comment.trim().length > 0;

  async function submit() {
    if (!canSubmit || status === "sending") return;
    setStatus("sending");
    setError("");
    try {
      await apiSubmitFeedback({
        rating: rating > 0 ? rating : undefined,
        comment: comment.trim() || undefined,
        source: "popup",
        page: typeof window !== "undefined" ? window.location.pathname : undefined,
      });
      setStatus("done");
      dismissFeedback(userId);
      setTimeout(() => setVisible(false), 1800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setStatus("idle");
    }
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Feedback"
      className="fixed z-[60] inset-x-3 bottom-20 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[22rem] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xl shadow-black/10"
    >
      <div className="p-4 sm:p-5">
        {status === "done" ? (
          <div className="py-3 text-center">
            <p className="text-2xl">🙏</p>
            <p className="mt-1 text-sm font-semibold text-[var(--text)]">Thank you!</p>
            <p className="text-xs text-[var(--text-muted)]">We read every single message.</p>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-bold leading-snug text-[var(--text)]">
                How&apos;s TopStockBD working for you?
              </h3>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="-mr-1 -mt-1 shrink-0 rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              We&apos;d love to hear what you think. Takes less than a minute.
            </p>

            <div className="mt-3 flex justify-center sm:justify-start">
              <StarRating value={rating} onChange={setRating} size={30} />
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="Anything you'd like to add? (optional)"
              className="mt-3 w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            />

            {error && <p className="mt-2 text-xs text-[var(--negative)]">{error}</p>}

            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={close}
                className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                No thanks
              </button>
              <Button
                type="button"
                variant="primary"
                onClick={submit}
                disabled={!canSubmit || status === "sending"}
              >
                {status === "sending" ? "Sending…" : "Share feedback"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
