"use client";

import type { ReactNode } from "react";
import Link from "@/components/ui/Link";
import type { ForYou, ForYouGroup, ForYouPick, ForYouRel } from "@/lib/api";
import { changePct, changeTone, formatDate, money } from "@/lib/formatters";
import { bnDate, sectorBn } from "@/lib/bn";
import { T } from "@/components/i18n/T";
import StarButton from "@/components/ui/StarButton";
import { IconArrowRight, IconCheck, IconEye, IconLock } from "@/components/ui/icons";

/**
 * The parts of "Based on your shares" (`/for-you`, was Discover until
 * 2026-11-18). The page is organised by the reader's own shares: each group
 * says which share it came from and why (free), and the companies sit under
 * it (Premium). Styles `fu-*` in `app/styles/picks.css`.
 */

/** The clarification the page opens with (user, 2026-11-18: "it's not a buy
 *  now list. its for them to explore more stocks based on their choices,
 *  more like recommendation to watch next"). Shown to every reader. */
export function WatchNextNote() {
  return (
    <aside className="fu-note" aria-labelledby="fu-note-t">
      <span className="fu-note-icon" aria-hidden="true">
        <IconEye size={18} />
      </span>
      <div className="min-w-0">
        <p id="fu-note-t" className="fu-note-title">
          <T en="To watch next, not to buy now" bn="এখন কেনার জন্য নয়, পরে নজরে রাখার জন্য" />
        </p>
        <p className="fu-note-text">
          <T
            en="These are companies like the ones you chose, to read about and follow if you like them. This list doesn't say a share is worth buying today. For that, see its stock page or our "
            bn="এগুলো আপনার বেছে নেওয়া শেয়ারের মতো কোম্পানি: পড়ে দেখুন, ভালো লাগলে ফলো করুন। আজ কোনো শেয়ার কেনার মতো কি না, এই তালিকা তা বলে না। সেটি জানতে শেয়ারটির পেজ বা আমাদের "
          />
          <Link prefetch={false} href="/buy-list" className="fu-link">
            <T en="Buy List" bn="কেনার তালিকা" />
          </Link>
          <T en="." bn=" দেখুন।" />
        </p>
      </div>
    </aside>
  );
}

const REL_WORD: Record<ForYouRel, { en: string; bn: string }> = {
  own: { en: "You own", bn: "আপনার কেনা" },
  follow: { en: "You follow", bn: "আপনি ফলো করেন" },
  read: { en: "You read about", bn: "আপনি দেখেছেন" },
  gap: { en: "A gap in your money", bn: "আপনার টাকায় একটি ফাঁক" },
};

/** The small badge on a group and an anchor chip. */
export function RelBadge({ g }: { g: Pick<ForYouGroup, "rel" | "days"> }) {
  const w = REL_WORD[g.rel];
  const days = g.rel === "read" && g.days && g.days >= 2 ? g.days : null;
  return (
    <span className={`fu-rel fu-rel--${g.rel}`}>
      <T en={days ? `${w.en} · ${days} days` : w.en} bn={days ? `${w.bn} · ${days} দিন` : w.bn} />
    </span>
  );
}

