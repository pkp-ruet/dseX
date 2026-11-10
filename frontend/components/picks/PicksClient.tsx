"use client";

import { useEffect, useRef, useState } from "react";
import Link from "@/components/ui/Link";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { apiGetForYou, forYouCounts, type ForYou } from "@/lib/api";
import { usePremium } from "@/lib/premium";
import { t } from "@/lib/home-copy";
import { formatDate } from "@/lib/formatters";
import { bnDate } from "@/lib/bn";
import { trackEvent } from "@/lib/track";
import { T } from "@/components/i18n/T";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import Skeleton from "@/components/ui/Skeleton";
import { PersonalCodesProvider } from "@/components/market-analysis/PersonalCodes";
import ForYouPromo, { DISCOVER_PREMIUM_ANCHOR } from "@/components/home/personalized/ForYouPromo";
import { FREE_DISCOVER_ROWS } from "@/lib/free-share";
import PickCard from "@/components/picks/PickCard";
import HowWePick from "@/components/picks/HowWePick";
import { IconBook, IconSparkle, IconTarget } from "@/components/ui/icons";

/**
 * The Discover page (`/discover`, "Picked for you" at `/picked-for-you` until 2026-11-08; 2026-11-05, user: "make a
 * separate page for 'picked for you' … in full page every stock will [have
 * the] same reasoning"). One `GET /api/user/for-you` — the recommendation
 * engine's whole list (backend services/recommend.py).
 *
 * Premium: a short note (who it is for, the three numbers behind it, what it
 * was matched to), a jump row, then every pick
 * as the same `PickCard`, then "How we pick". Free (since 2026-11-08, "Open
 * list, lock depth"): the same note, the top FREE_DISCOVER_ROWS with name,
 * fit and reason (their case one locked line), then `ForYouPromo` for the
 * rest of the list and the depth, then "How we pick".
 *
 * Since 2026-11-08 this is a list to explore, not a buy list (user: "buy
 * signal is generic … our best selection to buy in whole market; picked for
 * you is personalized … for exploring the other stocks in market, read
 * analysis, know things"): strong companies the reader doesn't own or follow,
 * at any price, never one on today's Buy List — those that would fit are
 * left out (the API's `buy_list` still names the ones that would fit; the
 * page no longer shows them). Guest: what the page is + sign up.
 */
export default function PicksClient() {
  const { user, isLoggedIn, isLoading } = useAuth();
  const { isPremium } = usePremium();
  const { lang } = useLang();
  const [data, setData] = useState<ForYou | null>(null);
  const [failed, setFailed] = useState(false);
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
    trackEvent("picks_view", { plan: isPremium ? "premium" : "free", n: forYouCounts(data).total });
  }, [data, isPremium]);

  // A dashboard tile opens `#pick-CODE`; the cards arrive after the page, so
  // the browser can't jump there on its own.
  useEffect(() => {
    if (!data || !isPremium || typeof window === "undefined") return;
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id.startsWith("pick-") && id !== "how") return;
    const raf = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
    return () => cancelAnimationFrame(raf);
  }, [data, isPremium]);

  if (isLoading || (isLoggedIn && !data && !failed)) return <PicksSkeleton />;
  if (!isLoggedIn) {
    return (
      <>
        <GuestPicks />
        <HowWePick funnel={null} />
      </>
    );
  }
  if (failed || !data) {
    return (
      <ErrorState
        title={<T en="Your picks didn't load" bn="আপনার বাছাই লোড হয়নি" />}
        message={<T en="Please try again in a moment." bn="একটু পরে আবার চেষ্টা করুন।" />}
        reload
      />
    );
  }

  // Free (2026-11-08, "Open list, lock depth"): the top FREE_DISCOVER_ROWS
  // with names and why each fits them, the case under each locked to one
  // line, then the Premium card for the rest and the depth.
  if (!isPremium) {
    const open = data.items.slice(0, FREE_DISCOVER_ROWS);
    return (
      <PersonalCodesProvider>
        <PicksIntro data={data} name={user?.display_name} />
        {open.length > 0 ? (
          <>
            <ol className="pk-list">
              {open.map((it, i) => (
                <PickCard key={it.code} item={it} rank={i + 1} open={false} lockHref={`#${DISCOVER_PREMIUM_ANCHOR}`} />
              ))}
            </ol>
            <ForYouPromo data={data} lang={lang} area="discover" />
          </>
        ) : (
          <NothingToday data={data} />
        )}
        <HowWePick funnel={data.funnel} />
      </PersonalCodesProvider>
    );
  }

  return (
    <PersonalCodesProvider>
      <PicksIntro data={data} name={user?.display_name} />
      {data.items.length > 0 ? (
        <>
          <nav className="pk-jump" aria-label={lang === "bn" ? "বাছাইয়ে যান" : "Go to a pick"}>
            {data.items.map((it, i) => (
              <a key={it.code} href={`#pick-${it.code}`} className="pk-jump-chip">
                <span className="nums">{i + 1}</span>
                {it.code}
              </a>
            ))}
          </nav>
          <ol className="pk-list">
            {data.items.map((it, i) => (
              <PickCard key={it.code} item={it} rank={i + 1} />
            ))}
          </ol>
        </>
      ) : (
        <NothingToday data={data} />
      )}
      <HowWePick funnel={data.funnel} />
    </PersonalCodesProvider>
  );
}

