"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
import ForYouFunnel from "@/components/home/personalized/ForYouFunnel";
import ForYouPromo from "@/components/home/personalized/ForYouPromo";
import PickCard from "@/components/picks/PickCard";
import HowWePick from "@/components/picks/HowWePick";
import { IconSparkle } from "@/components/ui/icons";

/**
 * The "Picked for you" page (`/picked-for-you`, 2026-11-05, user: "make a
 * separate page for 'picked for you' … in full page every stock will [have
 * the] same reasoning"). One `GET /api/user/for-you` — the recommendation
 * engine's whole list (backend services/recommend.py).
 *
 * Premium: a short note (who it is for, the three numbers behind it, what it
 * was matched to), a jump row, then every pick as the same `PickCard`, then
 * "How we pick". Free: the Premium card (`ForYouPromo`, counts only, never a
 * company) and the method. Guest: what the page is + sign up.
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

  if (!isPremium) {
    return (
      <>
        {data.items.length > 0 ? (
          <ForYouPromo data={data} name={user?.display_name} lang={lang} area="picks" />
        ) : (
          <NothingToday data={data} />
        )}
        <HowWePick funnel={data.funnel} />
      </>
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

/** The note on top of a Premium reader's list. */
function PicksIntro({ data, name }: { data: ForYou; name?: string | null }) {
  const { lang } = useLang();
  const personal = data.mode === "personal";
  const counts = forYouCounts(data);
  const n = counts.total;
  const first = (name ?? "").trim().split(/\s+/)[0] || "";
  const { held, watched } = data.based_on;
  const stocks = held + watched;
  const c = data.funnel.checks.length;
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
        {both((l) =>
          personal
            ? t(l, first ? "forYouHeadPersonalName" : "forYouHeadPersonal", { name: first, n })
            : t(l, first ? "forYouHeadGenericName" : "forYouHeadGeneric", { name: first, n }),
        )}
      </h2>
      <p className="pk-lead">
        {both((l) =>
          personal ? t(l, "forYouLeadPersonal", { basis: basis(l), c }) : t(l, "forYouLeadGeneric", { c }),
        )}
      </p>

      {data.funnel.rated > 0 && <ForYouFunnel data={data} lang={lang} />}

      {personal && data.traits.length > 0 && (
        <p className="pk-traits">
          <span className="font-semibold">
            <T en="What your shares have in common:" bn="আপনার শেয়ারগুলোর মিল:" />
          </span>{" "}
          <T en={data.traits.map((x) => x.en).join(" · ")} bn={data.traits.map((x) => x.bn).join(" · ")} />
        </p>
      )}

      {data.note && (
        <p className="pk-note">
          <T en={data.note.en} bn={data.note.bn} />
        </p>
      )}

      {stocks === 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button href="/watchlist" size="sm">
            {both((l) => t(l, "forYouAddWatchlist"))}
          </Button>
          <Button href="/portfolio" variant="quiet" size="sm">
            {both((l) => t(l, "forYouAddPortfolio"))}
          </Button>
        </div>
      ) : stocks < 3 ? (
        <p className="mt-3 text-sm">
          <Link prefetch={false} href="/watchlist" className="font-semibold text-primary-ink hover:underline">
            {both((l) => t(l, "forYouNudgeFew"))} →
          </Link>
        </p>
      ) : null}

      <p className="pk-intro-foot">
        <a href="#how" className="font-semibold text-primary-ink hover:underline">
          <T en="How we pick" bn="কীভাবে বাছাই করি" />
        </a>
        <span aria-hidden="true"> · </span>
        <T en="Ideas to look into, not advice." bn="খতিয়ে দেখার মতো আইডিয়া, পরামর্শ নয়।" />
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
            en="No stock passes every check today. When good companies get cheaper, picks appear here."
            bn="আজ কোনো শেয়ার সব যাচাই পার হয়নি। ভালো কোম্পানির দাম কমলে এখানে বাছাই আসবে।"
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
        <T en="Your picks are built around your own shares" bn="আপনার বাছাই সাজানো হয় আপনার নিজের শেয়ার ঘিরে" />
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-text-main">
        <T
          en="Every day after the close we check every company we grade, keep only the ones that pass all our checks, and match them to the shares you own and follow. Open a free account to start."
          bn="প্রতিদিন বাজার বন্ধের পর আমরা গ্রেড করা প্রতিটি কোম্পানি যাচাই করি, শুধু সব যাচাই পার হওয়াগুলো রাখি, আর আপনার কেনা ও ফলো করা শেয়ারের সাথে মেলাই। শুরু করতে একটি ফ্রি অ্যাকাউন্ট খুলুন।"
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