/** The top card: how many we picked, from which of the reader's shares. */
export function ForYouSummary({ data, linkGroups }: { data: ForYou; linkGroups: boolean }) {
  const groups = data.groups ?? [];
  const n = data.counts?.total ?? data.items.length;
  const anchors = groups.filter((g) => g.anchor).length;
  const fresh = data.counts?.new ?? data.new ?? 0;
  return (
    <section className="fu-sum soft-card" aria-labelledby="fu-sum-t">
      <p className="fu-sum-date">
        {data.as_of ? (
          <T en={`Updated after the close, ${formatDate(data.as_of)}`} bn={`বাজার বন্ধের পর হালনাগাদ, ${bnDate(data.as_of)}`} />
        ) : (
          <T en="Updated after every close" bn="প্রতিদিন বাজার বন্ধের পর হালনাগাদ" />
        )}
      </p>
      <h2 id="fu-sum-t" className="fu-sum-big">
        <span className="fu-sum-n nums">
          {n}
          <T en="" bn="টি" />
        </span>
        <span className="fu-sum-label">
          <T en={n === 1 ? "company picked for you" : "companies picked for you"} bn="কোম্পানি, আপনার জন্য বাছাই করা" />
        </span>
      </h2>
      {groups.length > 0 && (
        <>
          <p className="fu-sum-from">
            {anchors > 0 ? (
              <T
                en={`From ${anchors} of your shares${groups.length > anchors ? ", and a gap in your money" : ""}:`}
                bn={`আপনার ${anchors}টি শেয়ার থেকে${groups.length > anchors ? ", আর আপনার টাকার একটি ফাঁক থেকে" : ""}:`}
              />
            ) : (
              <T en="From a gap in your money:" bn="আপনার টাকার একটি ফাঁক থেকে:" />
            )}
          </p>
          <ul className="fu-anchors">
            {groups.map((g) => {
              const label = g.anchor ?? null;
              const inner = (
                <>
                  {label ? <b>{label}</b> : <b><T en="Gap" bn="ফাঁক" /></b>}
                  <span>
                    {g.rel === "own" ? (
                      <T en="own" bn="কেনা" />
                    ) : g.rel === "follow" ? (
                      <T en="follow" bn="ফলো" />
                    ) : g.rel === "read" ? (
                      <T en="read" bn="দেখা" />
                    ) : null}
                    {g.rel !== "gap" && " · "}
                    <span className="nums">{g.n}</span>
                  </span>
                </>
              );
              return (
                <li key={g.key}>
                  {linkGroups ? (
                    <a href={`#fu-g-${g.key}`} className="fu-anchor">
                      {inner}
                    </a>
                  ) : (
                    <span className="fu-anchor">{inner}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
      {fresh > 0 && (
        <p className="fu-sum-new">
          <T en={`${fresh} new since yesterday`} bn={`গতকালের পর ${fresh}টি নতুন`} />
        </p>
      )}
    </section>
  );
}

/** One of the reader's shares and what it led to. `open` = Premium (names);
 *  closed = each pick's business behind a lock, never its name. */
export function ForYouGroupCard({
  group,
  picks,
  open,
  onHide,
  lockHref,
}: {
  group: ForYouGroup;
  picks: ForYouPick[];
  open: boolean;
  onHide?: (p: ForYouPick) => void;
  lockHref: string;
}) {
  return (
    <section id={`fu-g-${group.key}`} className="fu-group soft-card" aria-label={group.anchor ?? group.line.en}>
      <header className="fu-g-head">
        <div className="fu-g-top">
          <RelBadge g={group} />
          {group.anchor && (
            <Link prefetch={false} href={`/stock/${group.anchor}`} className="fu-g-anchor">
              {group.anchor}
            </Link>
          )}
          <span className="fu-g-count nums">
            <T en={`${group.n} ${group.n === 1 ? "company" : "companies"}`} bn={`${group.n}টি কোম্পানি`} />
          </span>
        </div>
        <p className="fu-g-line">
          <T en={group.line.en} bn={group.line.bn} />
        </p>
      </header>
      {open ? (
        <ul className="fu-rows">
          {picks.map((p) => (
            <PickRow key={p.code} pick={p} onHide={onHide} />
          ))}
        </ul>
      ) : (
        <ul className="fu-rows">
          {group.sectors.map((s, i) => (
            <li key={i}>
              <a href={lockHref} className="fu-masked" aria-label="Premium">
                <span className="fu-lock" aria-hidden="true">
                  <IconLock size={13} />
                </span>
                <span className="fu-bar" style={{ width: `${[52, 38, 46][i % 3]}%` }} aria-hidden="true" />
                <span className="fu-biz">
                  <T en={s.en} bn={s.bn || sectorBn(s.en)} />
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** One company, as a Premium reader (or the starter list) sees it: why it
 *  fits them, what it shares, then read · follow · not for me. */
export function PickRow({ pick, onHide }: { pick: ForYouPick; onHide?: (p: ForYouPick) => void }) {
  return (
    <li id={`pick-${pick.code}`} className="fu-pick">
      <div className="fu-pick-top">
        <div className="min-w-0">
          <Link prefetch={false} href={`/stock/${pick.code}`} className="fu-pick-name">
            {pick.name || pick.code}
          </Link>
          <p className="fu-pick-code">
            {pick.code}
            {pick.sector && (
              <>
                <span aria-hidden="true"> · </span>
                <T en={pick.sector} bn={pick.sector_bn || sectorBn(pick.sector)} />
              </>
            )}
          </p>
        </div>
        <p className="fu-pick-px">
          <span className="nums">{money(pick.price)}</span>
          {pick.change_pct != null && (
            <span className={`nums ${changeTone(pick.change_pct)}`}>{changePct(pick.change_pct)}</span>
          )}
        </p>
      </div>
      <p className="fu-tags">
        <span className={`fu-tag ${pick.kind === "starter" ? "fu-tag--quiet" : ""}`}>
          <T en={pick.tag_en} bn={pick.tag_bn} />
        </span>
        {pick.new && (
          <span className="fu-tag fu-tag--new">
            <T en="New" bn="নতুন" />
          </span>
        )}
      </p>
      <p className="fu-why">
        <T en={pick.why_en} bn={pick.why_bn} />
      </p>
      {pick.chips.length > 0 && (
        <ul className="fu-chips">
          {pick.chips.map((c) => (
            <li key={c.en} className={`fu-chip ${c.tone === "neutral" ? "fu-chip--n" : ""}`}>
              {c.tone !== "neutral" && <IconCheck size={12} />}
              <T en={c.en} bn={c.bn} />
            </li>
          ))}
        </ul>
      )}
      <div className="fu-acts">
        <Link prefetch={false} href={`/stock/${pick.code}#ch-analysis`} className="fu-read" data-pick={pick.code}>
          <T en="Read our analysis" bn="বিশ্লেষণ পড়ুন" />
          <IconArrowRight size={14} />
        </Link>
        <span className="fu-follow">
          <T en="Follow" bn="ফলো" />
          <StarButton code={pick.code} />
        </span>
        {onHide && (
          <button type="button" className="fu-hide" onClick={() => onHide(pick)}>
            <T en="Not for me" bn="আমার জন্য নয়" />
          </button>
        )}
      </div>
    </li>
  );
}

/** Strong, well-known companies to start with — free for every reader. */
export function StarterList({
  picks,
  title,
  lead,
  actions,
  onHide,
}: {
  picks: ForYouPick[];
  title: ReactNode;
  lead: ReactNode;
  actions?: ReactNode;
  onHide?: (p: ForYouPick) => void;
}) {
  if (picks.length === 0) return null;
  return (
    <section className="fu-group soft-card" aria-labelledby="fu-start-t">
      <header className="fu-g-head">
        <h2 id="fu-start-t" className="fu-start-title">
          {title}
        </h2>
        <p className="fu-g-line">{lead}</p>
        {actions}
      </header>
      <ul className="fu-rows">
        {picks.map((p) => (
          <PickRow key={p.code} pick={p} onHide={onHide} />
        ))}
      </ul>
    </section>
  );
}
