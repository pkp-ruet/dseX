"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "@/components/ui/Link";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { T } from "@/components/i18n/T";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { getStoredUser } from "@/lib/auth";
import { authHref } from "@/lib/next-path";
import { cacheKeys, readCache, writeCache } from "@/lib/swr-cache";
import {
  apiGetNotifications,
  apiGetPortfolio,
  apiVisitWatchlist,
  flattenTiers,
  getScores,
  getWatchlistUpdates,
  type NotificationItem,
  type NotificationsFeed,
  type PortfolioHolding,
  type ScoreItem,
  type ScoresResponse,
  type WatchlistUpdates,
} from "@/lib/api";
import { getCachedWatchlist, loadWatchlist, setWatchlist, subscribeWatchlist } from "@/lib/watchlist";
import { getCachedAlerts, loadAlerts, subscribeAlerts } from "@/lib/price-alerts";
import { heldQty } from "@/lib/main-holdings";
import { buildWatchUpdates } from "@/lib/watch-updates";
import { FEED_KIND, dayHead, dhakaDay, kindsPhrase, visibleFeed } from "@/lib/feed";
import { buildMyShares, dateBits, groupShares, type GroupKey, type MyShare } from "@/lib/my-shares";
import { changePct, changeTone, money } from "@/lib/formatters";
import { PREMIUM_PATH } from "@/lib/premium";
import { toast } from "@/lib/toast";
import { trackEvent } from "@/lib/track";
import { stopWatching } from "@/components/watch-rules/store";
import { IconCalendar, IconChevronRight, IconClose, IconLock, IconSearch, IconWallet } from "@/components/ui/icons";
import WatchSearch from "@/components/portfolio/WatchSearch";
import ShareWatchlistButton from "@/components/watchlist/ShareWatchlistButton";
import EmptyStateActions from "@/components/watchlist/EmptyStateActions";
import MyShareSheet from "./MyShareSheet";

/** A "find one of your shares" field from this many shares. */
const FIND_FROM = 12;
const CODE_RX = /^[A-Z0-9&.-]{1,20}$/;
const DOT: Record<string, string> = { good: "nt-dot--good", bad: "nt-dot--bad", watch: "nt-dot--watch", warn: "nt-dot--watch" };

function flatten(scores: ScoresResponse | null): Map<string, ScoreItem> {
  if (!scores) return new Map();
  return new Map(flattenTiers(scores).map((s) => [s.trading_code.toUpperCase(), s]));
}

/**
 * My shares (`/my`, rebuilt 2026-11-25 — user: "its main job is to give
 * updates on watched and owned shares … both type shares will behave here
 * identical. on top there will be only a strong visible button linking to
 * portfolio"; mockup https://claude.ai/artifact/5rwddQNhbPqbY6YwNsiP89).
 *
 * One strong button to the portfolio (money lives there), then every share
 * the reader owns (main portfolio) or watches, each once and in the same row,
 * in three groups: New (an update in 7 days) · Coming up (a date in 14 days) ·
 * Nothing new. A tap opens one sheet (`MyShareSheet`). A free reader's
 * watcher updates are counted in one gold box, never which share (THE Premium
 * line, the same rule as Updates). Under the list: watch another share, send
 * the list, and which of them are on our lists.
 */
