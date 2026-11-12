"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Button from "@/components/ui/Button";
import { T } from "@/components/i18n/T";
import { IconChevronDown, IconClose, IconCrown } from "@/components/ui/icons";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { apiGetRenewal, type RenewalState } from "@/lib/api";
import { FREE_LIMITS } from "@/lib/premium";
import { PAID_PLANS } from "@/lib/premium-plans";
import {
  ALWAYS_LOST,
  dayWords,
  daysToEnd,
  dhakaDay,
  extendedUntil,
  inRenewWindow,
  laterKey,
  neverKey,
  personalLosses,
  renewStage,
  shortDayWords,
} from "@/lib/renewal";
import { trackEvent } from "@/lib/track";

const YEAR = PAID_PLANS.find((p) => p.key === "yearly")!;

// One fetch per reader and end date for the whole visit (the layout stays
// mounted across page changes; a renewal moves the end date and starts over).
const cache = new Map<string, Promise<RenewalState | null | "error">>();
function loadRenewal(key: string) {
  let p = cache.get(key);
  if (!p) {
    p = apiGetRenewal()
      .then((r) => r.renewal)
      .catch(() => "error" as const);
    cache.set(key, p);
  }
  return p;
}

/**
 * The Premium renewal banner (2026-11-13), on top of every page while a
 * reader's Premium ends within 10 days. Plans never renew by themselves, so it
 * says when Premium ends, what they would lose (their own set-up first:
 * extra portfolios, followed shares over the free 5, saved screens, dividend
 * reminders, price alerts over 3; then what every reader loses) and always
 * offers the yearly plan with the date it would run to: a new plan's days
 * start after the days still left (`payments.extend_until`), so paying early
 * loses nothing. 10 to 4 days: calm gold; last 3 days: amber. The ✕ opens two
 * choices: "Remind me later" (back the next day) and "Don't show again" (gone
 * until this end date; a renewal starts fresh). Hidden for admins, on
 * /premium, and while a payment is waiting (the backend says so). Client-only.
 */
