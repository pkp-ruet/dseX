"use client";

import type { ReactNode } from "react";
import Link from "@/components/ui/Link";
import type { ForYou, ForYouGroup, ForYouPick } from "@/lib/api";
import { changePct, changeTone, formatDate, money } from "@/lib/formatters";
import { bnDate, sectorBn } from "@/lib/bn";
import { T } from "@/components/i18n/T";
import StarButton from "@/components/ui/StarButton";
import { IconArrowRight, IconCheck, IconEye, IconLock } from "@/components/ui/icons";

/**
 * The parts of "Based on your shares" (`/for-you`, was Discover until
 * 2026-11-18). Clean pass the same day (user: "the whole page is looking
 * messy … make it simple, clean and premium looking"): one intro card, then
 * one section per share of the reader's — its heading ("Because you own
 * ACI") and reason on the page, then each company in its own card (user:
 * "companies are mixing with each other. need more separation"). One
 * accent (clay) for links, gold only for Premium, green only for "New" and
 * ticks. No badges, tags or tinted bands. Styles `fu-*` in
 * `app/styles/picks.css`.
 */

/** The note every reader sees. Reworded the same day it was added: "To
 *  watch next, not to buy now" read as "you can't buy this now", and a link
 *  to the Buy List was confusing. */
const NOTE = {
  en: "These companies are like the shares you chose. Read about them and follow the ones you like.",
  bn: "এগুলো আপনার বেছে নেওয়া শেয়ারের মতো কোম্পানি। পড়ে দেখুন, ভালো লাগলে ফলো করুন।",
};

/** "Worth a look · Updated after the close, 18 Nov 2026". */
function IntroEyebrow({ asOf }: { asOf?: string | null }) {
  return (
    <p className="fu-eyebrow">
      <IconEye size={15} />
      <T en="Worth a look" bn="দেখে রাখার মতো" />
      {asOf && (
        <span className="fu-eyebrow-date">
          <T en={` · Updated ${formatDate(asOf)}`} bn={` · হালনাগাদ ${bnDate(asOf)}`} />
        </span>
      )}
    </p>
  );
}

/** The top card: how many we picked, the note, and the reader's shares they
 *  came from. Without `data` (guest, starter list) only the eyebrow and note. */
