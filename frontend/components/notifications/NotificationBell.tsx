"use client";

import { useEffect, useState } from "react";
import Link from "@/components/ui/Link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { apiGetUnreadNotifications } from "@/lib/api";
import { IconBell } from "@/components/ui/icons";

/** Fired by the notifications page once it has marked everything read. */
export const NOTIFICATIONS_SEEN_EVENT = "dsex:notifications-seen";

// One count for the whole tab, refreshed at most every two minutes as the
// reader moves between pages (the backend caches it for the same time).
const STALE_MS = 120_000;
let cache: { at: number; n: number } | null = null;

/**
 * The navbar bell (2026-11-06): opens `/notifications`, with the number of
 * things that came since the reader last opened it. Signed-in readers only.
 * `variant="desktop"` is a navbar-row ghost button, `"mobile"` the 40px
 * square beside search.
 */
export default function NotificationBell({ variant }: { variant: "desktop" | "mobile" }) {
  const { isLoggedIn } = useAuth();
  const { bn } = useLang();
  const pathname = usePathname();
  const [n, setN] = useState(cache?.n ?? 0);
  const here = pathname === "/notifications";

  useEffect(() => {
    if (!isLoggedIn) {
      cache = null;
      setN(0);
      return;
    }
    if (here) {
      cache = { at: Date.now(), n: 0 };
      setN(0);
      return;
    }
    if (cache && Date.now() - cache.at < STALE_MS) {
      setN(cache.n);
      return;
    }
    let live = true;
    apiGetUnreadNotifications()
      .then((r) => {
        cache = { at: Date.now(), n: r.unread };
        if (live) setN(r.unread);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [isLoggedIn, pathname, here]);

  useEffect(() => {
    const clear = () => {
      cache = { at: Date.now(), n: 0 };
      setN(0);
    };
    window.addEventListener(NOTIFICATIONS_SEEN_EVENT, clear);
    return () => window.removeEventListener(NOTIFICATIONS_SEEN_EVENT, clear);
  }, []);

  if (!isLoggedIn) return null;

  const label = bn
    ? n > 0
      ? `নোটিফিকেশন, ${n}টি নতুন`
      : "নোটিফিকেশন"
    : n > 0
      ? `Notifications, ${n} new`
      : "Notifications";
  const badge = n > 0 ? <span className="nt-badge" aria-hidden="true">{n > 9 ? "9+" : n}</span> : null;

  if (variant === "mobile") {
    return (
      <Link
        href="/notifications"
        className="navbar-search-mobile-btn nt-bell"
        aria-label={label}
        aria-current={here ? "page" : undefined}
      >
        <span className="navbar-link-icon">
          <IconBell size={18} />
          {badge}
        </span>
      </Link>
    );
  }
  return (
    <Link
      href="/notifications"
      className="navbar-link nt-bell"
      aria-label={label}
      title={label}
      aria-current={here ? "page" : undefined}
    >
      <span className="navbar-link-icon">
        <IconBell size={16} />
        {badge}
      </span>
    </Link>
  );
}