export default function MySharesClient() {
  const { isLoading, isLoggedIn } = useAuth();
  const { bn } = useLang();
  const L = (en: string, b: string) => (bn ? b : en);
  const userId = getStoredUser()?.user_id ?? null;

  const [holdings, setHoldings] = useState<PortfolioHolding[] | null>(() =>
    userId ? readCache<PortfolioHolding[]>(cacheKeys.portfolio(userId)) : null,
  );
  const [waiting, setWaiting] = useState(0);
  const [watchCodes, setWatchCodes] = useState<string[]>(() => getCachedWatchlist());
  const [watchReady, setWatchReady] = useState(false);
  const [alertsTick, setAlertsTick] = useState(0);
  const [prices, setPrices] = useState<Map<string, ScoreItem>>(() => flatten(readCache<ScoresResponse>(cacheKeys.scores)));
  const [feed, setFeed] = useState<NotificationsFeed | null>(null);
  const [updates, setUpdates] = useState<WatchlistUpdates | null>(null);
  const [failed, setFailed] = useState(false);
  const [sheet, setSheet] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sharedCodes, setSharedCodes] = useState<string[]>([]);
  const pendingShare = useRef<string | null>(null);

  // Everything the page reads, once signed in. The visit clears the navbar's
  // news dot (it was the watchlist page's job).
  useEffect(() => {
    if (!isLoggedIn) return;
    let live = true;
    apiGetPortfolio()
      .then((r) => {
        if (!live) return;
        setHoldings(r.holdings ?? []);
        setWaiting((r.suggestions ?? []).length);
        if (userId) writeCache(cacheKeys.portfolio(userId), r.holdings ?? []);
      })
      .catch(() => {
        if (!live) return;
        setHoldings((h) => h ?? []);
        setFailed(true);
      });
    const syncW = () => setWatchCodes(getCachedWatchlist());
    loadWatchlist()
      .then(syncW)
      .catch(() => {})
      .finally(() => live && setWatchReady(true));
    const offW = subscribeWatchlist(syncW);
    loadAlerts()
      .then(() => live && setAlertsTick((n) => n + 1))
      .catch(() => {});
    const offA = subscribeAlerts(() => setAlertsTick((n) => n + 1));
    getScores()
      .then((s) => {
        if (!live) return;
        setPrices(flatten(s));
        writeCache(cacheKeys.scores, s);
      })
      .catch(() => {});
    apiGetNotifications()
      .then((f) => live && setFeed(f))
      .catch(() => {});
    apiVisitWatchlist().catch(() => {});

    // ?share=CODE opens that share's sheet; ?codes=A,B is a shared list.
    const qs = new URLSearchParams(window.location.search);
    pendingShare.current = qs.get("share")?.toUpperCase() ?? null;
    setSharedCodes(
      (qs.get("codes") ?? "")
        .split(",")
        .map((c) => c.trim().toUpperCase())
        .filter((c) => CODE_RX.test(c))
        .slice(0, 50),
    );
    return () => {
      live = false;
      offW();
      offA();
    };
  }, [isLoggedIn, userId]);

  const held = useMemo(() => heldQty(holdings ?? []), [holdings]);
  // Watched = the watchlist, plus any share with an armed price alert.
  const watched = useMemo(() => {
    const alertCodes = getCachedAlerts()
      .filter((a) => a.is_active)
      .map((a) => a.trading_code.toUpperCase());
    return Array.from(new Set([...watchCodes.map((c) => c.toUpperCase()), ...alertCodes]));
    // alertsTick: re-read the alert cache once it has loaded or changed.
  }, [watchCodes, alertsTick]);

  const allCodes = useMemo(
    () => Array.from(new Set([...held.keys(), ...watched])).sort(),
    [held, watched],
  );
  const codesKey = allCodes.join(",");

  // The dates ahead (results meetings, record dates, AGMs) on every share.
  useEffect(() => {
    if (!isLoggedIn || !codesKey) return;
    let live = true;
    getWatchlistUpdates(codesKey.split(",").slice(0, 100))
      .then((u) => live && setUpdates(u))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [isLoggedIn, codesKey]);

  const premium = feed?.premium ?? false;
  const { shown, hidden } = useMemo(
    () => (feed ? visibleFeed(feed.items, feed.premium) : { shown: [] as NotificationItem[], hidden: [] as NotificationItem[] }),
    [feed],
  );

  const shares = useMemo(() => {
    const mine = new Set(allCodes);
    const rows = [...prices.values()].filter((s) => mine.has(s.trading_code.toUpperCase()));
    const coming = buildWatchUpdates({ rows, updates, alerts: getCachedAlerts(), news: [], extremes: null }).coming;
    return buildMyShares({ held, watched, prices, feed: shown, coming });
    // alertsTick: the alert cache feeds the "near your alert" dates.
  }, [allCodes, prices, updates, held, watched, shown, alertsTick]);

  const ready = holdings != null && (watchReady || watchCodes.length > 0);

  // ?share=CODE: open that share once the list is in.
  useEffect(() => {
    const c = pendingShare.current;
    if (!c || !ready) return;
    if (shares.some((s) => s.code === c)) {
      pendingShare.current = null;
      setSheet(c);
    }
  }, [ready, shares]);

  const q = shares.length >= FIND_FROM ? query.trim().toLowerCase() : "";
  const groups = useMemo(() => {
    const list = q ? shares.filter((s) => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)) : shares;
    return groupShares(list);
  }, [shares, q]);

  const open = shares.find((s) => s.code === sheet) ?? null;

  function openShare(s: MyShare, group: GroupKey) {
    setSheet(s.code);
    trackEvent("my_share_open", { group, owned: s.owned ? 1 : 0 });
  }

  async function stop(code: string) {
    setSheet(null);
    const undo = await stopWatching(code);
    toast({
      tone: "neutral",
      message: <T en={`You stopped watching ${code}`} bn={`${code}-এ নজর রাখা বন্ধ করেছেন`} />,
      action: { label: <T en="Undo" bn="ফিরিয়ে আনুন" />, onClick: () => void undo() },
    });
  }

  function dismissShared() {
    setSharedCodes([]);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("codes");
      window.history.replaceState(null, "", url.toString());
    } catch {}
  }

  async function importShared() {
    const merged = Array.from(new Set([...watchCodes.map((c) => c.toUpperCase()), ...sharedCodes]));
    await setWatchlist(merged);
    dismissShared();
  }

  if (isLoading) return <MySkeleton />;

  if (!isLoggedIn) {
    return (
      <section className="soft-card pf-empty mx-auto mt-4 w-full max-w-md">
        <h2 className="pf-empty-title">
          <T en="Sign in to see your shares" bn="আপনার শেয়ার দেখতে সাইন ইন করুন" />
        </h2>
        <p className="pf-empty-text">
          <T
            en="What's new and what's coming on every share you own or watch, in one place."
            bn="আপনার কেনা আর নজরে রাখা প্রতিটি শেয়ারে নতুন কী আর সামনে কী, এক জায়গায়।"
          />
        </p>
        <div className="pf-empty-actions">
          <Button href={authHref("/login", "/my")} variant="primary">
            <T en="Sign in" bn="সাইন ইন" />
          </Button>
          <Button href={authHref("/register", "/my")} variant="quiet">
            <T en="Create an account" bn="অ্যাকাউন্ট খুলুন" />
          </Button>
        </div>
      </section>
    );
  }

  const ownedN = held.size;
  const watchedSet = new Set(watched);
  const newShared = sharedCodes.filter((c) => !watchedSet.has(c) && !held.has(c));

  return (
    <div className="my">
      {/* The one thing on top: a strong button to the portfolio, where the money lives. */}
      <Link href="/portfolio" className="my-pf" data-card="my-portfolio">
        <span className="my-pf-ic" aria-hidden>
          <IconWallet size={24} />
        </span>
        <span className="my-pf-t">
          <b>
            <T en="My portfolio" bn="আমার পোর্টফোলিও" />
          </b>
          <span>
            {ownedN > 0 || holdings == null ? (
              <T
                en="Your money, profit and grade. Buy, sell or add a share."
                bn="আপনার টাকা, লাভ আর গ্রেড। কিনুন, বেচুন বা শেয়ার যোগ করুন।"
              />
            ) : (
              <T
                en="Add the shares you own to see your money, profit and grade."
                bn="আপনার কেনা শেয়ারগুলো যোগ করুন, টাকা, লাভ আর গ্রেড দেখুন।"
              />
            )}
          </span>
        </span>
        <span className="my-pf-end">
          {waiting > 0 && (
            <span className="my-pf-badge">
              <T en={`${waiting} to confirm`} bn={`${waiting}টি নিশ্চিত করুন`} />
            </span>
          )}
          <IconChevronRight size={20} />
        </span>
      </Link>

      {newShared.length > 0 && (
        <div className="soft-card pf-note">
          <p className="pf-note-text">
            <T
              en={`Someone shared a list of ${newShared.length} ${newShared.length === 1 ? "share" : "shares"}: ${newShared.slice(0, 5).join(", ")}${newShared.length > 5 ? "…" : ""}. Watch them too?`}
              bn={`কেউ ${newShared.length}টি শেয়ারের একটি তালিকা পাঠিয়েছেন: ${newShared.slice(0, 5).join(", ")}${newShared.length > 5 ? "…" : ""}। এগুলোতেও নজর রাখবেন?`}
            />
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="primary" size="sm" onClick={importShared}>
              <T en="Watch them" bn="নজর রাখুন" />
            </Button>
            <Button type="button" variant="quiet" size="sm" onClick={dismissShared}>
              <T en="No, thanks" bn="না, ধন্যবাদ" />
            </Button>
          </div>
        </div>
      )}

      {!ready ? (
        <MyListSkeleton />
      ) : shares.length === 0 ? (
        <section className="soft-card pf-empty">
          <h2 className="pf-empty-title">
            <T en="Watch a share, or add the ones you own" bn="কোনো শেয়ারে নজর রাখুন, বা আপনার কেনা শেয়ার যোগ করুন" />
          </h2>
          <p className="pf-empty-text">
            <T
              en="We check them after every close and show here when results, a dividend or a warning comes, and the dates ahead."
              bn="প্রতিদিন বাজার বন্ধের পর আমরা সেগুলো দেখি। আর্থিক ফল, ডিভিডেন্ড বা সতর্কতা এলে, আর সামনের তারিখগুলো, এখানে দেখাই।"
            />
          </p>
          <EmptyStateActions />
        </section>
      ) : (
        <>
          {failed && (
            <p className="form-error">
              <T
                en="We couldn't load your portfolio just now, so the shares you own may be missing. Try again in a moment."
                bn="এই মুহূর্তে আপনার পোর্টফোলিও আনা যায়নি, তাই কেনা শেয়ারগুলো বাদ পড়তে পারে। একটু পরে আবার চেষ্টা করুন।"
              />
            </p>
          )}

          {!premium && hidden.length > 0 && <LockedCount items={hidden} />}

          {shares.length >= FIND_FROM && (
            <div className="pf-search">
              <label htmlFor="my-find" className="sr-only">
                {L("Find one of your shares", "আপনার একটি শেয়ার খুঁজুন")}
              </label>
              <span className="pf-search-icon">
                <IconSearch size={16} />
              </span>
              <input
                id="my-find"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={L("Find one of your shares", "আপনার একটি শেয়ার খুঁজুন")}
                autoComplete="off"
                enterKeyHint="search"
                className="input-field"
              />
              {query && (
                <button type="button" className="pf-search-clear" onClick={() => setQuery("")} aria-label={L("Clear search", "খোঁজা মুছুন")}>
                  <IconClose size={16} />
                </button>
              )}
            </div>
          )}

          {groups.new.length + groups.soon.length + groups.rest.length === 0 && (
            <p className="pfs-p">
              <T en="None of your shares match." bn="আপনার কোনো শেয়ার মেলেনি।" />
            </p>
          )}

          {groups.new.length > 0 && (
            <Group id="my-new" title={{ en: "New", bn: "নতুন" }} note={{ en: "Last 7 days", bn: "গত 7 দিনে" }} n={groups.new.length}>
              {groups.new.map((s) => (
                <Row key={s.code} s={s} group="new" onOpen={openShare} />
              ))}
            </Group>
          )}
          {groups.soon.length > 0 && (
            <Group id="my-soon" title={{ en: "Coming up", bn: "সামনে যা আছে" }} note={{ en: "Next 14 days", bn: "আগামী 14 দিনে" }} n={groups.soon.length}>
              {groups.soon.map((s) => (
                <Row key={s.code} s={s} group="soon" onOpen={openShare} />
              ))}
            </Group>
          )}
          {groups.rest.length > 0 && (
            <Group
              id="my-rest"
              // A free reader's updates are counted, not placed, so we never call
              // their other shares quiet.
              title={premium ? { en: "Nothing new", bn: "নতুন কিছু নেই" } : { en: "Your other shares", bn: "আপনার অন্য শেয়ার" }}
              note={{ en: "A to Z", bn: "নাম অনুযায়ী" }}
              n={groups.rest.length}
            >
              {groups.rest.map((s) => (
                <Row key={s.code} s={s} group="rest" onOpen={openShare} />
              ))}
            </Group>
          )}
        </>
      )}

      <div className="my-tools">
        <WatchSearch priceMap={prices} watched={watchedSet} owned={new Set(held.keys())} />
        {shares.length > 0 && (
          <div className="my-links">
            <ShareWatchlistButton codes={allCodes} />
            <Link href="/lists?mine=1" className="ms-go" data-card="my-on-lists">
              <T en="Which of your shares are on our lists" bn="আপনার কোন শেয়ার আমাদের তালিকায়" />
              <IconChevronRight size={14} />
            </Link>
          </div>
        )}
      </div>

      <MyShareSheet
        share={open}
        open={open != null}
        premium={premium}
        range={open ? updates?.ranges?.[open.code] ?? null : null}
        onClose={() => setSheet(null)}
        onStop={stop}
      />
    </div>
  );
}

