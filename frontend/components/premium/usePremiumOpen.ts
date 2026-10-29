"use client";

import { useEffect, useState } from "react";
import { useLockScope } from "@/components/premium/LockScope";
import { usePremium } from "@/lib/premium";

/** True once the reader may see Premium content here: a Premium reader, or a
 *  page the lock scope opened (the free report of the day, a report key).
 *  False on the server and the first paint — the server knows no user. */
export function usePremiumOpen(): boolean {
  const { isPremium } = usePremium();
  const scope = useLockScope();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && (isPremium || !!scope?.unlocked);
}
