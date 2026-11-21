"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "@/components/ui/Link";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { T } from "@/components/i18n/T";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { apiKeepWatchRule, apiSetWatchRules, getScores, type ScoreItem, type WatchRule, type WatchRulesState } from "@/lib/api";
import { companyShort } from "@/lib/formatters";
import { authHref } from "@/lib/next-path";
import { FREE_LIMITS, isLimitError, PREMIUM_PATH, usePremium } from "@/lib/premium";
import { showLimitNotice } from "@/components/premium/LimitNotice";
import { dhakaDay, shortDayWords } from "@/lib/renewal";
import { heldQty, loadMainHoldings } from "@/lib/main-holdings";
import { getCachedWatchlist, loadWatchlist, subscribeWatchlist } from "@/lib/watchlist";
import { RULE_KINDS, ruleLabel } from "@/lib/watch-rules";
import { toast } from "@/lib/toast";
import { trackEvent } from "@/lib/track";
import {
  getWatchRulesState,
  loadWatchRules,
  openWatchRules,
  setWatchRulesState,
  subscribeWatchRules,
} from "@/components/watch-rules/store";

const SHORT_LIST = 6;
const order = (k: string) => RULE_KINDS.findIndex((r) => r.key === k);

/**
 * The Watch rules page (2026-11-22): the plan line (how many rules a free
 * reader uses, the free week, or nothing for Premium), every share with
 * rules — each rule a chip, paused ones grey, "Keep on" for a free reader
 * past the cap — the shares they own or follow with no rules yet, and a
 * search to add any other share. Every change goes through the same sheet
 * as the stock page, except Keep on and Stop watching.
 */
