"use client";

import { useEffect, useState } from "react";
import Link from "@/components/ui/Link";
import type { Lang } from "@/context/LangContext";
import { useAuth } from "@/context/AuthContext";
import { IconCrown } from "@/components/ui/icons";
import { endsSoon } from "@/lib/renewal";
import { trackEvent } from "@/lib/track";

/**
 * The renew alert (2026-11-26, user decision; replaced the renewal banner on
 * every page and the renewal push). One line under the home page's greeting
 * for a Premium reader whose Premium ends within `RENEW_ALERT_DAYS` (7):
 * "Your Premium ends in 6 days. Renew now". No price, no list, no close
 * button. Never for admins. Client-only: it reads the clock and the account.
 */
export default function RenewAlert({ lang }: { lang: Lang }) {
  const bn = lang === "bn";
  const { user } = useAuth();
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    setDays(user && !user.is_admin ? endsSoon(user.premium_until) : null);
  }, [user]);

  useEffect(() => {
    if (days != null) trackEvent("premium_renew_alert_view", { days_left: days });
  }, [days]);

  if (days == null) return null;

  const text = bn
    ? days <= 0
      ? "আপনার প্রিমিয়াম আজ শেষ হচ্ছে।"
      : days === 1
        ? "আপনার প্রিমিয়াম কাল শেষ হবে।"
        : `আপনার প্রিমিয়াম ${days} দিন পর শেষ হবে।`
    : days <= 0
      ? "Your Premium ends today."
      : days === 1
        ? "Your Premium ends tomorrow."
        : `Your Premium ends in ${days} days.`;

  return (
    <p className={`hm-renew ${days <= 1 ? "hm-renew--last" : ""}`} role="status" data-card="renew-alert">
      <IconCrown size={16} />
      <span className="hm-renew-txt">{text}</span>
      <Link
        href="/premium?src=home-renew#pay"
        className="hm-renew-go"
        onClick={() => trackEvent("premium_renew_alert_tap", { days_left: days })}
      >
        {bn ? "এখনই রিনিউ করুন" : "Renew now"}
      </Link>
    </p>
  );
}
