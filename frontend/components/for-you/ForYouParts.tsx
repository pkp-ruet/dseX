"use client";

import type { ReactNode } from "react";
import type { ForYou } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import { bnDate } from "@/lib/bn";
import { T } from "@/components/i18n/T";
import { IconEye } from "@/components/ui/icons";

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

/** A section's heading on the page: title, count, reason. */
export function SectionHead({
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
