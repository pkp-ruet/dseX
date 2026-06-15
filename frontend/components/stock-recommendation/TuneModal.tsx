"use client";

import { useEffect, useState } from "react";
import {
  getStockRecommendations,
  apiGetLastRecommendation,
  type RecommendationAnswers,
} from "@/lib/api";
import RecommendationQuiz from "./RecommendationQuiz";

/**
 * Shared "tune your picks" modal: the quiz in an overlay. On submit it saves the
 * answers (which clears today's cached feed server-side), then calls onComplete
 * so the caller can refetch the now-personalized daily picks.
 */
export default function TuneModal({
  open,
  sectors,
  onClose,
  onComplete,
}: {
  open: boolean;
  sectors: string[];
  onClose: () => void;
  onComplete: () => void | Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [initial, setInitial] = useState<Partial<RecommendationAnswers> | undefined>();

  useEffect(() => {
    if (!open) return;
    apiGetLastRecommendation()
      .then((r) => setInitial(r.recommendation?.answers))
      .catch(() => {});
  }, [open]);

  if (!open) return null;

  async function handleSubmit(answers: RecommendationAnswers) {
    setSubmitting(true);
    try {
      await getStockRecommendations(answers);
      await onComplete();
      onClose();
    } catch {
      // leave the modal open so the user can retry
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-[var(--surface)] p-5 sm:p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4">
          <h3 className="text-xl font-extrabold text-[var(--text)]">Tune your picks</h3>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Answer a few questions — we&apos;ll match your daily picks to your goals.
          </p>
        </div>
        <RecommendationQuiz
          sectors={sectors}
          initialAnswers={initial}
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}
