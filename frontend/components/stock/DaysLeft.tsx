"use client";

import { useEffect, useState } from "react";
import { daysBetween, toDate, todayDhaka } from "@/lib/dividend-dates";
import { T } from "@/components/i18n/T";

interface Props {
  /** ISO date the countdown targets. */
  date: string;
  /** `left` = "12 days left" · `buy` = "12 days left to buy". */
  kind?: "left" | "buy";
  className?: string;
}

/**
 * "12 days left" computed on the client, so the ISR-cached page can be a day
 * old without the countdown being a day wrong. Renders nothing until mounted.
 */
export default function DaysLeft({ date, kind = "left", className = "" }: Props) {
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    const d = toDate(date);
    if (!d) return;
    setDays(daysBetween(todayDhaka(), d));
  }, [date]);

  if (days == null) return null;
  if (days < 0) {
    return (
      <span className={className}>
        <T en="Date has passed" bn="তারিখ পার হয়ে গেছে" />
      </span>
    );
  }
  if (days === 0) {
    return (
      <span className={className}>
        {kind === "buy" ? <T en="Today is the last day" bn="আজই শেষ দিন" /> : <T en="Today" bn="আজ" />}
      </span>
    );
  }
  const unit = days === 1 ? "day" : "days";
  return (
    <span className={className}>
      {kind === "buy" ? (
        <T en={`${days} ${unit} left to buy`} bn={`কেনার জন্য আর ${days} দিন`} />
      ) : (
        <T en={`${days} ${unit} left`} bn={`আর ${days} দিন`} />
      )}
    </span>
  );
}
