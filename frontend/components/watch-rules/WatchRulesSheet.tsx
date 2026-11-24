"use client";

import { useEffect, useMemo, useState } from "react";
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import Link from "@/components/ui/Link";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import { apiKeepWatchRule, apiSetWatchRules, type ScoreItem, type ScoresResponse, type WatchRulesState } from "@/lib/api";
import { FREE_LIMITS, isLimitError, PREMIUM_PATH, usePremium } from "@/lib/premium";
import { dhakaDay, shortDayWords } from "@/lib/renewal";
import { showLimitNotice } from "@/components/premium/LimitNotice";
import { toast } from "@/lib/toast";
import { trackEvent } from "@/lib/track";
import { cacheKeys, readCache } from "@/lib/swr-cache";
import { RULE_KINDS, SUGGESTED, ruleLabel } from "@/lib/watch-rules";
import { addToWatchlist, isWatched, loadWatchlist, subscribeWatchlist } from "@/lib/watchlist";
import { activeAlertFor, createAlert, deleteAlert, loadAlerts, subscribeAlerts, updateAlert } from "@/lib/price-alerts";
import { setWatchRulesState, stopWatching } from "@/components/watch-rules/store";

type Pick = Record<string, { on: boolean; value?: number }>;

function fmt(n: number): string {
  return Number(n.toFixed(2)).toString();
}

/** Today's price from the scores the app already keeps on this device. */
function cachedPrice(code: string): number | null {
  const s = readCache<ScoresResponse>(cacheKeys.scores);
  if (!s) return null;
  for (const list of Object.values(s.tiers) as ScoreItem[][]) {
    const hit = list.find((i) => i.trading_code.toUpperCase() === code);
    if (hit) return hit.ltp ?? null;
  }
  return null;
}

/**
 * THE Watch sheet (2026-11-25, one Watch button; was "Watch this share" of
 * 2026-11-22). Watching a share = it is on your watchlist. The sheet holds
 * everything we can tell you about one share in one place: the rules (tick
 * what you want to hear about), a price alert, and Stop watching. A share
 * not watched yet opens with the usual rules ticked, as many as a free
 * reader's cap leaves room for; nothing is saved until the main button.
 * A free reader has 3 rules in all, price alerts included; the sheet counts
 * them as the reader ticks. Paused rules (past the cap) can be kept on here.
 */
