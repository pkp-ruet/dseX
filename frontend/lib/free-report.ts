/**
 * The free full report of the day (2026-10-25): one familiar company whose
 * stock page opens completely — every Premium part — for everyone, all day
 * (Dhaka calendar date). Free readers get to see what they would pay for.
 *
 * A plain module (no "use client"): the landing page picks it on the server,
 * the stock page and the dashboard on the client, and all three must agree, so
 * it is a pure function of the date over a fixed list. The stock page is ISR
 * for a day, which is why the unlock is decided in the browser.
 */
import { FAMILIAR } from "@/lib/landing";
import { bstDateStr } from "@/lib/market-hours";

export function freeReportCode(dateIso: string = bstDateStr()): string {
  const day = Math.floor(Date.parse(`${dateIso}T00:00:00Z`) / 86_400_000);
  const n = FAMILIAR.length;
  return FAMILIAR[((day % n) + n) % n];
}

export function isFreeReport(code: string, dateIso?: string): boolean {
  return code.toUpperCase() === freeReportCode(dateIso);
}
