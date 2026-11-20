"use client";

import { useEffect, useState } from "react";
import PlaceDoors, { type DoorFigure } from "@/components/places/PlaceDoors";
import Button from "@/components/ui/Button";
import { T } from "@/components/i18n/T";
import { useAuth } from "@/context/AuthContext";
import { apiGetUnreadNotifications } from "@/lib/api";
import { loadMainHoldings } from "@/lib/main-holdings";
import { getCachedWatchlist, loadWatchlist, subscribeWatchlist } from "@/lib/watchlist";
import { limitFor } from "@/lib/premium";
import { authHref } from "@/lib/next-path";
import { placeByKey } from "@/lib/places";

/**
 * My shares (2026-11-20, the app map): the place page the bottom bar's
 * My shares tab opens. One line on what the reader has, then the four pages
 * with their numbers: shares in the portfolio, shares followed (against the
 * free cap), new updates. Money is not repeated here: it is one tap away in
 * Portfolio. Signed out, the same doors and one sign-up line.
 */
export default function MyPlace() {
  const { user, isLoggedIn } = useAuth();
  const place = placeByKey("mine");
  const [held, setHeld] = useState<number | null>(null);
  const [followed, setFollowed] = useState<number | null>(null);
  const [unread, setUnread] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;
    let live = true;
    loadMainHoldings()
      .then((h) => live && setHeld(new Set(h.map((x) => x.trading_code.toUpperCase())).size))
      .catch(() => {});
    apiGetUnreadNotifications()
      .then((r) => live && setUnread(r.unread))
      .catch(() => {});
    const update = () => live && setFollowed(getCachedWatchlist().length);
    loadWatchlist().then(update).catch(() => {});
    const unsub = subscribeWatchlist(update);
    return () => {
      live = false;
      unsub();
    };
  }, [isLoggedIn]);

  const cap = limitFor(user, "watchlist");
  const figures: Record<string, DoorFigure | null> = {
    portfolio: held != null ? { value: held, unit: { en: "shares", bn: "শেয়ার" } } : null,
    watchlist:
      followed != null
        ? {
            value: cap != null ? `${followed} / ${cap}` : followed,
            unit: { en: "followed", bn: "অনুসরণ করছেন" },
          }
        : null,
    updates: unread != null ? { value: unread, unit: { en: "new", bn: "নতুন" }, tone: unread > 0 ? "up" : undefined } : null,
  };

  return (
    <>
      {isLoggedIn ? (
        held != null && followed != null ? (
          <p className="pl-line">
            <T
              en={<><strong>{held} shares in your portfolio, {followed} followed.</strong>{unread ? ` ${unread} new updates since you last looked.` : ""}</>}
              bn={<><strong>পোর্টফোলিওতে {held}টি শেয়ার, অনুসরণ করছেন {followed}টি।</strong>{unread ? ` শেষবার দেখার পর ${unread}টি নতুন আপডেট।` : ""}</>}
            />
          </p>
        ) : null
      ) : (
        <p className="pl-line">
          <T
            en="Sign up free to keep your portfolio, follow shares and get updates on them."
            bn="বিনামূল্যে অ্যাকাউন্ট খুলে পোর্টফোলিও রাখুন, শেয়ার অনুসরণ করুন আর সেগুলোর আপডেট পান।"
          />
        </p>
      )}
      <PlaceDoors place={place} figures={isLoggedIn ? figures : {}} />
      {!isLoggedIn && (
        <div className="pl-note">
          <Button href={authHref("/register", "/my")} variant="primary" size="lg">
            <T en="Sign up free" bn="বিনামূল্যে অ্যাকাউন্ট খুলুন" />
          </Button>
          <Button href={authHref("/login", "/my")} variant="quiet" size="lg">
            <T en="Sign in" bn="সাইন ইন" />
          </Button>
        </div>
      )}
    </>
  );
}
