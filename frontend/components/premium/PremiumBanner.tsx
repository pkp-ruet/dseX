"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import Link from "@/components/ui/Link";
import { T } from "@/components/i18n/T";
import { IconCheck, IconCrown } from "@/components/ui/icons";
import { useAuth } from "@/context/AuthContext";
import { apiPremiumBannerEvent, type PremiumBannerAction } from "@/lib/api";
import { usePremium } from "@/lib/premium";
import { PAID_PLANS } from "@/lib/premium-plans";
import { toast } from "@/lib/toast";
import { trackEvent } from "@/lib/track";

const YEAR = PAID_PLANS.find((p) => p.key === "yearly")!;

/** "Maybe later" hides it for a week, "Not interested in Premium" for two months. */
const LATER_DAYS = 7;
const NEVER_DAYS = 60;
const DAY_MS = 86_400_000;

const storeKey = (uid: string) => `dsex.premiumBanner.${uid}`;

function hiddenUntil(uid: string): number {
  try {
    const raw = localStorage.getItem(storeKey(uid));
    if (!raw) return 0;
    const v = JSON.parse(raw) as { until?: number };
    return typeof v.until === "number" ? v.until : 0;
  } catch {
    return 0;
  }
}

type Point = { t: { en: string; bn: string }; d: { en: string; bn: string } };

// What Premium gives, in the order a reader cares about it. Limits are worded
// "as many as you want" (the watchlist cap note's words): Premium still has
// hard caps (200 shares followed, 50 alerts), so never say "unlimited".
const POINTS: Point[] = [
  {
    t: { en: "Full analysis of every share.", bn: "প্রতিটি শেয়ারের পুরো বিশ্লেষণ" },
    d: { en: "Is the company strong, and is the price right?", bn: "কোম্পানি কতটা শক্তিশালী, দাম ঠিক আছে কি না।" },
  },
  {
    t: { en: "Follow as many shares as you want.", bn: "যত খুশি শেয়ার ফলো করুন" },
    d: { en: "No limit of 5.", bn: "5টির সীমা থাকে না।" },
  },
  {
    t: { en: "Today's Buy List.", bn: "আজকের কেনার তালিকা" },
    d: { en: "The few shares we would buy today, and why.", bn: "আজ আমরা যে কয়টি শেয়ার কিনতাম, আর কেন।" },
  },
  {
    t: { en: "As many price alerts as you need.", bn: "যত দরকার প্রাইস অ্যালার্ট" },
    d: { en: "No limit of 3.", bn: "3টির সীমা থাকে না।" },
  },
  {
    t: { en: "Your portfolio check.", bn: "আপনার পোর্টফোলিও চেক" },
    d: { en: "What is working and what to do first.", bn: "কী ভালো চলছে, আর আগে কী করবেন।" },
  },
  {
    t: { en: "The full dividend calendar.", bn: "পুরো ডিভিডেন্ড ক্যালেন্ডার" },
    d: {
      en: "Who pays next, and a reminder before the last day to buy.",
      bn: "কে আগে ডিভিডেন্ড দেবে, আর কেনার শেষ দিনের আগে রিমাইন্ডার।",
    },
  },
  {
    t: { en: "Same-day news on your shares.", bn: "আপনার শেয়ারের খবর সেদিনই" },
    d: { en: "Results, dividends and warnings, and a 9 AM brief.", bn: "ফল, ডিভিডেন্ড ও সতর্কতা, আর সকাল 9টার ব্রিফ।" },
  },
  {
    t: { en: "Premium research.", bn: "প্রিমিয়াম গবেষণা রিপোর্ট" },
    d: { en: "Six reports, from auditor warnings to reliable dividends.", bn: "অডিটরের সতর্কতা থেকে নির্ভরযোগ্য ডিভিডেন্ড, ছয়টি রিপোর্ট।" },
  },
];

/**
 * The Premium banner for free readers (2026-11-13), on top of the signed-in
 * homepage only. It sells what Premium does (eight points), not the price; the
 * yearly plan is the one it offers, said in one small line. "Maybe later"
 * hides it for 7 days, "Not interested in Premium" for 60 (localStorage, per
 * account). Every view and tap goes to GA and to our own count
 * (`POST /api/user/premium/banner` → the admin analytics page). Never with the reader's own ৳99 offer: when that banner is up, or
 * was up earlier in this visit, this one waits. Renders nothing on the server.
 */