export function ForYouIntro({
  data,
  linkGroups = false,
  children,
}: {
  data?: ForYou | null;
  linkGroups?: boolean;
  children?: ReactNode;
}) {
  const groups = data?.groups ?? [];
  const n = data ? (data.counts?.total ?? data.items.length) : 0;
  const anchors = groups.filter((g) => g.anchor).length;
  const fresh = data ? (data.counts?.new ?? data.new ?? 0) : 0;
  const counted = groups.length > 0;

  return (
    <section className="fu-intro soft-card" aria-labelledby="fu-intro-t">
      <IntroEyebrow asOf={data?.as_of} />
      {counted ? (
        <h2 id="fu-intro-t" className="fu-intro-h">
          <T
            en={`${n} ${n === 1 ? "company" : "companies"} picked for you`}
            bn={`আপনার জন্য বাছাই করা ${n}টি কোম্পানি`}
          />
        </h2>
      ) : (
        <h2 id="fu-intro-t" className="sr-only">
          <T en="Worth a look" bn="দেখে রাখার মতো" />
        </h2>
      )}
      <p className="fu-intro-note">
        <T en={NOTE.en} bn={NOTE.bn} />
      </p>

      {counted && (
        <div className="fu-intro-from">
          <p className="fu-intro-k">
            {anchors > 0 ? (
              <T
                en={`From ${anchors} of your ${anchors === 1 ? "share" : "shares"}`}
                bn={`আপনার ${anchors}টি শেয়ার থেকে`}
              />
            ) : (
              <T en="From your money" bn="আপনার টাকার হিসাব থেকে" />
            )}
            {fresh > 0 && (
              <span className="fu-new-dot">
                <T en={` · ${fresh} new today`} bn={` · আজ ${fresh}টি নতুন`} />
              </span>
            )}
          </p>
          <ul className="fu-chips-row">
            {groups.map((g) => {
              const label = g.anchor ? g.anchor : <T en="Your money" bn="আপনার টাকা" />;
              return (
                <li key={g.key}>
                  {linkGroups ? (
                    <a href={`#fu-g-${g.key}`} className="fu-share">
                      {label}
                    </a>
                  ) : (
                    <span className="fu-share">{label}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {children}
    </section>
  );
}

/** The section heading says why, in the reader's own terms. */
function groupTitle(g: ForYouGroup): { en: string; bn: string } {
  const a = g.anchor ?? "";
  switch (g.rel) {
    case "own":
      return { en: `Because you own ${a}`, bn: `যেহেতু আপনার কাছে ${a} আছে` };
    case "follow":
      return { en: `Because you follow ${a}`, bn: `যেহেতু আপনি ${a} ফলো করেন` };
    case "read":
      return g.days && g.days >= 2
        ? { en: `Because you looked at ${a} on ${g.days} days`, bn: `যেহেতু আপনি ${g.days} দিন ${a} দেখেছেন` }
        : { en: `Because you looked at ${a}`, bn: `যেহেতু আপনি সম্প্রতি ${a} দেখেছেন` };
    default:
      return { en: "To fill a gap in your money", bn: "আপনার টাকার একটি ফাঁক পূরণে" };
  }
}

/** A section's heading on the page: title, count, reason. */
function SectionHead({
  id,
  title,
  count,
  line,
  children,
}: {
  id: string;
  title: ReactNode;
  count?: number;
  line: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="fu-sec-head">
      <div className="fu-sec-top">
        <h2 id={id} className="fu-sec-title">
          {title}
        </h2>
        {count != null && (
          <span className="fu-sec-count nums">
            <T en={`${count}`} bn={`${count}টি`} />
          </span>
        )}
      </div>
      <p className="fu-sec-line">{line}</p>
      {children}
    </header>
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
  const t = groupTitle(group);
  const headId = `fu-g-${group.key}-t`;
  return (
    <section id={`fu-g-${group.key}`} className="fu-sec" aria-labelledby={headId}>
      <SectionHead
        id={headId}
        title={<T en={t.en} bn={t.bn} />}
        count={group.n}
        line={<T en={group.line.en} bn={group.line.bn} />}
      />
      {open ? (
        <ul className="fu-cards">
          {picks.map((p) => (
            <PickRow key={p.code} pick={p} onHide={onHide} />
          ))}
        </ul>
      ) : (
        <ul className="fu-list soft-card">
          {group.sectors.map((s, i) => (
              <li key={i}>
                <a href={lockHref} className="fu-locked">
                  <IconLock size={15} />
                  <span className="min-w-0 flex-1">
                    <T
                      en={`A company in ${s.en}`}
                      bn={`${s.bn || sectorBn(s.en)} সেক্টরের একটি কোম্পানি`}
                    />
                  </span>
                  <span className="fu-locked-tag">
                    <T en="Premium" bn="প্রিমিয়াম" />
                  </span>
                </a>
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}

/** One company: name and price, why it fits, what it shares, then read ·
 *  follow · not for me. */
export function PickRow({ pick, onHide }: { pick: ForYouPick; onHide?: (p: ForYouPick) => void }) {
  return (
    <li id={`pick-${pick.code}`} className="fu-pick soft-card">
      <div className="fu-pick-top">
        <div className="min-w-0 flex-1">
          <p className="fu-pick-name">
            <Link prefetch={false} href={`/stock/${pick.code}`}>
              {pick.name || pick.code}
            </Link>
            {pick.new && (
              <span className="fu-new">
                <T en="New" bn="নতুন" />
              </span>
            )}
          </p>
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
      <p className="fu-why">
        <T en={pick.why_en} bn={pick.why_bn} />
      </p>
      {pick.chips.length > 0 && (
        <div className="fu-common">
          {pick.chips_label && (
            <p className="fu-common-k">
              <T en={pick.chips_label.en} bn={pick.chips_label.bn} />
            </p>
          )}
          <ul className="fu-traits">
            {pick.chips.map((c) => (
              <li key={c.en}>
                {c.tone !== "neutral" && (
                  <span className="fu-tick" aria-hidden="true">
                    <IconCheck size={12} />
                  </span>
                )}
                <T en={c.en} bn={c.bn} />
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="fu-acts">
        <Link prefetch={false} href={`/stock/${pick.code}#ch-analysis`} className="fu-read" data-pick={pick.code}>
          <T en="Read our analysis" bn="বিশ্লেষণ পড়ুন" />
          <IconArrowRight size={14} />
        </Link>
        <span className="fu-acts-end">
          {onHide && (
            <button type="button" className="fu-hide" onClick={() => onHide(pick)}>
              <T en="Not for me" bn="আমার জন্য নয়" />
            </button>
          )}
          <span className="fu-follow">
            <T en="Follow" bn="ফলো" />
            <StarButton code={pick.code} />
          </span>
        </span>
      </div>
    </li>
  );
}

/** A list with its own heading (the starter list, the guest card's sample). */
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
    <section className="fu-sec" aria-labelledby="fu-start-t">
      <SectionHead id="fu-start-t" title={title} line={lead}>
        {actions}
      </SectionHead>
      <ul className="fu-cards">
        {picks.map((p) => (
          <PickRow key={p.code} pick={p} onHide={onHide} />
        ))}
      </ul>
    </section>
  );
}
