"use client";

import { useEffect, useState, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import type { Lang } from "@/context/LangContext";
import type { PortfolioHolding } from "@/lib/api";
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
import { IconBell, IconStar } from "@/components/ui/icons";

type Tone = "plain" | "gold" | "clay";

/**
 * The home's ONE card (2026-11-25, step 2 of the simplify review; replaced
 * the swipe slot of up to ~20 kinds of slide). At most one, and only when
 * there is something to do, first match wins:
 *   1 a brand-new account: add the shares you own, or watch a few;
 *   2 notifications off on this phone (a reader with shares): turn them on
 *     (same gate and keys as the floating `PushOptInPrompt`).
 * The 7-day taste note ("Premium is open on your shares for 4 more days")
 * left 2026-11-26 (user decision); the taste itself still runs.
 * The free reader's portfolio-check card left 2026-11-26 (user decision): the
 * home page's one Premium card is `PremiumPromoCard`, after the market line.
 * Install and renewal have their own prompts (`InstallPrompt`, `RenewAlert`
 * under the greeting).
 */
export default function HomeCard({
  lang,
  brandNew,
  hasShares,
  holdings,
}: {
  lang: Lang;
  brandNew: boolean;
  /** Owns or watches at least one share. */
  hasShares: boolean;
  /** The main portfolio: null while unknown, [] once we know there is none. */
  holdings: PortfolioHolding[] | null;
}) {
  const bn = lang === "bn";

  // Storage and the browser's push state are read after mount.
  const [ready, setReady] = useState(false);
  const [pushMode, setPushMode] = useState<"prompt" | "ios" | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushFailed, setPushFailed] = useState(false);

  useEffect(() => {
    if (canShowPushPromptByHistory()) {
      if (isPushSupported() && getPermission() === "default") setPushMode("prompt");
      else if (isIOS() && !isStandalone()) setPushMode("ios");
    }
    setReady(true);
  }, []);

  // Which card, worked out before any return so its view is counted once.
  const kind: "start" | "push" | null =
    !ready || holdings === null ? null : brandNew ? "start" : pushMode && hasShares ? "push" : null;
  useEffect(() => {
    if (kind === "push") trackEvent("push_slide_view", { mode: pushMode ?? "" });
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
          <Button href="/my" variant="quiet">
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

  return null;
}
