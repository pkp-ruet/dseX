"use client";

import { useEffect, useMemo, useState } from "react";
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import Link from "@/components/ui/Link";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import { apiSetWatchRules, type WatchRulesState } from "@/lib/api";
import { FREE_LIMITS, isLimitError, PREMIUM_PATH, usePremium } from "@/lib/premium";
import { dhakaDay, shortDayWords } from "@/lib/renewal";
import { showLimitNotice } from "@/components/premium/LimitNotice";
import { toast } from "@/lib/toast";
import { trackEvent } from "@/lib/track";
import { RULE_KINDS, SUGGESTED, ruleLabel } from "@/lib/watch-rules";
import { setWatchRulesState } from "@/components/watch-rules/store";

type Pick = Record<string, { on: boolean; value?: number }>;

/**
 * "Watch this share" (THE Premium line, step 4): one sheet of rules for one
 * share — tick what you want to hear about. A share with no rules opens with
 * the usual set ticked (grade down, a serious problem, results, a dividend);
 * nothing is saved until Save. A free reader has 3 rules in all, price alerts
 * included; the sheet counts them as the reader ticks.
 */
export default function WatchRulesSheet({
  code,
  name,
  state,
  open,
  onClose,
}: {
  code: string;
  name: string;
  state: WatchRulesState | null;
  open: boolean;
  onClose: () => void;
}) {
  const { bn } = useLang();
  const { isPremium, taste } = usePremium();
  const mine = useMemo(() => (state?.rules ?? []).filter((r) => r.code === code), [state, code]);
  const fresh = mine.length === 0;
  const [pick, setPick] = useState<Pick>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const p: Pick = {};
    for (const k of RULE_KINDS) {
      const have = mine.find((r) => r.kind === k.key);
      p[k.key] = { on: have ? true : fresh && SUGGESTED.includes(k.key), value: have?.value ?? k.value };
    }
    setPick(p);
  }, [open, mine, fresh]);

  const chosen = RULE_KINDS.filter((k) => pick[k.key]?.on);
  const othersUsed = (state?.used ?? 0) - mine.length;
  const total = othersUsed + chosen.length;
  const limit = isPremium ? null : state?.limit ?? null;
  const over = limit != null && total > limit && chosen.length > mine.length;
  // The 7-day taste lifts the cap; say so, and what happens when it ends.
  const tasteEnd = !isPremium && limit == null && taste?.active && taste.until ? shortDayWords(dhakaDay(taste.until)) : null;
  const freeCap = FREE_LIMITS.alerts ?? 3;

  async function save() {
    setSaving(true);
    try {
      const next = await apiSetWatchRules(
        code,
        chosen.map((k) => (k.values ? { kind: k.key, value: pick[k.key]?.value ?? k.value } : { kind: k.key })),
      );
      setWatchRulesState(next);
      trackEvent("watch_rules_save", { code, n: chosen.length, premium: isPremium ? 1 : 0 });
      toast(
        chosen.length
          ? { message: <T en={`Watching ${code}: ${chosen.length} ${chosen.length === 1 ? "rule" : "rules"}`} bn={`${code}-এ নজর: ${chosen.length}টি নিয়ম`} /> }
          : { message: <T en={`No rules on ${code} now`} bn={`${code}-এ এখন কোনো নিয়ম নেই`} /> },
      );
      onClose();
    } catch (err) {
      if (isLimitError(err, "alerts")) {
        onClose();
        showLimitNotice("alerts");
      } else {
        toast({ message: <T en="Your rules didn't save. Please try again." bn="নিয়মগুলো সেভ হয়নি। আবার চেষ্টা করুন।" />, tone: "error" });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      dismissible={!saving}
      title={<T en={`Watch ${name}`} bn={`${name}-এ নজর রাখুন`} />}
      footer={
        <div className="wr-foot">
          <Button variant="quiet" onClick={onClose} disabled={saving}>
            <T en="Cancel" bn="বাতিল" />
          </Button>
          <Button onClick={save} disabled={saving || over}>
            <T en="Save rules" bn="নিয়ম সেভ করুন" />
          </Button>
        </div>
      }
    >
      <p className="wr-lead">
        <T en="Tell me when…" bn="আমাকে জানান যখন…" />
        {fresh && (
          <span className="wr-suggest">
            <T en=" We ticked the usual ones. Change them as you like." bn=" সাধারণগুলো টিক দেওয়া আছে। ইচ্ছেমতো বদলান।" />
          </span>
        )}
      </p>
      <ul className="wr-list">
        {RULE_KINDS.map((k) => {
          const p = pick[k.key] ?? { on: false };
          const id = `wr-${code}-${k.key}`;
          const words = ruleLabel(k.key, p.value);
          return (
            <li key={k.key} className="wr-row" data-on={p.on || undefined}>
              <input
                id={id}
                type="checkbox"
                className="wr-check"
                checked={p.on}
                onChange={(e) => setPick((s) => ({ ...s, [k.key]: { ...p, on: e.target.checked } }))}
              />
              <label htmlFor={id} className="wr-label">
                <T en={words.en} bn={words.bn} />
                {k.held && (
                  <span className="wr-note">
                    <T en=" (if you own it)" bn=" (শেয়ারটি আপনার থাকলে)" />
                  </span>
                )}
              </label>
              {k.values && (
                <select
                  aria-label={bn ? "কত শতাংশ" : "How much"}
                  className="wr-value"
                  value={p.value ?? k.value}
                  onChange={(e) => setPick((s) => ({ ...s, [k.key]: { ...p, on: true, value: Number(e.target.value) } }))}
                >
                  {k.values.map((v) => (
                    <option key={v} value={v}>
                      {v}%
                    </option>
                  ))}
                </select>
              )}
            </li>
          );
        })}
      </ul>

      {limit != null ? (
        <div className={`wr-count${over ? " wr-count--over" : ""}`}>
          <p>
            <T
              en={`You're using ${total} of ${limit} free rules, price alerts included.`}
              bn={`ফ্রিতে ${limit}টি নিয়মের ${total}টি ব্যবহার করছেন, প্রাইস অ্যালার্টসহ।`}
            />
          </p>
          <p>
            <T
              en="Premium watches as many as you need, and tells you the same evening. Free rules show in Updates the next time you open the app."
              bn="প্রিমিয়াম যত দরকার তত নিয়মে নজর রাখে, আর সেদিন সন্ধ্যায়ই জানায়। ফ্রি নিয়ম পরের বার অ্যাপ খুললে আপডেটে দেখা যায়।"
            />{" "}
            <Link
              href={`${PREMIUM_PATH}?src=watch-rules#pay`}
              className="font-semibold text-primary-ink hover:underline"
              onClick={() => trackEvent("premium_lock_tap", { area: "watch-rules", lock: "watch-rules", code })}
            >
              <T en="See Premium" bn="প্রিমিয়াম দেখুন" />
            </Link>
          </p>
        </div>
      ) : tasteEnd ? (
        <div className="wr-count">
          <p>
            <T
              en={`No limit during your free week, until ${tasteEnd.en}. We check these after every close and tell you the same evening.`}
              bn={`আপনার ফ্রি সপ্তাহে কোনো সীমা নেই, ${tasteEnd.bn} পর্যন্ত। প্রতিদিন বাজার বন্ধের পর আমরা এগুলো দেখি, আর সেদিন সন্ধ্যায়ই জানাই।`}
            />
          </p>
          <p>
            <T
              en={`After that, your first ${freeCap} rules stay on, price alerts included, and the rest pause. Premium keeps them all on.`}
              bn={`এরপর প্রথম ${freeCap}টি নিয়ম চালু থাকবে, প্রাইস অ্যালার্টসহ, বাকিগুলো থেমে যাবে। প্রিমিয়ামে সবগুলোই চালু থাকে।`}
            />{" "}
            <Link
              href={`${PREMIUM_PATH}?src=watch-rules-taste#pay`}
              className="font-semibold text-primary-ink hover:underline"
              onClick={() => trackEvent("premium_lock_tap", { area: "watch-rules", lock: "watch-rules-taste", code })}
            >
              <T en="See Premium" bn="প্রিমিয়াম দেখুন" />
            </Link>
          </p>
        </div>
      ) : (
        <p className="wr-count">
          <T
            en="We check these after every close and tell you the same evening."
            bn="প্রতিদিন বাজার বন্ধের পর আমরা এগুলো দেখি, আর সেদিন সন্ধ্যায়ই জানাই।"
          />
        </p>
      )}
    </Sheet>
  );
}