export default function WatchRulesPage() {
  const { isLoggedIn, isLoading } = useAuth();
  const { bn } = useLang();
  const { isPremium, taste } = usePremium();
  const [state, setState] = useState<WatchRulesState | null>(getWatchRulesState());
  const [loaded, setLoaded] = useState(!!getWatchRulesState());
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [all, setAll] = useState<ScoreItem[]>([]);
  const [held, setHeld] = useState<string[]>([]);
  const [followed, setFollowed] = useState<string[]>(getCachedWatchlist());
  const [showAllNew, setShowAllNew] = useState(false);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;
    let live = true;
    loadWatchRules().then((s) => {
      if (!live) return;
      if (s) setState(s);
      setLoaded(true);
    });
    loadMainHoldings()
      .then((h) => live && setHeld([...heldQty(h).entries()].filter(([, n]) => n > 0).map(([c]) => c)))
      .catch(() => {});
    loadWatchlist().then((c) => live && setFollowed(c)).catch(() => {});
    getScores()
      .then((s) => {
        if (!live) return;
        const items = Object.values(s.tiers).flat();
        setAll(items);
        setNames(new Map(items.map((i) => [i.trading_code.toUpperCase(), companyShort(i.company_name) || i.trading_code])));
      })
      .catch(() => {});
    const offRules = subscribeWatchRules(() => setState(getWatchRulesState()));
    const offWatch = subscribeWatchlist(() => setFollowed(getCachedWatchlist()));
    return () => {
      live = false;
      offRules();
      offWatch();
    };
  }, [isLoggedIn]);

  const rules = useMemo(() => state?.rules ?? [], [state]);
  const byCode = useMemo(() => {
    const m = new Map<string, WatchRule[]>();
    for (const r of rules) m.set(r.code, [...(m.get(r.code) ?? []), r]);
    for (const list of m.values()) list.sort((a, b) => order(a.kind) - order(b.kind));
    return m;
  }, [rules]);
  const watched = [...byCode.keys()];
  const heldSet = useMemo(() => new Set(held), [held]);
  const notYet = useMemo(
    () => [...new Set([...held, ...followed.map((c) => c.toUpperCase())])].filter((c) => !byCode.has(c)),
    [held, followed, byCode],
  );

  const limit = isPremium ? null : state?.limit ?? null;
  const used = state?.used ?? 0;
  const paused = rules.filter((r) => r.paused).length;
  const kept = rules.filter((r) => r.keep).length;
  const room = limit != null ? Math.max(0, limit - (state?.armed_alerts ?? 0)) : null;
  // Keep on matters only once rules don't all fit.
  const canKeep = limit != null && rules.length > (room ?? 0);
  const tasteEnd = !isPremium && limit == null && taste?.active && taste.until ? shortDayWords(dhakaDay(taste.until)) : null;
  const freeCap = FREE_LIMITS.alerts ?? 3;

  const matches = useMemo(() => {
    const t = q.trim().toUpperCase();
    if (t.length < 2) return [];
    return all
      .filter((i) => i.trading_code.toUpperCase().includes(t) || (i.company_name ?? "").toUpperCase().includes(t))
      .slice(0, 6);
  }, [q, all]);

  const nameOf = (c: string) => names.get(c) || c;

  async function toggleKeep(r: WatchRule) {
    if (!r.keep && room != null && kept >= room) {
      toast({
        message: (
          <T
            en={`You can keep ${room} on. Take "Keep on" off another rule first.`}
            bn={`${room}টি নিয়ম চালু রাখা যায়। আগে অন্য একটি থেকে "চালু রাখুন" তুলে নিন।`}
          />
        ),
      });
      return;
    }
    setBusy(`${r.code}-${r.kind}`);
    try {
      setWatchRulesState(await apiKeepWatchRule(r.code, r.kind, !r.keep));
      trackEvent("watch_rules_keep", { code: r.code, kind: r.kind, keep: r.keep ? 0 : 1 });
    } catch {
      toast({ message: <T en="That didn't save. Please try again." bn="সেভ হয়নি। আবার চেষ্টা করুন।" />, tone: "error" });
    } finally {
      setBusy(null);
    }
  }

  async function stop(code: string) {
    const before = byCode.get(code) ?? [];
    setBusy(code);
    try {
      setWatchRulesState(await apiSetWatchRules(code, []));
      trackEvent("watch_rules_stop", { code, n: before.length });
      toast({
        message: <T en={`Stopped watching ${code}`} bn={`${code}-এ নজর বন্ধ`} />,
        tone: "neutral",
        action: {
          label: <T en="Undo" bn="ফিরিয়ে আনুন" />,
          onClick: () => {
            apiSetWatchRules(code, before.map((r) => (r.value != null ? { kind: r.kind, value: r.value } : { kind: r.kind })))
              .then(setWatchRulesState)
              .catch((err) => (isLimitError(err, "alerts") ? showLimitNotice("alerts") : undefined));
          },
        },
      });
    } catch {
      toast({ message: <T en="That didn't save. Please try again." bn="সেভ হয়নি। আবার চেষ্টা করুন।" />, tone: "error" });
    } finally {
      setBusy(null);
    }
  }

  if (isLoading || (isLoggedIn && !loaded)) {
    return (
      <div className="wrp-card" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="wrp-share">
            <Skeleton width="40%" height={16} />
            <Skeleton width="80%" height={14} />
          </div>
        ))}
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <EmptyState
        title={<T en="Sign in to set your rules" bn="নিয়ম রাখতে সাইন ইন করুন" />}
        message={
          <T
            en="Tell us what you want to hear about each share: its grade falling, results, a dividend, a big fall. We check after every close."
            bn="প্রতিটি শেয়ার নিয়ে কী জানতে চান বলুন: গ্রেড নামা, আর্থিক ফল, ডিভিডেন্ড, বড় দরপতন। প্রতিদিন বাজার বন্ধের পর আমরা দেখি।"
          />
        }
        actions={[
          { href: authHref("/register", "/watch-rules"), label: <T en="Sign up free" bn="ফ্রি সাইন আপ" /> },
          { href: authHref("/login", "/watch-rules"), label: <T en="Sign in" bn="সাইন ইন" /> },
        ]}
      />
    );
  }

  return (
    <>
      {/* The plan line: once, at the top. */}
      {limit != null ? (
        <div className={`wrp-plan${used > limit ? " wrp-plan--over" : ""}`}>
          <p>
            <strong>
              <T en={`You're using ${used} of ${limit} free rules`} bn={`ফ্রিতে ${limit}টি নিয়মের ${used}টি ব্যবহার করছেন`} />
            </strong>
            <T en=", price alerts included." bn=", প্রাইস অ্যালার্টসহ।" />
            {paused > 0 && (
              <T
                en={` ${paused} ${paused === 1 ? "rule is" : "rules are"} paused. Tap "Keep on" on the ones you want checked.`}
                bn={` ${paused}টি নিয়ম থেমে আছে। যেগুলো দেখতে চান সেগুলোতে "চালু রাখুন" চাপুন।`}
              />
            )}
          </p>
          <p>
            <T
              en="Premium keeps every rule on and tells you the same evening. Free rules show in Updates the next time you open the app."
              bn="প্রিমিয়ামে সব নিয়ম চালু থাকে, আর সেদিন সন্ধ্যায়ই জানায়। ফ্রি নিয়ম পরের বার অ্যাপ খুললে আপডেটে দেখা যায়।"
            />{" "}
            <Link
              href={`${PREMIUM_PATH}?src=watch-rules-page#pay`}
              className="font-semibold text-primary-ink hover:underline"
              onClick={() => trackEvent("premium_lock_tap", { area: "watch-rules", lock: "watch-rules-page" })}
            >
              <T en="See Premium" bn="প্রিমিয়াম দেখুন" />
            </Link>
          </p>
        </div>
      ) : tasteEnd ? (
        <div className="wrp-plan">
          <p>
            <strong>
              <T en={`No limit during your free week, until ${tasteEnd.en}.`} bn={`আপনার ফ্রি সপ্তাহে কোনো সীমা নেই, ${tasteEnd.bn} পর্যন্ত।`} />
            </strong>{" "}
            <T en="We tell you the same evening." bn="সেদিন সন্ধ্যায়ই জানাই।" />
          </p>
          <p>
            <T
              en={`After that, your first ${freeCap} rules stay on, price alerts included, and the rest pause. You can choose which ones then.`}
              bn={`এরপর প্রথম ${freeCap}টি নিয়ম চালু থাকবে, প্রাইস অ্যালার্টসহ, বাকিগুলো থেমে যাবে। তখন কোনগুলো চালু থাকবে বেছে নিতে পারবেন।`}
            />
          </p>
        </div>
      ) : null}

      {/* Shares being watched */}
      <section className="wrp-section" aria-labelledby="wrp-watched">
        <h2 id="wrp-watched" className="wrp-h">
          <T en="Shares you watch" bn="যেগুলোতে নজর রাখছেন" />
          {watched.length > 0 && <span className="wrp-n">{watched.length}</span>}
        </h2>
        {watched.length === 0 ? (
          <p className="wrp-empty">
            <T
              en="No rules yet. Pick a share below, or tap Watch this share on any share's page."
              bn="এখনো কোনো নিয়ম নেই। নিচ থেকে একটি শেয়ার বেছে নিন, বা যেকোনো শেয়ারের পেজে নজর রাখুন বোতামে চাপুন।"
            />
          </p>
        ) : (
          <ul className="wrp-card">
            {watched.map((code) => (
              <li key={code} className="wrp-share">
                <div className="wrp-share-top">
                  <Link href={`/stock/${code}`} className="wrp-name">
                    {nameOf(code)} <span className="wrp-code">{code}</span>
                  </Link>
                  {heldSet.has(code) && (
                    <span className="wrp-tag">
                      <T en="You own it" bn="আপনার আছে" />
                    </span>
                  )}
                </div>
                <ul className="wrp-chips">
                  {(byCode.get(code) ?? []).map((r) => {
                    const w = ruleLabel(r.kind, r.value);
                    return (
                      <li key={r.kind} className="wrp-chip" data-paused={r.paused || undefined} data-keep={r.keep || undefined}>
                        <span>
                          <T en={w.en} bn={w.bn} />
                          {r.paused && (
                            <span className="wrp-chip-note">
                              <T en=" · Paused" bn=" · থেমে আছে" />
                            </span>
                          )}
                        </span>
                        {canKeep && (
                          <button
                            type="button"
                            className="wrp-keep"
                            aria-pressed={!!r.keep}
                            disabled={busy === `${r.code}-${r.kind}`}
                            onClick={() => toggleKeep(r)}
                          >
                            {r.keep ? <T en="Kept on" bn="চালু রাখা" /> : <T en="Keep on" bn="চালু রাখুন" />}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <div className="wrp-acts">
                  <Button size="sm" variant="quiet" onClick={() => openWatchRules(code, nameOf(code))}>
                    <T en="Edit rules" bn="নিয়ম বদলান" />
                  </Button>
                  <Button size="sm" variant="link" disabled={busy === code} onClick={() => stop(code)}>
                    <T en="Stop watching" bn="নজর বন্ধ করুন" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Owned or followed, no rules yet */}
      {notYet.length > 0 && (
        <section className="wrp-section" aria-labelledby="wrp-notyet">
          <h2 id="wrp-notyet" className="wrp-h">
            <T en="Your shares with no rules yet" bn="যে শেয়ারে এখনো নিয়ম নেই" />
            <span className="wrp-n">{notYet.length}</span>
          </h2>
          <ul className="wrp-card">
            {(showAllNew ? notYet : notYet.slice(0, SHORT_LIST)).map((code) => (
              <li key={code} className="wrp-row">
                <span className="wrp-row-name">
                  {nameOf(code)} <span className="wrp-code">{code}</span>
                  <span className="wrp-row-why">
                    {heldSet.has(code) ? <T en="You own it" bn="আপনার আছে" /> : <T en="You follow it" bn="অনুসরণ করছেন" />}
                  </span>
                </span>
                <Button size="sm" variant="quiet" onClick={() => openWatchRules(code, nameOf(code))}>
                  <T en="Watch" bn="নজর রাখুন" />
                </Button>
              </li>
            ))}
          </ul>
          {notYet.length > SHORT_LIST && (
            <button type="button" className="wrp-more" onClick={() => setShowAllNew((v) => !v)}>
              {showAllNew ? (
                <T en="Show fewer" bn="কম দেখান" />
              ) : (
                <T en={`Show all ${notYet.length}`} bn={`সব ${notYet.length}টি দেখান`} />
              )}
            </button>
          )}
        </section>
      )}

      {/* Any other share */}
      <section className="wrp-section" aria-labelledby="wrp-add">
        <h2 id="wrp-add" className="wrp-h">
          <T en="Watch another share" bn="অন্য শেয়ারে নজর রাখুন" />
        </h2>
        <label htmlFor="wrp-search" className="sr-only">
          {bn ? "নাম বা কোড লিখুন" : "Type a name or code"}
        </label>
        <input
          id="wrp-search"
          type="search"
          className="input-field"
          placeholder={bn ? "নাম বা কোড লিখুন" : "Type a name or code"}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
        />
        {matches.length > 0 && (
          <ul className="wrp-card wrp-matches">
            {matches.map((i) => {
              const c = i.trading_code.toUpperCase();
              return (
                <li key={c} className="wrp-row">
                  <span className="wrp-row-name">
                    {companyShort(i.company_name) || c} <span className="wrp-code">{c}</span>
                  </span>
                  <Button
                    size="sm"
                    variant="quiet"
                    active={byCode.has(c)}
                    onClick={() => {
                      setQ("");
                      openWatchRules(c, companyShort(i.company_name) || c);
                    }}
                  >
                    {byCode.has(c) ? <T en="Edit" bn="বদলান" /> : <T en="Watch" bn="নজর রাখুন" />}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <details className="wrp-how">
        <summary>
          <T en="How watch rules work" bn="নজরের নিয়ম কীভাবে কাজ করে" />
        </summary>
        <ul>
          <li>
            <T
              en="We check every rule after DSE's official close, on the figures our analysis already uses."
              bn="ডিএসইর অফিশিয়াল ক্লোজের পর, আমাদের বিশ্লেষণের তথ্য দিয়েই প্রতিটি নিয়ম দেখি।"
            />
          </li>
          <li>
            <T
              en="When a rule fires, it shows in Updates as “Your rule”. With Premium you also get a notification the same evening."
              bn="নিয়ম কাজ করলে আপডেটে “আপনার নিয়ম” হিসেবে দেখায়। প্রিমিয়ামে সেদিন সন্ধ্যায় নোটিফিকেশনও পান।"
            />
          </li>
          <li>
            <T
              en={`A free account keeps ${freeCap} rules on, price alerts included. Past that, rules are kept but paused; "Keep on" chooses which stay on.`}
              bn={`ফ্রি অ্যাকাউন্টে ${freeCap}টি নিয়ম চালু থাকে, প্রাইস অ্যালার্টসহ। এর বেশি হলে নিয়মগুলো থাকে কিন্তু থেমে থাকে; "চালু রাখুন" দিয়ে কোনগুলো চালু থাকবে বেছে নিন।`}
            />
          </li>
        </ul>
      </details>
    </>
  );
}
