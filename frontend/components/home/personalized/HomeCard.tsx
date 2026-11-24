"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import type { Lang } from "@/context/LangContext";
import { useAuth } from "@/context/AuthContext";
import { usePremium } from "@/lib/premium";
import type { PortfolioHolding, ScoreItem } from "@/lib/api";
import { portfolioGlance } from "@/lib/home-portfolio";
import {
  canShowPushPromptByHistory,
  dismissPushPromptForever,
  getPermission,
  isIOS,
  isPushSupported,
  isStandalone,
  snoozePushPrompt,
  subscribeToPush,
} from "@/lib/push";
import { toast } from "@/lib/toast";
import { trackEvent } from "@/lib/track";
import TasteNote from "@/components/premium/TasteNote";
import { IconAlert, IconBell, IconCrown, IconStar } from "@/components/ui/icons";

type Bi = { en: string; bn: string };
type Tone = "plain" | "gold" | "clay";

/** "Not now" on the Premium card: back in 7 days (the key the old Premium
 *  banner and the slot used, so a choice made there still holds). */
const premKey = (uid: string) => `dsex.premiumBanner.${uid}`;
const PREM_LATER_DAYS = 7;
const DAY_MS = 86_400_000;

/**
 * The home's ONE card (2026-11-25, step 2 of the simplify review; replaced
 * the swipe slot of up to ~20 kinds of slide). At most one, and only when
 * there is something to do, first match wins:
 *   1 a brand-new account: add the shares you own, or watch a few;
 *   2 notifications off on this phone (a reader with shares): turn them on
 *     (same gate and keys as the floating `PushOptInPrompt`);
 *   3 the 7-day taste is running: the taste note;
 *   4 a free reader: the portfolio check (user decision 2026-11-25: one
 *     Premium card stays) — with shares, what a glance finds; with only a
 *     watchlist, "get your portfolio checked". "Not now" hides it 7 days.
 * Premium readers usually see nothing. Install and renewal have their own
 * prompts (`InstallPrompt`, `RenewBanner`).
 */
