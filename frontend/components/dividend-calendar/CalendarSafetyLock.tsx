"use client";

import LockPanel from "@/components/premium/LockPanel";

/**
 * The dividend calendar's one lock line (2026-10-29, the Free vs Premium
 * plan): every list on the page is free; what Premium adds is "Is it safe?"
 * under each cash dividend, which `DividendRow` keeps hidden for free
 * readers. Nothing for Premium readers (`LockPanel` hides itself).
 */
export default function CalendarSafetyLock() {
  return (
    <div className="dc-lock-line">
      <LockPanel
        job="understand"
        card
        count={0}
        lock="Dividend calendar: is it safe"
        what={{ en: "Is each dividend safe?", bn: "প্রতিটি ডিভিডেন্ড কতটা নিরাপদ" }}
        title={{
          en: "Premium adds “Is it safe?” under every cash dividend: how much of its profit the company pays out, and whether it can keep paying",
          bn: "প্রিমিয়ামে প্রতিটি নগদ ডিভিডেন্ডের নিচে “কতটা নিরাপদ?”: কোম্পানি মুনাফার কত অংশ দেয়, আর দিয়ে যেতে পারবে কিনা",
        }}
      />
    </div>
  );
}