export default function RenewBanner() {
  const { user, isLoggedIn, isLoading } = useAuth();
  const pathname = usePathname();
  const { bn } = useLang();
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<RenewalState | null | "error" | undefined>(undefined);
  const [later, setLater] = useState(false);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const seen = useRef("");

  useEffect(() => setMounted(true), []);

  const until = user?.premium_until ?? null;
  const eligible = mounted && !isLoading && isLoggedIn && !!user && !user.is_admin && inRenewWindow(until);
  const uid = user?.user_id ?? "";
  const days = eligible && until ? daysToEnd(until) : 99;
  const stage = renewStage(days);

  useEffect(() => {
    if (!eligible || !until) return;
    try {
      setLater(
        !!localStorage.getItem(neverKey(uid, until)) ||
          localStorage.getItem(laterKey(uid, until)) === dhakaDay(Date.now()),
      );
    } catch {
      setLater(false);
    }
    let live = true;
    loadRenewal(`${uid}|${until}`).then((r) => {
      if (live) setState(r);
    });
    return () => {
      live = false;
    };
  }, [eligible, uid, until]);

  // The close menu shuts on a tap outside it or Escape.
  useEffect(() => {
    if (!menu) return;
    const out = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(false);
    };
    document.addEventListener("pointerdown", out);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", out);
      document.removeEventListener("keydown", esc);
    };
  }, [menu]);

  // The backend says no (a payment is waiting, or the date moved): no banner.
  const show = eligible && !!until && state !== undefined && state !== null && !later && !pathname?.startsWith("/premium");

  useEffect(() => {
    if (!show || seen.current === `${uid}|${until}`) return;
    seen.current = `${uid}|${until}`;
    trackEvent("premium_renew_banner_view", {
      days_left: days,
      stage,
      source: user?.premium_source ?? "none",
      found: state && state !== "error" ? state.found?.total ?? 0 : 0,
    });
  }, [show, uid, until, days, stage, user?.premium_source, state]);

  if (!show || !until) return null;

  const live = state === "error" ? null : state;
  const amount = live?.plan.amount ?? YEAR.amount;
  const was = live?.plan.list_amount ?? YEAR.listAmount ?? null;
  const yearEnd = dayWords(dhakaDay(live?.plan.until ?? extendedUntil(until, YEAR.days)));
  const ends = shortDayWords(dhakaDay(until));
  const perMonth = Math.round(amount / 12);
  const mine = personalLosses(live?.have, live?.free ?? { watchlist: FREE_LIMITS.watchlist, alerts: FREE_LIMITS.alerts });
  const always = ALWAYS_LOST.slice(0, Math.max(2, 5 - mine.length));
  const tk = (n: number) => `৳${n.toLocaleString("en-IN")}`;

  const title =
    days <= 0
      ? { en: "Your Premium ends today", bn: "আপনার প্রিমিয়াম আজ শেষ হচ্ছে" }
      : days === 1
        ? { en: `Your Premium ends tomorrow, ${ends.en}`, bn: `আপনার প্রিমিয়াম কাল শেষ হবে, ${ends.bn}` }
        : {
            en: `Your Premium ends in ${days} days, on ${ends.en}`,
            bn: `আপনার প্রিমিয়াম শেষ হবে ${days} দিন পর, ${ends.bn}`,
          };

  const tap = (action: string) => trackEvent("premium_renew_banner_tap", { action, days_left: days, stage });

  const close = (how: "later" | "never") => {
    tap(how);
    try {
      if (how === "never") localStorage.setItem(neverKey(uid, until), "1");
      else localStorage.setItem(laterKey(uid, until), dhakaDay(Date.now()));
    } catch {}
    setMenu(false);
    setLater(true);
  };

  return (
    <div className="rn-wrap">
      <section className={`rn rn--${stage}`} aria-labelledby="rn-title" data-card="renew-banner">
        <div className="rn-top">
          <span className="rn-icon" aria-hidden>
            <IconCrown size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="rn-title" className="rn-title">
              <T en={title.en} bn={title.bn} />
            </h2>
            <p className="rn-lead">
              <T en="Don't lose your Premium access." bn="প্রিমিয়াম সুবিধা হারাবেন না।" />
            </p>
          </div>
          <div className="rn-close" ref={menuRef}>
            <button
              type="button"
              className="rn-close-btn"
              aria-label={bn ? "বন্ধ করার উপায়" : "Close options"}
              aria-haspopup="menu"
              aria-expanded={menu}
              onClick={() => setMenu((m) => !m)}
            >
              <IconClose size={18} />
            </button>
            {menu ? (
              <div className="rn-menu" role="menu">
                <button type="button" role="menuitem" className="rn-menu-item" onClick={() => close("later")}>
                  <T en="Remind me later" bn="পরে মনে করিয়ে দিন" />
                  <span className="rn-menu-note">
                    <T en="It comes back tomorrow." bn="কাল আবার দেখাবে।" />
                  </span>
                </button>
                <button type="button" role="menuitem" className="rn-menu-item" onClick={() => close("never")}>
                  <T en="Don't show again" bn="আর দেখাবেন না" />
                  <span className="rn-menu-note">
                    <T en="Until this Premium ends." bn="এই প্রিমিয়াম শেষ হওয়া পর্যন্ত।" />
                  </span>
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <p className="rn-offer">
          <T en="Add one year for " bn="" />
          <strong className="tabular-nums whitespace-nowrap">
            {tk(amount)}
            {was && was > amount ? (
              <s className="rn-was">
                <span className="sr-only">
                  <T en="Regular price " bn="আগের দাম " />
                </span>
                {tk(was)}
              </s>
            ) : null}
          </strong>
          <T
            en={` (about ${tk(perMonth)} a month). Your Premium will then run till `}
            bn={` দিয়ে এক বছর যোগ করুন (মাসে প্রায় ${tk(perMonth)})। তখন আপনার প্রিমিয়াম চলবে `}
          />
          <strong className="whitespace-nowrap">
            <T en={yearEnd.en} bn={yearEnd.bn} />
          </strong>
          <T en=". You keep every day you have left." bn=" পর্যন্ত। বাকি দিনগুলো হারাবেন না।" />
        </p>

        <div className="rn-body" data-open={open ? "" : undefined} id="rn-body">
          {live?.found ? (
            <p className="rn-found">
              <T en={live.found.en} bn={live.found.bn} />
            </p>
          ) : null}
          <p className="rn-lose-h">
            <T en="Without Premium you lose:" bn="প্রিমিয়াম না থাকলে যা হারাবেন:" />
          </p>
          <ul className="rn-lose">
            {mine.map((l) => (
              <li key={l.en} className="rn-lose-mine">
                <T en={l.en} bn={l.bn} />
              </li>
            ))}
            {always.map((l) => (
              <li key={l.en}>
                <T en={l.en} bn={l.bn} />
              </li>
            ))}
          </ul>
        </div>

        <div className="rn-actions">
          <Button href="/premium?plan=yearly&src=renew-banner#pay" onClick={() => tap("pay")}>
            <T en="Add one year" bn="এক বছর যোগ করুন" />
          </Button>
          <Button href="/premium?src=renew-banner#pay" variant="quiet" onClick={() => tap("plans")}>
            <T en="Other plans" bn="অন্য প্ল্যান" />
          </Button>
          <button
            type="button"
            className="rn-more"
            aria-expanded={open}
            aria-controls="rn-body"
            onClick={() => {
              if (!open) tap("more");
              setOpen((o) => !o);
            }}
          >
            {open ? <T en="Hide" bn="লুকান" /> : <T en="What you'd lose" bn="যা হারাবেন" />}
            <span className="rn-more-chev" aria-hidden>
              <IconChevronDown size={16} />
            </span>
          </button>
        </div>
      </section>
    </div>
  );
}