export default function PremiumBanner() {
  const { user, isLoggedIn, isLoading } = useAuth();
  const { isPremium } = usePremium();
  const [mounted, setMounted] = useState(false);
  const [hidden, setHidden] = useState(true);
  const offerSeen = useRef(false);
  const seen = useRef(false);

  const uid = user?.user_id ?? "";
  if (user?.offer?.banner) offerSeen.current = true;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!uid) return;
    setHidden(hiddenUntil(uid) > Date.now());
  }, [uid]);

  const show =
    mounted && !isLoading && isLoggedIn && !!uid && !isPremium && !user?.is_admin && !offerSeen.current && !hidden;

  useEffect(() => {
    if (show && !seen.current) {
      seen.current = true;
      trackEvent("premium_banner_view", { where: "home" });
      apiPremiumBannerEvent("view");
    }
  }, [show]);

  if (!show) return null;

  const tap = (action: Exclude<PremiumBannerAction, "view">) => {
    trackEvent("premium_banner_tap", { action, where: "home" });
    apiPremiumBannerEvent(action);
  };

  const tk = (n: number) => `৳${n.toLocaleString("en-IN")}`;
  const perMonth = Math.round(YEAR.amount / 12);

  const close = (how: "later" | "never") => {
    tap(how);
    const days = how === "never" ? NEVER_DAYS : LATER_DAYS;
    try {
      localStorage.setItem(storeKey(uid), JSON.stringify({ until: Date.now() + days * DAY_MS, how }));
    } catch {}
    setHidden(true);
    if (how === "never") {
      toast({
        message: (
          <T
            en="Okay. We won't show this for the next two months."
            bn="ঠিক আছে। আগামী দুই মাস এটি আর দেখাব না।"
          />
        ),
      });
    }
  };

  return (
    <section className="prb" aria-labelledby="prb-title" data-card="premium-banner">
      <div className="prb-body">
        <div className="prb-main">
          <p className="prb-eyebrow">
            <span className="prb-crown" aria-hidden>
              <IconCrown size={15} />
            </span>
            <T en="TopStockBD Premium" bn="TopStockBD প্রিমিয়াম" />
          </p>
          <h2 id="prb-title" className="prb-title">
            <T en="Know which shares to buy, and which to keep." bn="কোন শেয়ার কিনবেন, কোনটা রাখবেন, জেনে নিন।" />
          </h2>
          <p className="prb-lead">
            <T en="With Premium you get:" bn="প্রিমিয়ামে যা পাবেন:" />
          </p>
          <ul className="prb-list">
            {POINTS.map((p) => (
              <li key={p.t.en} className="prb-item">
                <span className="prb-tick" aria-hidden>
                  <IconCheck size={12} />
                </span>
                <span>
                  <span className="prb-item-t">
                    <T en={p.t.en} bn={p.t.bn} />
                  </span>
                  <span className="prb-item-d">
                    {" "}
                    <T en={p.d.en} bn={p.d.bn} />
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="prb-pay">
          <p className="prb-pay-head">
            <T en="Premium for a whole year" bn="পুরো এক বছরের প্রিমিয়াম" />
          </p>
          <p className="prb-pay-sub">
            <T en="Everything on the left, for 12 months." bn="বাঁ পাশের সবকিছু, 12 মাস ধরে।" />
          </p>
          <Button
            href="/premium?plan=yearly&src=home-banner#pay"
            size="lg"
            block
            onClick={() => tap("pay")}
          >
            <T en="Get Premium" bn="প্রিমিয়াম নিন" />
          </Button>
          <p className="prb-price">
            <T
              en={`One year for ${tk(YEAR.amount)}, about ${tk(perMonth)} a month.`}
              bn={`এক বছর ${tk(YEAR.amount)}, মাসে প্রায় ${tk(perMonth)}।`}
            />{" "}
            <T en="bKash, Nagad or bank. Nothing renews by itself." bn="বিকাশ, নগদ বা ব্যাংক। নিজে থেকে নবায়ন হয় না।" />
          </p>
          <Link
            href="/premium?src=home-banner"
            className="prb-more"
            onClick={() => tap("more")}
          >
            <T en="See everything in Premium" bn="প্রিমিয়ামে কী কী আছে দেখুন" />
          </Link>
        </div>
      </div>

      <div className="prb-close">
        <button type="button" className="prb-close-btn prb-close-btn--later" onClick={() => close("later")}>
          <T en="Maybe later" bn="পরে দেখব" />
        </button>
        <button type="button" className="prb-close-btn" onClick={() => close("never")}>
          <span className="prb-close-long">
            <T en="Not interested in Premium" bn="প্রিমিয়াম চাই না" />
          </span>
          <span className="prb-close-short">
            <T en="Not interested" bn="প্রিমিয়াম চাই না" />
          </span>
        </button>
      </div>
    </section>
  );
}