export default function HomeCard({
  lang,
  brandNew,
  hasShares,
  holdings,
  priceMap,
}: {
  lang: Lang;
  brandNew: boolean;
  /** Owns or watches at least one share. */
  hasShares: boolean;
  /** The main portfolio: null while unknown, [] once we know there is none. */
  holdings: PortfolioHolding[] | null;
  priceMap: Map<string, ScoreItem>;
}) {
  const bn = lang === "bn";
  const pick = (b: Bi) => (bn ? b.bn : b.en);
  const { user, isLoggedIn } = useAuth();
  const { isPremium, taste } = usePremium();
  const uid = user?.user_id ?? "";

  // Storage and the browser's push state are read after mount.
  const [ready, setReady] = useState(false);
  const [premHidden, setPremHidden] = useState(true);
  const [pushMode, setPushMode] = useState<"prompt" | "ios" | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushFailed, setPushFailed] = useState(false);

  useEffect(() => {
    try {
      const raw = uid ? localStorage.getItem(premKey(uid)) : null;
      const until = raw ? (JSON.parse(raw) as { until?: number }).until ?? 0 : 0;
      setPremHidden(until > Date.now());
    } catch {
      setPremHidden(false);
    }
    if (canShowPushPromptByHistory()) {
      if (isPushSupported() && getPermission() === "default") setPushMode("prompt");
      else if (isIOS() && !isStandalone()) setPushMode("ios");
    }
    setReady(true);
  }, [uid]);

  const freeReader = isLoggedIn && !isPremium;
  const glance = useMemo(
    () => (freeReader && holdings && holdings.length > 0 ? portfolioGlance(holdings, priceMap) : null),
    [freeReader, holdings, priceMap],
  );

  // Which card, worked out before any return so its view is counted once.
  const kind: "start" | "push" | "taste" | "portfolio" | "portfolio-add" | null =
    !ready || holdings === null
      ? null
      : brandNew
        ? "start"
        : pushMode && hasShares
          ? "push"
          : taste?.active
            ? "taste"
            : freeReader && !premHidden
              ? glance
                ? "portfolio"
                : holdings.length === 0
                  ? "portfolio-add"
                  : null
              : null;
  useEffect(() => {
    if (kind === "portfolio") trackEvent("premium_lock_view", { area: "home", lock: "home-portfolio" });
    else if (kind === "portfolio-add") trackEvent("premium_lock_view", { area: "home", lock: "home-portfolio-add" });
    else if (kind === "push") trackEvent("push_slide_view", { mode: pushMode ?? "" });
    // Once per card shown.
  }, [kind]);

  if (!ready || holdings === null) return null;

  const frame = (id: string, tone: Tone, node: ReactNode) => (
    <section className={`hm-slot hm-one ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined} data-card="card">
      <div className="hm-track">
        <article data-slide={id} data-card={`slide-${id}`} className={`hm-slide hm-slide--${tone}`}>
          {node}
        </article>
      </div>
    </section>
  );
  const eyebrow = (icon: ReactNode, text: string) => (
    <p className="hm-sl-eye">
      {icon}
      {text}
    </p>
  );

  // 1 · Brand-new: the first step.
  if (brandNew) {
    return frame(
      "start",
      "clay",
      <>
        {eyebrow(<IconStar size={14} />, bn ? "প্রথম ধাপ" : "Your first step")}
        <h3 className="hm-sl-title">{bn ? "আপনার শেয়ার যোগ করুন, বা কয়েকটিতে নজর রাখুন" : "Add your shares, or watch a few"}</h3>
        <p className="hm-sl-body">
          {bn
            ? "প্রতিদিন বাজার বন্ধের পর আমরা সেগুলো দেখি, আর আর্থিক ফল, ডিভিডেন্ড বা সতর্কতা এলে এখানে জানাই।"
            : "We check them after every close and tell you here when results, a dividend or a warning comes."}
        </p>
        <div className="hm-sl-acts">
          <Button href="/portfolio">{bn ? "আমার শেয়ার যোগ করুন" : "Add the shares I own"}</Button>
          <Button href="/watchlist" variant="quiet">
            {bn ? "শেয়ারে নজর রাখুন" : "Watch a share"}
          </Button>
          <Button href={bn ? "/blog" : "/learn"} variant="link">
            {bn ? "শেয়ারে নতুন? ছোট গাইড পড়ুন" : "New to shares? Read a short guide"}
          </Button>
        </div>
      </>,
    );
  }

  // 2 · Notifications off on this phone.
  if (pushMode && hasShares) {
    const hidePush = () => {
      snoozePushPrompt();
      setPushMode(null);
    };
    const enablePush = async () => {
      setPushBusy(true);
      setPushFailed(false);
      const ok = await subscribeToPush();
      setPushBusy(false);
      trackEvent("push_slide_tap", { ok: ok ? 1 : 0 });
      if (ok) {
        dismissPushPromptForever();
        setPushMode(null);
        toast({ message: bn ? "নোটিফিকেশন চালু হয়েছে।" : "Notifications are on." });
      } else {
        setPushFailed(true);
      }
    };
    return frame(
      "push",
      "plain",
      pushMode === "ios" ? (
        <>
          {eyebrow(<IconBell size={14} />, bn ? "নোটিফিকেশন" : "Notifications")}
          <h3 className="hm-sl-title">{bn ? "আইফোনে নোটিফিকেশন পান" : "Get notifications on your iPhone"}</h3>
          <p className="hm-sl-body">
            {bn
              ? "Share, তারপর Add to Home Screen চাপুন। এরপর সেখান থেকে TopStockBD খুলে নোটিফিকেশন চালু করুন।"
              : "Tap Share, then Add to Home Screen, and open TopStockBD from there. Then you can turn them on."}
          </p>
          <div className="hm-sl-acts">
            <button type="button" className="hm-sl-link" onClick={hidePush}>
              {bn ? "বুঝেছি" : "Got it"}
            </button>
          </div>
        </>
      ) : (
        <>
          {eyebrow(<IconBell size={14} />, bn ? "এই ফোনে নোটিফিকেশন বন্ধ" : "Notifications are off on this phone")}
          <h3 className="hm-sl-title">{bn ? "আপনার শেয়ারের নোটিফিকেশন চালু করুন" : "Turn on notifications for your shares"}</h3>
          <p className="hm-sl-body">
            {bn
              ? "আপনার প্রাইস অ্যালার্ট, ডিভিডেন্ড আর শেয়ারে কী বদলাল, এই ফোনেই। চাইলে যেকোনো সময় বন্ধ করতে পারবেন।"
              : "Your price alerts, dividends and what changed on your shares, on this phone. You can turn them off any time."}
          </p>
          {pushFailed && (
            <p className="hm-sl-small text-negative">
              {bn
                ? "চালু করা যায়নি। ব্রাউজার আটকে দিলে এই সাইটের নোটিফিকেশন চালু করে আবার চেষ্টা করুন।"
                : "We couldn't turn them on. If your browser blocked them, allow notifications for this site and try again."}
            </p>
          )}
          <div className="hm-sl-acts">
            <Button onClick={enablePush} disabled={pushBusy}>
              {pushBusy ? (bn ? "চালু হচ্ছে…" : "Turning on…") : pushFailed ? (bn ? "আবার চেষ্টা করুন" : "Try again") : bn ? "চালু করুন" : "Turn on"}
            </Button>
            <button type="button" className="hm-sl-link" onClick={hidePush} disabled={pushBusy}>
              {bn ? "এখন না" : "Not now"}
            </button>
          </div>
        </>
      ),
    );
  }

  // 3 · The 7-day taste.
  if (taste?.active) return <TasteNote taste={taste} lang={lang} />;

  // 4 · One Premium card: the portfolio check.
  if (!freeReader || premHidden) return null;
  const later = () => {
    try {
      localStorage.setItem(premKey(uid), JSON.stringify({ until: Date.now() + PREM_LATER_DAYS * DAY_MS, how: "later" }));
    } catch {}
    setPremHidden(true);
    trackEvent("premium_lock_dismiss", { area: "home", lock: "home-portfolio" });
  };
  const pfEyebrow = eyebrow(<IconCrown size={14} />, bn ? "প্রিমিয়াম · আপনার পোর্টফোলিও যাচাই" : "Premium · your portfolio check");
  if (glance) {
    const n = glance.findings.length;
    const shares = glance.shares;
    return frame(
      "portfolio",
      "gold",
      <>
        {pfEyebrow}
        <h3 className="hm-sl-title">
          {bn
            ? `আপনার ${shares}টি শেয়ার যাচাই করেছি: গ্রেড ${glance.grade}`
            : `We checked your ${shares} ${shares === 1 ? "share" : "shares"}: grade ${glance.grade}`}
        </h3>
        {n > 0 ? (
          <ul className="hm-sl-list">
            {glance.findings.map((f) => (
              <li key={f.en}>
                <IconAlert size={16} />
                <span>{pick(f)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="hm-sl-body">
            {bn
              ? "এক নজরে চোখে পড়ার মতো কিছু নেই। পুরো যাচাই প্রতিটি শেয়ার দেখে বলে কোনটা রাখবেন, কোনটা ঠিক করবেন।"
              : "Nothing stands out at a glance. The full check goes through every share and tells you what to keep and what to fix."}
          </p>
        )}
        <p className="hm-sl-small">
          {bn ? "কোন শেয়ার, কেন, আর প্রতিটির বেলায় কী করবেন, প্রিমিয়াম দেখায়।" : "Premium shows you which shares, why, and what to do about each."}
        </p>
        <div className="hm-sl-acts">
          <Button
            href="/portfolio?src=home-portfolio#pf-premium"
            onClick={() => trackEvent("premium_lock_tap", { area: "home", lock: "home-portfolio", findings: n })}
          >
            {bn ? "পুরো যাচাই দেখুন" : "See my full check"}
          </Button>
          <button type="button" className="hm-sl-link" onClick={later}>
            {bn ? "এখন না" : "Not now"}
          </button>
        </div>
      </>,
    );
  }
  if (holdings.length === 0) {
    return frame(
      "portfolio",
      "gold",
      <>
        {pfEyebrow}
        <h3 className="hm-sl-title">{bn ? "প্রতিদিন আপনার পোর্টফোলিও যাচাই করান" : "Get your portfolio checked every day"}</h3>
        <p className="hm-sl-body">
          {bn
            ? "আপনার শেয়ারগুলো যোগ করুন। পোর্টফোলিওর গ্রেড ফ্রি, আর কোন শেয়ার রাখবেন, ঠিক করবেন বা বদলাবেন, প্রিমিয়াম বলে।"
            : "Add the shares you own. The grade is free, and Premium tells you which shares to keep, fix or switch."}
        </p>
        <div className="hm-sl-acts">
          <Button
            href="/portfolio?src=home-portfolio"
            onClick={() => trackEvent("premium_lock_tap", { area: "home", lock: "home-portfolio-add" })}
          >
            {bn ? "আপনার শেয়ার যোগ করুন" : "Add your shares"}
          </Button>
          <button type="button" className="hm-sl-link" onClick={later}>
            {bn ? "এখন না" : "Not now"}
          </button>
        </div>
      </>,
    );
  }
  return null;
}
