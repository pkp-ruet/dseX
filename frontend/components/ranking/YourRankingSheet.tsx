"use client";

import { useEffect, useState } from "react";
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import { IconCrown } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { PILLARS } from "@/lib/landing";
import { DEFAULT_WEIGHTS, isDefault, type Weight, type Weights } from "@/components/ranking/weights";

const WEIGHT_WORDS: { key: Weight; en: string; bn: string }[] = [
  { key: "less", en: "Less", bn: "কম" },
  { key: "normal", en: "Normal", bn: "সাধারণ" },
  { key: "more", en: "More", bn: "বেশি" },
];

/** What each check asks, in a line, so a reader knows what they weigh. */
const CHECK_LINES: { en: string; bn: string }[] = [
  { en: "Does it make a steady, growing profit?", bn: "মুনাফা কি নিয়মিত আর বাড়ছে?" },
  { en: "Can it handle its loans and bills?", bn: "ঋণ আর খরচ কি সামলাতে পারে?" },
  { en: "Is it strong in its business?", bn: "নিজের ব্যবসায় কি শক্ত অবস্থানে?" },
  { en: "Is the price low for its profit?", bn: "মুনাফার তুলনায় দাম কি কম?" },
  { en: "Does it pay cash every year?", bn: "প্রতি বছর কি নগদ ডিভিডেন্ড দেয়?" },
];

/**
 * "Your own ranking" (Premium): five checks, each Less · Normal · More. A
 * free reader sees the same sheet with the choices switched off and one line
 * pointing at the page's Premium card.
 */
export default function YourRankingSheet({
  open,
  onClose,
  weights,
  onApply,
  locked,
  onPremium,
}: {
  open: boolean;
  onClose: () => void;
  weights: Weights;
  onApply: (w: Weights) => void;
  locked: boolean;
  onPremium: () => void;
}) {
  const [draft, setDraft] = useState<Weights>(weights);
  useEffect(() => {
    if (open) setDraft(weights);
  }, [open, weights]);

  const set = (k: number, w: Weight) =>
    setDraft((prev) => prev.map((x, i) => (i === k ? w : x)) as Weights);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={<T en="Your own ranking" bn="আপনার নিজের র‍্যাঙ্কিং" />}
      footer={
        locked ? (
          <Button onClick={onPremium} block>
            <T en="Rank it your way with Premium" bn="প্রিমিয়ামে নিজের মতো করে সাজান" />
          </Button>
        ) : (
          <div className="rk-weights-actions">
            <Button variant="quiet" onClick={() => setDraft(DEFAULT_WEIGHTS)} disabled={isDefault(draft)}>
              <T en="Our weights" bn="আমাদের ভার" />
            </Button>
            <Button
              onClick={() => {
                onApply(draft);
                onClose();
              }}
            >
              <T en="Rank the table" bn="তালিকা সাজান" />
            </Button>
          </div>
        )
      }
    >
      <p className="rk-weights-lead">
        <T
          en="Say which checks matter more or less to you. The table re-orders by your choice; the grades stay ours."
          bn="কোন যাচাই আপনার কাছে বেশি বা কম জরুরি, তা বলুন। তালিকা আপনার পছন্দে সাজানো হবে; গ্রেড আমাদেরই থাকবে।"
        />
      </p>
      {locked && (
        <p className="rk-weights-locked">
          <IconCrown size={14} />
          <T
            en="This is part of Premium. You can see the choices, but not change them."
            bn="এটি প্রিমিয়ামের অংশ। বিকল্পগুলো দেখতে পারবেন, বদলাতে পারবেন না।"
          />
        </p>
      )}
      <ul className="rk-weights">
        {PILLARS.map((p, k) => (
          <li key={p.key} className="rk-weight">
            <span className="rk-weight-name">
              <b>
                <T en={p.en} bn={p.bn} />
              </b>
              <span>
                <T en={CHECK_LINES[k].en} bn={CHECK_LINES[k].bn} />
              </span>
            </span>
            <span className="rk-weight-seg" role="radiogroup" aria-label={p.en}>
              {WEIGHT_WORDS.map((w) => (
                <button
                  key={w.key}
                  type="button"
                  role="radio"
                  aria-checked={draft[k] === w.key}
                  disabled={locked}
                  className={`rk-weight-opt${draft[k] === w.key ? " is-on" : ""}`}
                  onClick={() => set(k, w.key)}
                >
                  <T en={w.en} bn={w.bn} />
                </button>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
