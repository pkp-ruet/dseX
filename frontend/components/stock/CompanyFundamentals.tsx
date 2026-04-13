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
      items: [
        ["Face Value", profile.face_value ? taka(profile.face_value) : "--"],
        ["Total Shares", profile.total_shares ? millions(profile.total_shares) : "--"],
        ["Paid-up Capital", profile.paid_up_capital_mn ? millions(profile.paid_up_capital_mn) + " (mn)" : "--"],
      ],
    },
    {
      title: "Balance Sheet",
      items: [
        ["Reserve & Surplus", profile.reserve_surplus_mn ? millions(profile.reserve_surplus_mn) + " (mn)" : "--"],
        ["Total Loan", profile.total_loan_mn ? millions(profile.total_loan_mn) + " (mn)" : "--"],
      ],
    },
    {
      title: "Listing Info",
      items: [
        ["Market Category", profile.market_category ?? "--"],
      ],
    },
  ];

  return (
    <div className="grid sm:grid-cols-3 gap-3">
      {groups.map((g) => (
        <div key={g.title} className="rounded-[var(--radius)] border border-[var(--border)] bg-white p-3">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
            {g.title}
          </p>
          <div className="space-y-1.5">
            {g.items.map(([label, value]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
