"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { T } from "@/components/i18n/T";
import Button from "@/components/ui/Button";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import { openGlobalSearch } from "@/components/layout/GlobalSearch";
import { IconSearch } from "@/components/ui/icons";
import type { AuthApiResponse } from "@/lib/api";
import { looksNewlyCreated, markJustSignedUp } from "@/lib/welcome";
import { loadWatchlist } from "@/lib/watchlist";
import { trackEvent } from "@/lib/track";

/** The band's ask: a free account, or Google. Signing in swaps the page for
 *  the reader's own home (HomePersonalizationGate), in the same layout. */
export function GuestAsk() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState("");

  async function onGoogle(data: AuthApiResponse) {
    login(data.access_token, data.user);
    if (looksNewlyCreated(data.user)) markJustSignedUp();
    await loadWatchlist().catch(() => {});
    router.refresh();
  }

  return (
    <div className="hm-g-ask" data-card="guest-ask">
      <div className="hm-g-ask-row">
        <Button href="/register" variant="primary" size="lg">
          <T en="Create free account" bn="ফ্রি অ্যাকাউন্ট খুলুন" />
          <span aria-hidden>→</span>
        </Button>
        <div className="[color-scheme:light]">
          <GoogleSignInButton onSuccess={onGoogle} onError={setError} />
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
      <p className="hm-g-small">
        <T en="Free. No card. About 30 seconds." bn="ফ্রি। কার্ড লাগবে না। লাগে প্রায় 30 সেকেন্ড।" />
      </p>
    </div>
  );
}

/** The band's search field: opens the site's search, no account needed. */
export function GuestSearch() {
  return (
    <button
      type="button"
      className="hm-search"
      onClick={() => {
        trackEvent("home_search_open", { guest: 1 });
        openGlobalSearch();
      }}
    >
      <IconSearch size={18} />
      <span>
        <T en="Look up any DSE share, no account needed" bn="যেকোনো ডিএসই শেয়ার খুঁজুন, অ্যাকাউন্ট ছাড়াই" />
      </span>
    </button>
  );
}