export default function WatchRulesSheet({
  code,
  name,
  state,
  open,
  onClose,
  ltp = null,
  tick,
}: {
  code: string;
  name: string;
  state: WatchRulesState | null;
  open: boolean;
  onClose: () => void;
  ltp?: number | null;
  /** Rules to tick when the sheet opens (the calendar's "Remind me"). */
  tick?: string[];
}) {
  const { bn } = useLang();
  const { isPremium, taste } = usePremium();
  const up = code.toUpperCase();
  const mine = useMemo(() => (state?.rules ?? []).filter((r) => r.code === up), [state, up]);
  const fresh = mine.length === 0;
  const [watched, setWatched] = useState(() => isWatched(up));
  const [alert, setAlert] = useState(() => activeAlertFor(up));
  const [pick, setPick] = useState<Pick>({});
  const [alertOn, setAlertOn] = useState(false);
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [keeping, setKeeping] = useState<string | null>(null);
  const today = ltp ?? cachedPrice(up);

  const limit = isPremium ? null : state?.limit ?? null;
  const othersUsed = (state?.used ?? 0) - mine.length - (alert ? 1 : 0);

  useEffect(() => {
    if (!open) return;
    loadWatchlist().then(() => setWatched(isWatched(up))).catch(() => {});
    loadAlerts().then(() => setAlert(activeAlertFor(up))).catch(() => {});
    const offW = subscribeWatchlist(() => setWatched(isWatched(up)));
    const offA = subscribeAlerts(() => setAlert(activeAlertFor(up)));
    return () => {
      offW();
      offA();
    };
  }, [open, up]);

  // Start from what is saved; a share with no rules gets the usual ones,
  // as many as fit a free reader's room, plus whatever the caller asked to tick.
  useEffect(() => {
    if (!open) return;
    const room = limit == null ? Infinity : Math.max(0, limit - othersUsed - (alert ? 1 : 0));
    const suggest = fresh ? [...(tick ?? []), ...SUGGESTED.filter((k) => !(tick ?? []).includes(k))].slice(0, room) : [];
    const p: Pick = {};
    for (const k of RULE_KINDS) {
      const have = mine.find((r) => r.kind === k.key);
      p[k.key] = {
        on: have ? true : suggest.includes(k.key) || (!fresh && (tick ?? []).includes(k.key)),
        value: have?.value ?? k.value,
      };
    }
    setPick(p);
    // Only when the sheet opens or the saved rules change.
  }, [open, mine, fresh]);

  useEffect(() => {
    if (!open) return;
    setAlertOn(!!alert);
    setPrice(alert ? fmt(alert.target_price) : today != null ? fmt(today * 0.95) : "");
  }, [open, alert?.id]);

  const chosen = RULE_KINDS.filter((k) => pick[k.key]?.on);
  const alertDelta = (alertOn ? 1 : 0) - (alert ? 1 : 0);
  const total = othersUsed + chosen.length + (alertOn ? 1 : 0);
  const over = limit != null && total > limit && (chosen.length > mine.length || alertDelta > 0);
  const target = parseFloat(price);
  const priceBad = alertOn && !(target > 0);
  const tasteEnd = !isPremium && limit == null && taste?.active && taste.until ? shortDayWords(dhakaDay(taste.until)) : null;
  const freeCap = FREE_LIMITS.alerts ?? 3;
  const changedRules =
    chosen.length !== mine.length ||
    chosen.some((k) => {
      const have = mine.find((r) => r.kind === k.key);
      return !have || (k.values && (have.value ?? k.value) !== (pick[k.key]?.value ?? k.value));
    });

  async function save() {
    setSaving(true);
    try {
      if (!watched) {
        const r = await addToWatchlist(up);
        if (r === "limit") return onClose();
        if (r === "error") throw new Error("follow");
      }
      // Free room first: an alert switched off before rules are added.
      if (alert && !alertOn) await deleteAlert(alert.id);
      if (changedRules || (fresh && chosen.length)) {
        const next = await apiSetWatchRules(
          up,
          chosen.map((k) => (k.values ? { kind: k.key, value: pick[k.key]?.value ?? k.value } : { kind: k.key })),
        );
        setWatchRulesState(next);
      }
      if (alertOn && target > 0) {
        if (!alert) {
          const made = await createAlert(up, target);
          if (made === "limit") {
            onClose();
            showLimitNotice("alerts");
            return;
          }
        } else if (Math.abs(alert.target_price - target) > 1e-9) {
          await updateAlert(alert.id, target);
        }
      }
      const n = chosen.length + (alertOn ? 1 : 0);
      trackEvent("watch_save", { code: up, n, alert: alertOn ? 1 : 0, was: watched ? 1 : 0, premium: isPremium ? 1 : 0 });
      toast({
        tone: "success",
        message: !watched ? (
          <T
            en={n ? `You're watching ${up}. We'll tell you about ${n} ${n === 1 ? "thing" : "things"}.` : `You're watching ${up}. It's on your watchlist.`}
            bn={n ? `${up}-এ নজর রাখছেন। ${n}টি বিষয়ে জানাব।` : `${up}-এ নজর রাখছেন। এটি আপনার ওয়াচলিস্টে আছে।`}
          />
        ) : (
          <T en={`Saved what we tell you about ${up}`} bn={`${up} নিয়ে কী জানাব, সেভ হয়েছে`} />
        ),
      });
      onClose();
    } catch (err) {
      if (isLimitError(err, "alerts")) {
        onClose();
        showLimitNotice("alerts");
      } else {
        toast({ message: <T en="That didn't save. Please try again." bn="সেভ হয়নি। আবার চেষ্টা করুন।" />, tone: "error" });
      }
    } finally {
      setSaving(false);
    }
  }

  async function stop() {
    setSaving(true);
    try {
      const undo = await stopWatching(up);
      trackEvent("watch_stop", { code: up, n: mine.length, alert: alert ? 1 : 0 });
      onClose();
      toast({
        tone: "neutral",
        message: <T en={`You stopped watching ${up}`} bn={`${up}-এ নজর রাখা বন্ধ করেছেন`} />,
        action: { label: <T en="Undo" bn="ফিরিয়ে আনুন" />, onClick: () => void undo() },
      });
    } finally {
      setSaving(false);
    }
  }

  async function keep(kind: string, on: boolean) {
    setKeeping(kind);
    try {
      setWatchRulesState(await apiKeepWatchRule(up, kind, on));
      trackEvent("watch_rules_keep", { code: up, kind, keep: on ? 1 : 0 });
    } catch {
      toast({ message: <T en="That didn't save. Please try again." bn="সেভ হয়নি। আবার চেষ্টা করুন।" />, tone: "error" });
    } finally {
      setKeeping(null);
    }
  }

  const paused = new Map(mine.filter((r) => r.paused || r.keep).map((r) => [r.kind, r]));
  const room = limit != null ? Math.max(0, limit - (state?.armed_alerts ?? 0)) : null;
  const canKeep = limit != null && (state?.rules.length ?? 0) > (room ?? 0);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      dismissible={!saving}
      title={<T en={`Watch ${name}`} bn={`${name}-এ নজর রাখুন`} />}
      footer={
        <div className="wr-foot">
          {watched && (
            <Button variant="link" onClick={stop} disabled={saving} className="wr-stop">
              <T en="Stop watching" bn="নজর রাখা বন্ধ করুন" />
            </Button>
          )}
          <span className="wr-foot-gap" />
          <Button variant="quiet" onClick={onClose} disabled={saving}>
            <T en="Cancel" bn="বাতিল" />
          </Button>
          <Button onClick={save} disabled={saving || over || priceBad}>
            {watched ? <T en="Save" bn="সেভ করুন" /> : <T en={`Watch ${up}`} bn="নজর রাখুন" />}
          </Button>
        </div>
      }
    >
      <p className="wr-lead">
        {watched ? (
          <T en={`${up} is on your watchlist. Tell me when…`} bn={`${up} আপনার ওয়াচলিস্টে আছে। আমাকে জানান যখন…`} />
        ) : (
          <T en={`${up} goes on your watchlist. Tell me when…`} bn={`${up} আপনার ওয়াচলিস্টে যাবে। আমাকে জানান যখন…`} />
        )}
        {fresh && chosen.length > 0 && (
          <span className="wr-suggest">
            <T en=" We ticked the usual ones. Change them as you like." bn=" সাধারণগুলো টিক দেওয়া আছে। ইচ্ছেমতো বদলান।" />
          </span>
        )}
      </p>
      <ul className="wr-list">
        {RULE_KINDS.map((k) => {
          const p = pick[k.key] ?? { on: false };
          const id = `wr-${up}-${k.key}`;
          const words = ruleLabel(k.key, p.value);
          const saved = paused.get(k.key);
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
                {saved?.paused && (
                  <span className="wr-paused">
                    <T en=" · Paused" bn=" · থেমে আছে" />
                  </span>
                )}
              </label>
              {canKeep && saved && (
                <button
                  type="button"
                  className="wr-keep"
                  aria-pressed={!!saved.keep}
                  disabled={keeping === k.key}
                  onClick={() => keep(k.key, !saved.keep)}
                >
                  {saved.keep ? <T en="Kept on" bn="চালু রাখা" /> : <T en="Keep on" bn="চালু রাখুন" />}
                </button>
              )}
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
        <li className="wr-row wr-alert" data-on={alertOn || undefined}>
          <input
            id={`wr-${up}-price`}
            type="checkbox"
            className="wr-check"
            checked={alertOn}
            onChange={(e) => setAlertOn(e.target.checked)}
          />
          <label htmlFor={`wr-${up}-price`} className="wr-label">
            <T en="It reaches a price" bn="দাম একটি নির্দিষ্ট দামে পৌঁছালে" />
            {today != null && (
              <span className="wr-note">
                <T en={` (today ৳${fmt(today)})`} bn={` (আজ ৳${fmt(today)})`} />
              </span>
            )}
          </label>
          <span className="wr-price">
            <span aria-hidden="true">৳</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              aria-label={bn ? "অ্যালার্টের দাম" : "Alert price"}
              className="wr-price-in"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                setAlertOn(true);
              }}
            />
          </span>
        </li>
      </ul>
      {alertOn && today != null && target > 0 && (
        <p className="wr-alert-note">
          {target >= today ? (
            <T en={`We tell you on the day it rises to ৳${fmt(target)}.`} bn={`দাম ৳${fmt(target)}-এ উঠলে সেদিনই জানাব।`} />
          ) : (
            <T en={`We tell you on the day it falls to ৳${fmt(target)}.`} bn={`দাম ৳${fmt(target)}-এ নামলে সেদিনই জানাব।`} />
          )}
        </p>
      )}

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
              onClick={() => trackEvent("premium_lock_tap", { area: "watch-rules", lock: "watch-rules", code: up })}
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
              onClick={() => trackEvent("premium_lock_tap", { area: "watch-rules", lock: "watch-rules-taste", code: up })}
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