/**
 * The note on top of the list (simplified 2026-11-08, user: "looks complex
 * and hard to understand"): when it was updated, one headline, one line on
 * what these companies are and what they were matched to, three short
 * points (picked from your own shares · new names only · a way to learn the
 * market — user, same day: "how its personalized … to explore more stocks
 * and enrich knowledge"), and a "How we pick" link. The funnel boxes, the "what your shares have in common" line
 * and the Buy List pointer were removed; the check counts live in "How we
 * pick".
 */
function PicksIntro({ data, name }: { data: ForYou; name?: string | null }) {
  const personal = data.mode === "personal";
  const counts = forYouCounts(data);
  const n = counts.total;
  const first = (name ?? "").trim().split(/\s+/)[0] || "";
  const { held, watched } = data.based_on;
  const both = (fn: (l: "en" | "bn") => string) => <T en={fn("en")} bn={fn("bn")} />;

  const basis = (l: "en" | "bn") =>
    held && watched
      ? t(l, "forYouBasisBoth", { held, watched })
      : held
        ? t(l, "forYouBasisHeld", { n: held })
        : t(l, "forYouBasisWatched", { n: watched });

  return (
    <section className="pk-intro soft-card" aria-labelledby="pk-intro-title">
      <p className="pk-eyebrow">
        <IconSparkle size={14} />
        {data.as_of ? (
          <T en={`Updated ${formatDate(data.as_of)}`} bn={`হালনাগাদ ${bnDate(data.as_of)}`} />
        ) : (
          <T en="Updated after every close" bn="প্রতিদিন বাজার বন্ধের পর হালনাগাদ" />
        )}
        {counts.new > 0 && (
          <span className="text-positive">
            {" · "}
            {both((l) => t(l, "forYouNewToday", { n: counts.new }))}
          </span>
        )}
      </p>
      <h2 id="pk-intro-title" className="pk-title">
        {both((l) => t(l, first ? "forYouHeadPersonalName" : "forYouHeadPersonal", { name: first, n }))}
      </h2>
      <p className="pk-lead">
        {both((l) => (personal ? t(l, "forYouLeadPersonal", { basis: basis(l) }) : t(l, "forYouLeadGeneric")))}
      </p>

      <ul className="pk-points">
        <li>
          <span className="pk-point-icon" aria-hidden="true">
            <IconTarget size={16} />
          </span>
          <span className="min-w-0">
            {personal ? (
              <T
                en="Picked for you, not for everyone. We look at your own shares and find companies tied to them: a stronger company in the same business as a weak one you hold, one like a share you already have, or a business you don't have yet."
                bn="সবার জন্য নয়, আপনার জন্য বাছাই। আমরা আপনার নিজের শেয়ারগুলো দেখি, আর সেগুলোর সাথে যুক্ত কোম্পানি খুঁজি: আপনার কোনো দুর্বল শেয়ারের একই ব্যবসায় আরও শক্তিশালী কোম্পানি, আপনার কোনো শেয়ারের মতো আরেকটি, বা এমন ব্যবসা যা আপনার এখনো নেই।"
              />
            ) : (
              <T
                en="Picked for you, not for everyone. Once you add the shares you own or follow, we find companies tied to them: stronger ones in the same business, ones like yours, or businesses you don't have yet."
                bn="সবার জন্য নয়, আপনার জন্য বাছাই। আপনার কেনা বা ফলো করা শেয়ার যোগ করলে আমরা সেগুলোর সাথে যুক্ত কোম্পানি খুঁজি: একই ব্যবসায় আরও শক্তিশালী, আপনার শেয়ারের মতো, বা এমন ব্যবসা যা আপনার এখনো নেই।"
              />
            )}
          </span>
        </li>
        <li>
          <span className="pk-point-icon" aria-hidden="true">
            <IconSparkle size={16} />
          </span>
          <span className="min-w-0">
            <T
              en="Companies you haven't looked at yet. Shares you already own or follow never appear here, so every name is a new one to get to know."
              bn="এমন কোম্পানি, যা আপনি এখনো দেখেননি। আপনার কেনা বা ফলো করা শেয়ার এখানে আসে না, তাই প্রতিটি নামই নতুন করে চেনার মতো।"
            />
          </span>
        </li>
        <li>
          <span className="pk-point-icon" aria-hidden="true">
            <IconBook size={16} />
          </span>
          <span className="min-w-0">
            <T
              en="A way to learn the market. Each company says why it fits you; open our analysis to see how a strong DSE company makes its money, and follow the ones you like."
              bn="বাজার চেনার একটি উপায়। প্রতিটি কোম্পানির সাথে বলা আছে কেন আপনার সাথে মেলে; আমাদের বিশ্লেষণ খুলে দেখুন একটি শক্তিশালী ডিএসই কোম্পানি কীভাবে আয় করে, আর যেগুলো ভালো লাগে সেগুলো ফলো করুন।"
            />
          </span>
        </li>
      </ul>

      {data.note && (
        <p className="pk-note">
          <T en={data.note.en} bn={data.note.bn} />
        </p>
      )}

      {held + watched === 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button href="/watchlist" size="sm">
            {both((l) => t(l, "forYouAddWatchlist"))}
          </Button>
          <Button href="/portfolio" variant="quiet" size="sm">
            {both((l) => t(l, "forYouAddPortfolio"))}
          </Button>
        </div>
      )}

      <p className="pk-intro-foot">
        <a href="#how" className="font-semibold text-primary-ink hover:underline">
          <T en="How we pick" bn="কীভাবে বাছাই করি" />
        </a>
      </p>
    </section>
  );
}

