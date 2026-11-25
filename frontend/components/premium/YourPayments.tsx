"use client";

import { T } from "@/components/i18n/T";
import type { PremiumPayment } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import { bnDate } from "@/lib/bn";
import { SECTIONS } from "@/lib/premium-copy";
import { planByKey } from "@/lib/premium-plans";
import { MethodName } from "@/components/premium/payParts";

const STATUS: Record<PremiumPayment["status"], { en: string; bn: string; tone: string }> = {
  pending: { en: "Being checked", bn: "যাচাই চলছে", tone: "text-text-muted" },
  accepted: { en: "Received", bn: "পাওয়া গেছে", tone: "text-positive" },
  revoked: { en: "Not found, so Premium was switched off", bn: "পাওয়া যায়নি, তাই প্রিমিয়াম বন্ধ করা হয়েছে", tone: "text-negative" },
};

/** The reader's past payments, under the questions on /premium. */
export default function YourPayments({ items }: { items: PremiumPayment[] }) {
  if (!items.length) return null;
  return (
    <div className="pm-pays">
      <h3 className="mb-2 text-base font-semibold text-text-main">
        <T en={SECTIONS.payments.en} bn={SECTIONS.payments.bn} />
      </h3>
      <ul className="soft-card divide-y divide-border overflow-hidden">
        {items.map((p) => {
          const s = STATUS[p.status];
          const pl = planByKey(p.plan);
          return (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3 text-sm">
              <span className="text-text-main tabular-nums">
                <T
                  en={`${p.created_at ? formatDate(p.created_at) : "—"} · ${pl?.name ?? p.plan}`}
                  bn={`${p.created_at ? bnDate(p.created_at) : "—"} · ${pl?.bn ?? p.plan}`}
                />
                {` · ৳${p.amount.toLocaleString("en-IN")} · `}
                <MethodName method={p.method} />
              </span>
              <span className={`font-semibold ${s.tone}`}>
                <T en={s.en} bn={s.bn} />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
