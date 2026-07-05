"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiSubmitFeedback } from "@/lib/api";
import { dismissFeedback } from "@/lib/feedback";
import StarRating from "@/components/feedback/StarRating";
import Button from "@/components/ui/Button";

export default function FeedbackSection() {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  const canSubmit = rating > 0 || comment.trim().length > 0;

  async function submit() {
    if (!canSubmit || status === "sending") return;
    setStatus("sending");
    setError("");
    try {
      await apiSubmitFeedback({
        rating: rating > 0 ? rating : undefined,
        comment: comment.trim() || undefined,
        source: "homepage",
        page: "/",
      });
      // A signed-in user who reviews here shouldn't also get nagged by the popup.
      if (user?.user_id) dismissFeedback(user.user_id);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setStatus("idle");
    }
  }

  return (
    <section className="soft-card px-5 sm:px-8 py-8 sm:py-10" aria-labelledby="feedback-heading">
      <div className="max-w-2xl">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[var(--primary-ink)]">
          Your feedback
        </p>
        <h2
          id="feedback-heading"
          className="font-display mt-1.5 text-xl sm:text-2xl font-bold tracking-tight text-[var(--text)]"
        >
          Help us build the best stock research tool in Bangladesh
        </h2>
        <p className="mt-2 text-sm sm:text-base text-[var(--text-muted)]">
          We&apos;re a small team building TopStockBD for DSE investors like you. Every suggestion gets read.
        </p>

        {status === "done" ? (
          <div className="mt-6 rounded-xl border border-[var(--positive)]/30 bg-[var(--positive)]/10 px-4 py-4 text-sm text-[var(--text)]">
            Thank you 🙏 We read every single message.
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <StarRating value={rating} onChange={setRating} />
              {rating > 0 && <span className="text-sm text-[var(--text-muted)]">{rating}/5</span>}
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="What's working? What's missing? Tell us anything…"
              className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            />
            {error && <p className="text-sm text-[var(--negative)]">{error}</p>}
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="primary"
                onClick={submit}
                disabled={!canSubmit || status === "sending"}
              >
                {status === "sending" ? "Sending…" : "Send feedback"}
              </Button>
              {!canSubmit && <span className="text-xs text-[var(--text-muted)]">Rate or write something first</span>}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
