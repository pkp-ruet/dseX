"use client";

import Button from "@/components/ui/Button";
import Bn from "@/components/i18n/Bn";
import { IconLock } from "@/components/home/personalized/DashIcons";
import { useLang } from "@/context/LangContext";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";

/**
 * The one "this is Premium" card. What it asks depends on the reader:
 * guest → sign up free · free account → start the free month · month used →
 * paid plans are coming. `compact` is the one-line version for small spots
 * ("+3 more good signs").
 */
export default function PremiumLockCard({
  label,
  compact = false,
}: {
  /** What sits behind the lock, e.g. "The fair-value estimate". */
  label?: string;
  compact?: boolean;
}) {
  const { bn } = useLang();
  const { state, startTrial, starting } = usePremium();

  const title = bn
    ? "এটি প্রিমিয়ামের অংশ"
    : label
      ? `${label} is part of Premium`
      : "This is part of Premium";

  const line =
    state === "ended"
      ? { en: "Your free month has ended. Paid plans are coming soon.", bn: "আপনার ফ্রি মাস শেষ হয়েছে। পেইড প্ল্যান শিগগিরই আসছে।" }
      : state === "guest"
        ? { en: "Open a free account, then try Premium free for 1 month.", bn: "বিনামূল্যে অ্যাকাউন্ট খুলুন, তারপর 1 মাস প্রিমিয়াম ফ্রি ব্যবহার করুন।" }
        : { en: "Try it free for 1 month. No payment needed.", bn: "1 মাস বিনামূল্যে ব্যবহার করুন। কোনো পেমেন্ট লাগবে না।" };

  const action =
    state === "guest" ? (
      <Button href="/register" size={compact ? "sm" : "md"}>
        {bn ? "ফ্রি অ্যাকাউন্ট খুলুন" : "Sign up free"}
      </Button>
    ) : state === "trial_available" ? (
      <Button onClick={() => void startTrial()} disabled={starting} size={compact ? "sm" : "md"}>
        {bn ? "ফ্রি মাস শুরু করুন" : "Start my free month"}
      </Button>
    ) : (
      <Button href={PREMIUM_PATH} variant="quiet" size={compact ? "sm" : "md"}>
        {bn ? "প্রিমিয়ামে কী আছে" : "What's in Premium"}
      </Button>
    );

  if (state === "premium") return null;

  if (compact) {
    return (
      <div className="premium-card premium-card-compact">
        <span className="premium-card-icon" aria-hidden="true"><IconLock size={14} /></span>
        <p className={`flex-1 text-sm text-text-main ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
          {label && !bn ? `${label} · ` : ""}{bn ? line.bn : line.en}
        </p>
        {action}
      </div>
    );
  }

  return (
    <div className="premium-card" role="note">
      <span className="premium-card-icon" aria-hidden="true"><IconLock size={18} /></span>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-text-main ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
          {title}
        </p>
        {bn ? (
          <Bn className="text-sm text-text-muted">{line.bn}</Bn>
        ) : (
          <>
            <p className="text-sm text-text-muted">{line.en}</p>
            <Bn className="text-sm text-text-muted">{line.bn}</Bn>
          </>
        )}
      </div>
      <div className="premium-card-action">{action}</div>
    </div>
  );
}