type Pair = { en: string; bn: string };

function Group({ id, title, note, n, children }: { id: string; title: Pair; note: Pair; n: number; children: ReactNode }) {
  return (
    <section className="my-grp" aria-labelledby={id}>
      <div className="my-grp-h">
        <h2 id={id}>
          <T en={title.en} bn={title.bn} />
          <span className="my-grp-n">{n}</span>
        </h2>
        <span className="my-grp-note">
          <T en={note.en} bn={note.bn} />
        </span>
      </div>
      <ul className="soft-card my-list">{children}</ul>
    </section>
  );
}

/** THE row: the same parts for a share the reader owns and one they watch. */
function Row({ s, group, onOpen }: { s: MyShare; group: GroupKey; onOpen: (s: MyShare, g: GroupKey) => void }) {
  const top = s.fresh[0] ?? null;
  const more = s.fresh.length - 1;
  const date = s.next ? dateBits(s.next) : null;
  const kind = top ? FEED_KIND[top.kind] ?? { en: "Update", bn: "খবর" } : null;
  const when = top ? dayHead(dhakaDay(top.at)) : null;
  return (
    <li className="my-item">
      <button type="button" className={group === "rest" ? "my-row my-row--quiet" : "my-row"} onClick={() => onOpen(s, group)}>
        <span className="my-who">
          <span className="my-name">{s.name}</span>
          <span className="my-sub">
            <span className="my-code">{s.code}</span> ·{" "}
            {s.owned ? <T en="You own it" bn="আপনার আছে" /> : <T en="You watch it" bn="নজরে রাখছেন" />}
          </span>
        </span>
        <span className="my-px">
          <b>{money(s.ltp)}</b>
          <span className={changeTone(s.change)}>{changePct(s.change)}</span>
        </span>
        <span className="my-go" aria-hidden>
          <IconChevronRight size={16} />
        </span>
        {top && kind && when && (
          <span className="my-upd">
            <span className={`nt-dot ${DOT[top.level] ?? ""}`} aria-hidden />
            <span className="min-w-0">
              <span className="my-meta">
                {top.new && (
                  <span className="nt-new">
                    <T en="New" bn="নতুন" />
                  </span>
                )}
                <span>
                  <T en={kind.en} bn={kind.bn} /> · <T en={when.en} bn={when.bn} />
                </span>
              </span>
              <span className="my-say">
                <T en={top.title_en} bn={top.title_bn || top.title_en} />
              </span>
            </span>
          </span>
        )}
        {date && group !== "rest" && (
          <span className="my-when">
            <span className="my-cal" aria-hidden>
              <IconCalendar size={15} />
            </span>
            <span>
              <b>
                <T en={date.when.en} bn={date.when.bn} />
              </b>{" "}
              · <T en={date.what.en} bn={date.what.bn} />
            </span>
          </span>
        )}
        {more > 0 && (
          <span className="my-more">
            <T en={`+${more} more ${more === 1 ? "update" : "updates"}`} bn={`আরও ${more}টি খবর`} />
          </span>
        )}
      </button>
    </li>
  );
}