function NothingToday({ data }: { data: ForYou }) {
  return (
    <EmptyState
      title={<T en="No picks today" bn="আজ কোনো বাছাই নেই" />}
      message={
        data.note ? (
          <T en={data.note.en} bn={data.note.bn} />
        ) : (
          <T
            en="No company that fits you passes every check today. The list is built again after every close."
            bn="আজ আপনার সাথে মেলে এমন কোনো কোম্পানি সব যাচাই পার হয়নি। প্রতিদিন বাজার বন্ধের পর তালিকাটি নতুন করে তৈরি হয়।"
          />
        )
      }
      actions={[{ href: "/dsestockranking", label: <T en="See the company ranking" bn="কোম্পানির র‍্যাঙ্কিং দেখুন" /> }]}
    />
  );
}

function GuestPicks() {
  return (
    <div className="soft-card p-5 sm:p-6">
      <h2 className="text-lg font-bold text-text-main">
        <T en="Companies to explore, built around your own shares" bn="আপনার নিজের শেয়ার ঘিরে দেখার মতো কোম্পানি" />
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-text-main">
        <T
          en="Every day after the close we check every company we grade, keep the strong ones that pass all our safety checks, and match them to the shares you own and follow, so you find companies worth reading about. Open a free account to start."
          bn="প্রতিদিন বাজার বন্ধের পর আমরা গ্রেড করা প্রতিটি কোম্পানি যাচাই করি, সব নিরাপত্তা যাচাই পার করা শক্তিশালী কোম্পানিগুলো রাখি, আর আপনার কেনা ও ফলো করা শেয়ারের সাথে মেলাই, যাতে পড়ে দেখার মতো কোম্পানি খুঁজে পান। শুরু করতে একটি ফ্রি অ্যাকাউন্ট খুলুন।"
        />
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button href="/register">
          <T en="Create a free account" bn="ফ্রি অ্যাকাউন্ট খুলুন" />
        </Button>
        <Button href="/login" variant="quiet">
          <T en="Sign in" bn="সাইন ইন" />
        </Button>
      </div>
    </div>
  );
}

function PicksSkeleton() {
  return (
    <div aria-busy="true">
      <div className="soft-card grid gap-3 p-5">
        <Skeleton width="30%" height={14} />
        <Skeleton width="70%" height={24} />
        <Skeleton width="90%" />
        <Skeleton width="100%" height={56} />
      </div>
      {[0, 1, 2].map((k) => (
        <div key={k} className="soft-card mt-4 grid gap-3 p-5">
          <Skeleton width="45%" height={18} />
          <Skeleton width="85%" />
          <Skeleton width="100%" height={96} />
        </div>
      ))}
    </div>
  );
}
