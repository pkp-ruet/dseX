"use client";

import { authHref } from "@/lib/next-path";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiGetForYou, apiHideForYou, type ForYou, type ForYouPick } from "@/lib/api";
import { usePremium } from "@/lib/premium";
import { trackEvent } from "@/lib/track";
import { toast } from "@/lib/toast";
import { T } from "@/components/i18n/T";
import Button from "@/components/ui/Button";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import ForYouPremium, { FOR_YOU_PREMIUM_ANCHOR } from "@/components/for-you/ForYouPremium";
import HowWePick from "@/components/for-you/HowWePick";
import { ForYouGroupCard, ForYouIntro, StarterList } from "@/components/for-you/ForYouParts";

/** The Premium card sits after this many groups, so a long list can't bury it. */
const PROMO_AFTER = 2;

/**
 * "Based on your shares" (`/for-you`; Discover until 2026-11-18). One
 * `GET /api/user/for-you` — backend services/for_you.py.
 *
 * Every reader: one intro card ("Worth a look", the count, the note, the
 * shares the picks came from), then one section per share. Premium: every group open, each company
 * with why it fits, what it shares, read · follow · not for me. Free: the
 * same groups with each share's reason and each pick's business, the names
 * locked, and one Premium card. No shares yet: a free starter list.
 */
export default function ForYouClient() {
  const { isLoggedIn, isLoading } = useAuth();
  const { isPremium } = usePremium();
  const [data, setData] = useState<ForYou | null>(null);
  const [failed, setFailed] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const tracked = useRef(false);

  useEffect(() => {
    if (!isLoggedIn) return;
    let live = true;
    apiGetForYou()
      .then((d) => live && setData(d))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [isLoggedIn]);

  useEffect(() => {
    if (!data || tracked.current) return;
    tracked.current = true;
    trackEvent("for_you_view", {
      plan: isPremium ? "premium" : "free",
      mode: data.mode,
      n: data.counts?.total ?? data.items.length,
      groups: data.groups?.length ?? 0,
      read: data.based_on.read ?? 0,
    });
  }, [data, isPremium]);

  // A home-row tap can open `#pick-CODE` / `#fu-g-KEY`; the rows arrive
  // after the page, so the browser can't jump there on its own.
  useEffect(() => {
    if (!data || typeof window === "undefined") return;
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id || !(id.startsWith("pick-") || id.startsWith("fu-g-") || id === "how" || id === FOR_YOU_PREMIUM_ANCHOR)) return;
    const raf = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
    return () => cancelAnimationFrame(raf);
  }, [data]);

  const items = useMemo(() => (data?.items ?? []).filter((p) => !hidden.has(p.code)), [data, hidden]);
  const starter = useMemo(() => (data?.starter ?? []).filter((p) => !hidden.has(p.code)), [data, hidden]);

  const onHide = (p: ForYouPick) => {
    setHidden((s) => new Set(s).add(p.code));
    trackEvent("for_you_hide", { code: p.code, kind: p.kind });
    apiHideForYou(p.code).catch(() => {
      setHidden((s) => {
        const next = new Set(s);
        next.delete(p.code);
        return next;
      });
      toast({ message: <T en="That didn't save. Please try again." bn="সেভ হয়নি। আবার চেষ্টা করুন।" />, tone: "error" });
    });
    toast({
      message: <T en={`${p.code} is hidden for 90 days.`} bn={`${p.code} 90 দিন আর দেখাবে না।`} />,
      action: {
        label: <T en="Undo" bn="ফেরান" />,
        onClick: () => {
          setHidden((s) => {
            const next = new Set(s);
            next.delete(p.code);
            return next;
          });
          apiHideForYou(p.code, true).catch(() => undefined);
        },
      },
    });
  };

  if (isLoading || (isLoggedIn && !data && !failed)) return <ForYouSkeleton />;

  if (!isLoggedIn) {
    return (
      <>
        <GuestCard />
        <HowWePick funnel={null} />
      </>
    );
  }

  if (failed || !data) {
    return (
      <ErrorState
        title={<T en="Your list didn't load" bn="আপনার তালিকা লোড হয়নি" />}
        message={<T en="Please try again in a moment." bn="একটু পরে আবার চেষ্টা করুন।" />}
        reload
      />
    );
  }

  const addButtons = (
    <div className="fu-start-acts">
      <Button href="/watchlist" size="sm">
        <T en="Follow a share" bn="একটি শেয়ার ফলো করুন" />
      </Button>
      <Button href="/portfolio" variant="quiet" size="sm">
        <T en="Add your portfolio" bn="পোর্টফোলিও যোগ করুন" />
      </Button>
    </div>
  );

  // No shares, follows or reads yet: the starter list, free for everyone.
  if (data.mode === "generic") {
    return (
      <>
        <ForYouIntro />
        <StarterList
          picks={starter.length > 0 ? starter : items}
          title={<T en="Strong companies to start with" bn="শুরু করার মতো শক্তিশালী কোম্পানি" />}
          lead={
            <T
              en="Follow a share, add your portfolio or open a few stock pages, and we'll pick companies based on them. Until then, these strong, well-known companies are a good place to start."
              bn="একটি শেয়ার ফলো করুন, পোর্টফোলিও যোগ করুন বা কয়েকটি শেয়ারের পেজ খুলুন, আমরা সেগুলো দেখে কোম্পানি বাছাই করব। ততদিন এই শক্তিশালী, পরিচিত কোম্পানিগুলো দিয়ে শুরু করতে পারেন।"
            />
          }
          actions={addButtons}
          onHide={onHide}
        />
        <HowWePick funnel={data.funnel} />
      </>
    );
  }

  const groups = (data.groups ?? [])
    .map((g) => ({ g, picks: items.filter((p) => p.group_key === g.key) }))
    .filter(({ g, picks }) => (isPremium ? picks.length > 0 : g.n > 0))
    .map(({ g, picks }) => ({ g: isPremium ? { ...g, n: picks.length } : g, picks }));

  // Personal, but nothing tied to their shares passes today.
  if (groups.length === 0) {
    return (
      <>
        <ForYouIntro />
        <StarterList
          picks={starter}
          title={<T en="Nothing tied to your shares today" bn="আজ আপনার শেয়ারের সাথে মেলে এমন কিছু নেই" />}
          lead={
            data.note ? (
              <T en={data.note.en} bn={data.note.bn} />
            ) : (
              <T
                en="No strong company tied to your shares passes all our checks today. We don't fill the list with others. Until something does, these strong, well-known companies are worth knowing."
                bn="আজ আপনার শেয়ারের সাথে যুক্ত কোনো শক্তিশালী কোম্পানি আমাদের সব যাচাই পার হয়নি। অন্য কিছু দিয়ে তালিকা ভরাই না। ততদিন এই শক্তিশালী, পরিচিত কোম্পানিগুলো চিনে রাখার মতো।"
              />
            )
          }
          onHide={onHide}
        />
        <HowWePick funnel={data.funnel} />
      </>
    );
  }

  const shown: ForYou = isPremium
    ? { ...data, counts: { ...(data.counts ?? { total: 0, new: 0, own: 0, strong: 0 }), total: items.length } }
    : data;
  const lockHref = `#${FOR_YOU_PREMIUM_ANCHOR}`;
  const promoAt = Math.min(PROMO_AFTER, groups.length);

  return (
    <>
      <ForYouIntro data={{ ...shown, groups: groups.map((x) => x.g) }} linkGroups />
      <div className="fu-groups">
        {groups.map(({ g, picks }, i) => (
          <Fragment key={g.key}>
            <ForYouGroupCard group={g} picks={picks} open={isPremium} onHide={isPremium ? onHide : undefined} lockHref={lockHref} />
            {!isPremium && i + 1 === promoAt && <ForYouPremium data={data} />}
          </Fragment>
        ))}
      </div>
      <HowWePick funnel={data.funnel} />
    </>
  );
}

