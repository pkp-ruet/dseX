"use client";

import Link from "next/link";
import type { ResearchChanges as Changes } from "@/lib/api";
import { useLang } from "@/context/LangContext";
import { formatDate } from "@/lib/formatters";
import { PersonalMark } from "@/components/market-analysis/PersonalCodes";
import { IconArrowDown, IconArrowUp } from "@/components/ui/icons";

/**
 * Who joined and who left since about a month ago, from the daily snapshots.
 * A leaver carries the check it now fails. Never a price move or a return —
 * no track-record claims, by rule.
 */
export default function ResearchChanges({ changes }: { changes: Changes }) {
  const { bn } = useLang();
  const t = (en: string, b: string) => (bn ? b : en);
  const fb = bn ? "font-bn" : undefined;

  if (!changes.since) {
    return (
      <p className={`text-sm text-text-muted ${fb ?? ""}`.trim()}>
        {changes.tracking_since
          ? t(
              `We started recording this list on ${formatDate(changes.tracking_since)}. Who joins and who leaves shows here from the next trading day.`,
              `এই তালিকা ${formatDate(changes.tracking_since)} থেকে রেকর্ড হচ্ছে। পরের কার্যদিবস থেকে কে যোগ হলো, কে বাদ পড়ল — এখানে দেখা যাবে।`,
            )
          : t(
              "We record this list every trading day. Who joins and who leaves shows here once the first days are in.",
              "এই তালিকা প্রতি কার্যদিবসে রেকর্ড হয়। প্রথম কয়েক দিনের হিসাব জমলেই কে যোগ হলো, কে বাদ পড়ল — এখানে দেখা যাবে।",
            )}
      </p>
    );
  }

  const quiet = changes.joined.length === 0 && changes.left.length === 0;
  return (
    <div className="rl-changes" lang={bn ? "bn" : undefined}>
      <p className={`text-sm text-text-muted ${fb ?? ""}`.trim()}>
        {quiet
          ? t(`No change since ${formatDate(changes.since)}.`, `${formatDate(changes.since)} থেকে কোনো পরিবর্তন নেই।`)
          : t(`Since ${formatDate(changes.since)}:`, `${formatDate(changes.since)} থেকে:`)}
      </p>
      {changes.joined.length > 0 && (
        <div>
          <p className="rl-changes-head text-positive">
            <IconArrowUp size={14} /> <span className={fb}>{t(`Joined (${changes.joined.length})`, `যোগ হয়েছে (${changes.joined.length})`)}</span>
          </p>
          <ul className="rl-changes-list">
            {changes.joined.map((j) => (
              <li key={j.code}>
                <Link prefetch={false} href={`/stock/${j.code}`} className="rl-changes-name">{j.name || j.code}</Link>
                <span className="rl-card-code">{j.code}<PersonalMark code={j.code} /></span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {changes.left.length > 0 && (
        <div>
          <p className="rl-changes-head text-negative">
            <IconArrowDown size={14} /> <span className={fb}>{t(`Left (${changes.left.length})`, `বাদ পড়েছে (${changes.left.length})`)}</span>
          </p>
          <ul className="rl-changes-list">
            {changes.left.map((l) => (
              <li key={l.code}>
                <Link prefetch={false} href={`/stock/${l.code}`} className="rl-changes-name">{l.name || l.code}</Link>
                <span className="rl-card-code">{l.code}<PersonalMark code={l.code} /></span>
                <span className={`rl-changes-why ${fb ?? ""}`.trim()}>{t(l.reason_en, l.reason_bn)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
