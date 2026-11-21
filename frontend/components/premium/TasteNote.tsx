"use client";

import Link from "@/components/ui/Link";
import { IconCrown } from "@/components/ui/icons";
import type { Lang } from "@/context/LangContext";
import type { TasteState } from "@/lib/auth";
import { trackEvent } from "@/lib/track";

/**
 * The 7-day taste on the home page (THE Premium line, step 6): while it runs,
 * one calm note says Premium is open on the reader's shares, for how long, and
 * what that means; on the last two days it offers the yearly plan. Renders
 * nothing outside the taste.
 */
export default function TasteNote({ taste, lang }: { taste: TasteState | null | undefined; lang: Lang }) {
  if (!taste?.active) return null;
  const bn = lang === "bn";
  const n = taste.days_left;
  const ending = n <= 2;
  const title = bn
    ? n <= 1
      ? "আজ আপনার শেয়ারে প্রিমিয়ামের শেষ দিন"
      : `আপনার শেয়ারে প্রিমিয়াম খোলা আরও ${n} দিন`
    : n <= 1
      ? "Today is the last day of Premium on your shares"
      : `Premium is open on your shares for ${n} more days`;
  const points = bn
    ? ["আপনার শেয়ারের প্রতিটি খবর, এর মানে সহ", "সেদিন সন্ধ্যায় ফোনে খবর, আর সকাল 9টার ব্রিফ", "যত দরকার তত নজরের নিয়ম", "আপনার শেয়ারে কোন ডিভিডেন্ড, কত টাকা"]
    : [
        "Every update on your shares, with what it means",
        "A push the same evening, and the 9 AM brief",
        "As many watch rules as you need",
        "Which of your shares pay a dividend, and how much",
      ];
  return (
    <section className={`taste-note ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined} data-card="taste">
      <p className="taste-k">
        <IconCrown size={14} />
        {bn ? "7 দিনের প্রিমিয়াম, আপনার শেয়ারে" : "7 days of Premium on your shares"}
      </p>
      <h2 className="taste-h">{title}</h2>
      <ul className="taste-list">
        {points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <p className="taste-foot">
        {bn
          ? "আমাদের বিশ্লেষণ, কেনার তালিকা আর গবেষণা প্রিমিয়ামেই থাকে। আপনি যা সেট করেছেন, শেষ হলেও থেকে যাবে।"
          : "Our analysis, the Buy List and research stay Premium. Whatever you set now is kept when it ends."}
      </p>
      <div className="taste-acts">
        <Link href="/notifications" className="btn-quiet btn-sm" onClick={() => trackEvent("taste_tap", { action: "updates", left: n })}>
          {bn ? "আপনার আপডেট দেখুন" : "See your updates"}
        </Link>
        {ending && (
          <Link
            href="/premium?plan=yearly&src=taste#pay"
            className="btn-primary btn-sm"
            onClick={() => trackEvent("taste_tap", { action: "pay", left: n })}
          >
            {bn ? "প্রিমিয়াম রাখুন" : "Keep Premium"}
          </Link>
        )}
      </div>
    </section>
  );
}
