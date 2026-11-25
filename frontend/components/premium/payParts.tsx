"use client";

import type { ReactNode } from "react";
import { T } from "@/components/i18n/T";
import type { PremiumPayment } from "@/lib/api";
import { METHOD_BN, METHOD_LABEL, TRANSFER_LABEL } from "@/lib/premium-plans";

/** "bKash" / "Nagad" in English, বিকাশ / নগদ / ব্যাংক ট্রান্সফার in Bengali. */
export function MethodName({ method }: { method: string }) {
  const en = METHOD_LABEL[method] ?? method;
  const bn = METHOD_BN[method];
  return bn ? <T en={en} bn={bn} /> : <>{en}</>;
}

/** Where the money came from: the mobile number, or the transfer type and the
 *  account's last 4 digits. */
export function PaidFrom({ p }: { p: PremiumPayment }): ReactNode {
  if (p.method !== "bank") return p.sender;
  const how = TRANSFER_LABEL[p.transfer ?? ""] ?? "";
  const last4 = p.account_last4 ?? "";
  return <T en={`${how} · account ending ${last4}`} bn={`${how} · অ্যাকাউন্টের শেষ 4 সংখ্যা ${last4}`} />;
}
