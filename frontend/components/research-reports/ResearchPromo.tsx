"use client";

import type { ReactNode } from "react";
import { T } from "@/components/i18n/T";
import PremiumCard, { PremiumTicks } from "@/components/premium/PremiumCard";
import type { Bi } from "@/lib/research-reports";

/**
 * THE Premium card on a research report (2026-11-05). The dividend calendar's
 * card, made generic: the report's name and promise, one free taste (a
 * figure or an example the page already gives away), what Premium shows as
 * plain ticks, the price and one button. Never the report's answers.
 */
export default function ResearchPromo({
  anchor,
  lock,
  name,
  title,
  lead,
  taste,
  gets,
}: {
  anchor: string;
  /** GA lock label, e.g. "research-risks". */
  lock: string;
  name: Bi;
  title: Bi;
  lead: Bi;
  taste?: ReactNode;
  gets: Bi[];
}) {
  return (
    <PremiumCard
      anchor={anchor}
      area="research"
      lock={lock}
      src={lock}
      className="rr-promo"
      tag={{ en: `Research · ${name.en}`, bn: `গবেষণা · ${name.bn}` }}
      title={<T en={title.en} bn={title.bn} />}
      lead={<T en={lead.en} bn={lead.bn} />}
      cta={{ en: "Read the full report", bn: "পুরো প্রতিবেদন পড়ুন" }}
      context={{ label: name, stakes: gets.slice(0, 3) }}
    >
      {taste}
      <PremiumTicks items={gets} />
    </PremiumCard>
  );
}