function GuestCard() {
  return (
    <div className="fu-intro soft-card">
      <h2 className="fu-intro-h">
        <T en="Companies to look at next, picked from your shares" bn="আপনার শেয়ার দেখে বাছাই করা, পরে দেখে রাখার মতো কোম্পানি" />
      </h2>
      <p className="fu-intro-note">
        <T
          en="After every close we look at the shares you own, follow and read about, and find strong companies tied to each one: a stronger company beside a weak share of yours, one like a share you like, or a business you don't have yet. Open a free account to start."
          bn="প্রতিদিন বাজার বন্ধের পর আমরা আপনার কেনা, ফলো করা আর পড়ে দেখা শেয়ারগুলো দেখি, আর প্রতিটির সাথে যুক্ত শক্তিশালী কোম্পানি খুঁজি: আপনার দুর্বল শেয়ারের পাশে আরও শক্তিশালী একটি, আপনার পছন্দের শেয়ারের মতো একটি, বা এমন ব্যবসা যা আপনার এখনো নেই। শুরু করতে একটি ফ্রি অ্যাকাউন্ট খুলুন।"
        />
      </p>
      <div className="fu-start-acts">
        <Button href={authHref("/register", "/for-you")}>
          <T en="Create a free account" bn="ফ্রি অ্যাকাউন্ট খুলুন" />
        </Button>
        <Button href={authHref("/login", "/for-you")} variant="quiet">
          <T en="Sign in" bn="সাইন ইন" />
        </Button>
      </div>
    </div>
  );
}

function ForYouSkeleton() {
  return (
    <div aria-busy="true" className="fu-groups">
      <div className="soft-card grid gap-3 p-5">
        <Skeleton width="40%" height={14} />
        <Skeleton width="60%" height={30} />
        <Skeleton width="90%" />
      </div>
      {[0, 1].map((k) => (
        <div key={k} className="soft-card grid gap-3 p-5">
          <Skeleton width="45%" height={18} />
          <Skeleton width="85%" />
          <Skeleton width="100%" height={72} />
        </div>
      ))}
    </div>
  );
}
