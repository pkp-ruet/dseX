"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { T } from "@/components/i18n/T";
import { IconCrown } from "@/components/ui/icons";
import { useAuth } from "@/context/AuthContext";
import { apiDismissOffer, getPremiumPlans } from "@/lib/api";
import { AUTH_USER_UPDATED_EVENT, setStoredUser } from "@/lib/auth";
import { usePremium } from "@/lib/premium";
import { OWN_OFFER_PLAN } from "@/lib/premium-plans";
import { trackEvent } from "@/lib/track";

// A guest's "Not interested" / "Remind me later" (a signed-in reader's live
// on their account, backend `payments.dismiss_offer`).
const GUEST_KEY = "dsex.offer.banner";
const REMIND_MS = 3 * 24 * 60 * 60 * 1000; // backend OFFER_REMIND_DAYS

function guestHidden(): boolean {
  try {
    const raw = window.localStorage.getItem(GUEST_KEY);
    if (!raw) return false;
    const v = JSON.parse(raw) as { never?: boolean; until?: number };
    return !!v.never || (typeof v.until === "number" && v.until > Date.now());
  } catch {
    return false;
  }
}

function guestDismiss(action: "never" | "later"): void {
  try {
    window.localStorage.setItem(
      GUEST_KEY,
      JSON.stringify(action === "never" ? { never: true } : { until: Date.now() + REMIND_MS }),
    );
  } catch {}
}

/**
 * The reader's own offer (2026-10-29) on top of the homepage: one month of
 * Premium for ৳99 instead of ৳199, for a very limited time. Three answers:
 * pay (→ the pay box with the offer picked; a guest opens a free account
 * first), "Remind me later" (hidden for 3 days) or "Not interested" (hidden
 * for good; the offer stays in the pay box). Signed-in readers see it while
 * the backend's `user.offer.banner` says so; guests while the plans endpoint
 * says the offer is open. An admin ends it from /admin/payments.
 * Renders nothing on the server, so the landing HTML Google sees is unchanged.
 */
export default function OfferBanner() {
  const { user, isLoggedIn, isLoading } = useAuth();
  const { isPremium } = usePremium();
  const [mounted, setMounted] = useState(false);
  const [closed, setClosed] = useState(false);
  const [guestOff, setGuestOff] = useState(true);
  // Guests: is the offer running? (signed-in readers get it on `user.offer`)
  const [guestOpen, setGuestOpen] = useState(false);
  const seen = useRef(false);

  useEffect(() => {
    setMounted(true);
    setGuestOff(guestHidden());
  }, []);

  useEffect(() => {
    if (isLoading || isLoggedIn || guestOff) return;
    let live = true;
    getPremiumPlans()
      .then((r) => live && setGuestOpen(!!r.own_offer))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [isLoading, isLoggedIn, guestOff]);

  const offer = isLoggedIn ? (!isPremium ? user?.offer ?? null : null) : null;
  const show =
    mounted &&
    !isLoading &&
    !closed &&
    (isLoggedIn ? !!offer?.banner : !guestOff && guestOpen);

  useEffect(() => {
    if (show && !seen.current) {
      seen.current = true;
      trackEvent("offer_banner_view", { who: isLoggedIn ? "free" : "guest" });
    }
  }, [show, isLoggedIn]);

  if (!show) return null;

  const amount = offer?.amount ?? OWN_OFFER_PLAN.amount;
  const was = offer?.list_amount ?? OWN_OFFER_PLAN.listAmount ?? 199;

  const dismiss = (action: "never" | "later") => {
    setClosed(true);
    trackEvent("offer_banner_tap", { action, who: isLoggedIn ? "free" : "guest" });
    if (!isLoggedIn) {
      guestDismiss(action);
      return;
    }
    apiDismissOffer(action)
      .then(({ user: fresh }) => {
        setStoredUser(fresh);
        window.dispatchEvent(new CustomEvent(AUTH_USER_UPDATED_EVENT));
      })
      .catch(() => {});
  };

  return (
    <section className="offer-banner" aria-labelledby="offer-banner-h">
      <p className="offer-banner-tag">
        <IconCrown size={14} />
        <T en="Your own offer · for a very limited time" bn="শুধু আপনার জন্য অফার · খুব অল্প সময়ের জন্য" />
      </p>
      <h2 id="offer-banner-h" className="mt-2 text-xl font-bold text-text-main sm:text-2xl">
        <T en="Premium for one month at " bn="এক মাসের প্রিমিয়াম " />
        <span className="whitespace-nowrap tabular-nums">
          ৳{amount}
          <s className="offer-banner-was">
            <span className="sr-only">
              <T en="Regular price " bn="আগের দাম " />
            </span>
            ৳{was}
          </s>
        </span>
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-text-main sm:text-base">
        <T
          en={`See why each share gets its grade, find whole lists of shares worth a look, and have your shares checked every day. Nothing renews by itself.`}
          bn={`প্রতিটি শেয়ার কেন এই গ্রেড পেল তা দেখুন, দেখার মতো শেয়ারের পুরো তালিকা পান, আর প্রতিদিন আপনার শেয়ারগুলো যাচাই করিয়ে নিন। নিজে থেকে আবার টাকা কাটা হয় না।`}
        />
      </p>
      <div className="offer-banner-actions">
        <Button
          href={isLoggedIn ? "/premium?plan=offer&src=offer-banner#pay" : "/register"}
          size="lg"
          onClick={() => trackEvent("offer_banner_tap", { action: "pay", who: isLoggedIn ? "free" : "guest" })}
        >
          {isLoggedIn ? (
            <T en={`Pay ৳${amount} and start`} bn={`৳${amount} দিয়ে শুরু করুন`} />
          ) : (
            <T en={`Sign up free to get it for ৳${amount}`} bn={`ফ্রি অ্যাকাউন্ট খুলে ৳${amount}-এ নিন`} />
          )}
        </Button>
        <Button variant="quiet" size="lg" onClick={() => dismiss("later")}>
          <T en="Remind me later" bn="পরে মনে করিয়ে দিন" />
        </Button>
        <Button variant="link" onClick={() => dismiss("never")}>
          <T en="Not interested in Premium" bn="প্রিমিয়ামে আগ্রহ নেই" />
        </Button>
      </div>
    </section>
  );
}
