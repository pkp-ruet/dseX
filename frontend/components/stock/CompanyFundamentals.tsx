import SectionLabel from "@/components/ui/SectionLabel";
import { taka, millions } from "@/lib/formatters";
import type { CompanyProfile } from "@/lib/api";

interface Props {
  profile: CompanyProfile;
}

export default function CompanyFundamentals({ profile }: Props) {
  const groups = [
    {
      title: "Capital Structure",
      icon: "🏗️",
      color: "#0EA5E9",
      items: [
        ["Face Value", profile.face_value ? taka(profile.face_value) : "--"],
        ["Total Shares", profile.total_shares ? millions(profile.total_shares) : "--"],
        ["Paid-up Capital", profile.paid_up_capital_mn ? millions(profile.paid_up_capital_mn) + " mn" : "--"],
      ],
    },
    {
      title: "Balance Sheet",
      icon: "📋",
      color: "#34D399",
      items: [
        ["Reserve & Surplus", profile.reserve_surplus_mn ? millions(profile.reserve_surplus_mn) + " mn" : "--"],
        ["Total Loan", profile.total_loan_mn ? millions(profile.total_loan_mn) + " mn" : "--"],
      ],
    },
    {
      title: "Listing Info",
      icon: "🏷️",
      color: "#A78BFA",
      items: [
        ["Market Category", profile.market_category ?? "--"],
      ],
    },
  ];

  return (
    <div className="grid sm:grid-cols-3 gap-3">
      {groups.map((g) => (
        <div
          key={g.title}
          className="rounded-xl p-4"
          style={{
            background: "linear-gradient(135deg, #0D1A2E 0%, #0A1525 100%)",
            border: `1px solid ${g.color}20`,
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">{g.icon}</span>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: g.color }}>
              {g.title}
            </p>
          </div>
          <div className="space-y-2.5">
            {g.items.map(([label, value]) => (
              <div key={label} className="flex justify-between items-baseline gap-2">
                <span className="text-xs shrink-0" style={{ color: "#94A3B8" }}>{label}</span>
                <span className="text-sm font-bold text-right" style={{ color: "#E2E8F0" }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