/** A free reader's count of what our watcher found (THE Premium line): never which share. */
function LockedCount({ items }: { items: NotificationItem[] }) {
  const n = items.length;
  const kinds = kindsPhrase(items);
  useEffect(() => {
    trackEvent("premium_lock_view", { area: "my-shares", lock: "my-shares-count", n });
  }, [n]);
  return (
    <section className="my-lock" aria-labelledby="my-lock-h">
      <h2 id="my-lock-h" className="my-lock-h">
        <IconLock size={16} />
        <T
          en={`${n} more ${n === 1 ? "update" : "updates"} on your shares`}
          bn={`আপনার শেয়ারে আরও ${n}টি খবর`}
        />
      </h2>
      <p className="my-lock-p">
        <T
          en={`In the last 30 days we found ${kinds.en}. Premium shows which shares, and tells you the same evening.`}
          bn={`গত 30 দিনে আমরা পেয়েছি ${kinds.bn}। কোন শেয়ারে, প্রিমিয়াম তা দেখায়, আর সেদিন সন্ধ্যায়ই জানায়।`}
        />
      </p>
      <Button
        href={`${PREMIUM_PATH}?src=my-shares#pay`}
        size="sm"
        className="my-lock-btn"
        onClick={() => trackEvent("premium_lock_tap", { area: "my-shares", lock: "my-shares-count", n })}
      >
        <T en="See which shares" bn="কোন শেয়ার, দেখুন" />
      </Button>
    </section>
  );
}

function MyListSkeleton() {
  return (
    <div className="soft-card my-list" aria-busy="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="my-row my-row--quiet">
          <span className="my-who">
            <Skeleton width="55%" height={16} />
            <Skeleton width="35%" height={12} className="mt-1" />
          </span>
          <span className="my-px">
            <Skeleton width={56} height={14} />
          </span>
        </div>
      ))}
    </div>
  );
}

function MySkeleton() {
  return (
    <div className="my">
      <Skeleton width="100%" height={76} />
      <MyListSkeleton />
    </div>
  );
}
