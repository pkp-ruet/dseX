import Link from "next/link";
import type { DailyTip } from "@/lib/api";
import RecommendCard from "@/components/home/personalized/RecommendCard";
import DailyTipItem from "@/components/daily-tips/DailyTipItem";

const BULB = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M9 21h6v-1H9v1zm3-20a7 7 0 0 0-4 12.7V17h8v-3.3A7 7 0 0 0 12 1z" />
  </svg>
);

interface Props {
  tips: DailyTip[];
}

const TEASER_COUNT = 3;

export default function DailyTipsCard({ tips }: Props) {
  if (!tips || tips.length === 0) return null;

  const visible = tips.slice(0, TEASER_COUNT);

  return (
    <RecommendCard accent="#0D9488" icon={BULB} title="Daily Tips" subtitle="Fresh signals every day" prominent>
      <div className="flex flex-col gap-2.5">
        {visible.map((tip) => (
          <DailyTipItem key={`${tip.category}-${tip.trading_code}`} tip={tip} compact />
        ))}
      </div>

      <Link
        href="/daily-tips"
        className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2.5 text-[0.8rem] font-bold text-[#0D9488] transition hover:bg-[color-mix(in_srgb,#0D9488_8%,var(--surface))]"
      >
        {tips.length > TEASER_COUNT ? `See all ${tips.length} tips` : "Open all tips"}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </Link>
    </RecommendCard>
  );
}
