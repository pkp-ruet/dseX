"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { apiSubmitFeedback } from "@/lib/api";
import { T } from "@/components/i18n/T";
import StarRating from "@/components/feedback/StarRating";
import Button from "@/components/ui/Button";
import { IconCheck } from "@/components/ui/icons";

const RATING_WORDS: Record<number, { en: string; bn: string }> = {
  1: { en: "Poor", bn: "খারাপ" },
  2: { en: "Could be better", bn: "আরও ভালো হতে পারে" },
  3: { en: "Okay", bn: "মোটামুটি" },
  4: { en: "Good", bn: "ভালো" },
  5: { en: "Very good", bn: "খুব ভালো" },
};

/**
 * The review block at the end of the signed-in home (redone 2026-11-18 in the
 * simple home's look, user: "make the review section … match with current
 * design"): the home's one heading style (`.hm-head`), one card like the
 * "Today for you" cards, both languages, no emoji. Stars, an optional note,
 * one button. Styles `hm-rv-*` in app/styles/home.css.
 */
export default function FeedbackSection() {
  const { user } = useAuth();
  const { lang } = useLang();
  const bn = lang === "bn";
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done">("idle");
  const [failed, setFailed] = useState(false);

  const canSubmit = rating > 0 || comment.trim().length > 0;

  async function submit() {
    if (!canSubmit || status === "sending") return;
    setStatus("sending");
    setFailed(false);
    try {
      await apiSubmitFeedback({
        rating: rating > 0 ? rating : undefined,
        comment: comment.trim() || undefined,
        source: "homepage",
        page: "/",
      });
      setStatus("done");
    } catch {
      setFailed(true);
      setStatus("idle");
    }
  }

  // Signed-in readers only (2026-10-31): the signed-out landing ends on its
  // own ask, not a review form.
  if (!user) return null;

  return (
    <section className="hm-rv" aria-labelledby="feedback-heading">
      <div className="hm-head">
        <h2 id="feedback-heading" className="hm-head-h">
          <T en="How are we doing?" bn="আমরা কেমন করছি?" />
        </h2>
      </div>

      <div className="hm-rv-card">
        {status === "done" ? (
          <p className="hm-rv-done" role="status">
            <span className="hm-rv-done-ic" aria-hidden>
              <IconCheck size={16} />
            </span>
            <T en="Thank you. We read every message." bn="ধন্যবাদ। আমরা প্রতিটি বার্তা পড়ি।" />
          </p>
        ) : (
          <>
            <p className="hm-rv-lead">
              <T
                en="We are a small team building TopStockBD for DSE investors. Tell us what works and what is missing; we read every message."
                bn="ডিএসইর বিনিয়োগকারীদের জন্য ছোট একটি দল TopStockBD বানাচ্ছে। কী ভালো লাগছে আর কী নেই, জানান; আমরা প্রতিটি বার্তা পড়ি।"
              />
            </p>

            <div className="hm-rv-stars">
              <StarRating value={rating} onChange={setRating} size={30} />
              {rating > 0 && (
                <span className="hm-rv-word">{bn ? RATING_WORDS[rating].bn : RATING_WORDS[rating].en}</span>
              )}
            </div>

            <label htmlFor="feedback-comment" className="sr-only">
              {bn ? "আপনার মতামত" : "Your feedback"}
            </label>
            <textarea
              id="feedback-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder={bn ? "কী ভালো লাগছে, কী নেই? যা খুশি লিখুন…" : "What works? What is missing? Tell us anything…"}
              className="hm-rv-text"
            />

            {failed && (
              <p className="hm-rv-error" role="alert">
                <T
                  en="We couldn't send it. Please try again."
                  bn="পাঠানো যায়নি। আবার চেষ্টা করুন।"
                />
              </p>
            )}

            <div className="hm-rv-acts">
              <Button type="button" variant="primary" onClick={submit} disabled={!canSubmit || status === "sending"}>
                {status === "sending" ? (
                  <T en="Sending…" bn="পাঠানো হচ্ছে…" />
                ) : (
                  <T en="Send" bn="পাঠান" />
                )}
              </Button>
              {!canSubmit && (
                <span className="hm-rv-hint">
                  <T en="Pick a star or write a line first." bn="আগে একটি তারা বাছুন বা এক লাইন লিখুন।" />
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
