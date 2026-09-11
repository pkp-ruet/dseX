"use client";

import { useEffect, useState } from "react";
import { daysBetween, toDate, todayDhaka } from "@/lib/dividend-dates";

interface Props {
  /** ISO date the countdown targets. */
  date: string;
  /** What to print after the number, e.g. "to buy". */
  suffix?: string;
  /** Printed when the date has passed. */
  past?: string;
  className?: string;
}

/**
 * "12 days left" computed on the client, so the ISR-cached page can be a day
 * old without the countdown being a day wrong. Renders nothing until mounted.
 */
export default function DaysLeft({ date, suffix = "left", past = "passed", className = "" }: Props) {
  const [days, setDays] = useState<number | null>(null);

  useEffect(() => {
    const d = toDate(date);
    if (!d) return;
    setDays(daysBetween(todayDhaka(), d));
  }, [date]);

  if (days == null) return null;
  if (days < 0) return <span className={className}>{past}</span>;
  if (days === 0) return <span className={className}>today</span>;
  return (
    <span className={className}>
      {days} {days === 1 ? "day" : "days"} {suffix}
    </span>
  );
}
