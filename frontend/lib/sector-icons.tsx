/**
 * Sector → small stroked SVG icon (`currentColor`, 24-unit grid, 2px stroke —
 * the same style as `components/stock/StockIcons.tsx` and the dashboard's
 * `DashIcons.tsx`). No emoji: they rendered differently on every phone, which
 * is why the dashboard and the stock page banned them; the market pages follow.
 *
 * Keyword-based so it tolerates both the plain names the backend sends
 * ("Banks", "Power & gas", "Phone & internet"…) and any raw DSE sector.
 * `sectorIconKey` returns null when nothing matches, so callers can fall back
 * (e.g. to the first letter of the trading code).
 */

export type SectorIconKey =
  | "bank"
  | "finance"
  | "fund"
  | "medicine"
  | "power"
  | "engineering"
  | "food"
  | "clothing"
  | "tech"
  | "phone"
  | "cement"
  | "insurance"
  | "leather"
  | "ceramics"
  | "jute"
  | "paper"
  | "property"
  | "travel"
  | "bond";

export function sectorIconKey(sector?: string | null): SectorIconKey | null {
  if (!sector) return null;
  const s = sector.toLowerCase();
  if (s.includes("bank")) return "bank";
  if (s.includes("financ")) return "finance";
  if (s.includes("fund")) return "fund";
  if (s.includes("pharma") || s.includes("medicine") || s.includes("chemical")) return "medicine";
  if (s.includes("power") || s.includes("fuel") || s.includes("gas") || s.includes("energy")) return "power";
  if (s.includes("engineer")) return "engineering";
  if (s.includes("food")) return "food";
  if (s.includes("textile") || s.includes("cloth")) return "clothing";
  if (s.includes("tech") || s.includes("information") || s === "it" || s.startsWith("it ")) return "tech";
  if (s.includes("phone") || s.includes("telecom")) return "phone";
  if (s.includes("cement")) return "cement";
  if (s.includes("insur")) return "insurance";
  if (s.includes("leather") || s.includes("tann")) return "leather";
  if (s.includes("ceramic")) return "ceramics";
  if (s.includes("jute")) return "jute";
  if (s.includes("paper") || s.includes("print")) return "paper";
  if (s.includes("service") || s.includes("propert") || s.includes("real estate")) return "property";
  if (s.includes("travel") || s.includes("leisure")) return "travel";
  if (s.includes("bond") || s.includes("debenture")) return "bond";
  return null;
}

/** Path data per icon — one or more `d` strings drawn with the shared stroke. */
const PATHS: Record<SectorIconKey, string[]> = {
  bank: ["M3 21h18", "M5 21V10M9 21V10M15 21V10M19 21V10", "M2 10l10-6 10 6"],
  finance: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z", "M12 7v10", "M9.5 9.5h3.5a1.75 1.75 0 0 1 0 3.5h-2a1.75 1.75 0 0 0 0 3.5H15"],
  fund: ["M12 3a9 9 0 1 0 9 9h-9V3z", "M15 3.5A9 9 0 0 1 20.5 9H15V3.5z"],
  medicine: ["M10.5 20.5 3.5 13.5a4.95 4.95 0 0 1 7-7l7 7a4.95 4.95 0 0 1-7 7z", "M8.5 15.5l7-7"],
  power: ["M13 2 4 14h7l-1 8 9-12h-7l1-8z"],
  engineering: ["M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z", "M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"],
  food: ["M4 11h16a8 8 0 0 1-16 0z", "M8 11c0-3 1-5 4-7 3 2 4 4 4 7"],
  clothing: ["M20.4 7 16 3h-2a2 2 0 0 1-4 0H8L3.6 7l2.4 3 2-1v12h8V9l2 1 2.4-3z"],
  tech: ["M3 5h18v12H3z", "M2 20h20"],
  phone: ["M7 2h10v20H7z", "M11 18h2"],
  cement: ["M3 5h18v14H3z", "M3 10h18M3 14.5h18", "M9 5v5M15 10v4.5M9 14.5V19"],
  insurance: ["M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z"],
  leather: ["M6 8h12l1 13H5L6 8z", "M9 8V6a3 3 0 0 1 6 0v2"],
  ceramics: ["M9 3h6l-1 4 3 3v8a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3v-8l3-3-1-4z"],
  jute: ["M12 22V10", "M12 14c-4 0-7-3-7-7 4 0 7 3 7 7z", "M12 10c0-4 3-7 7-7 0 4-3 7-7 7z"],
  paper: ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z", "M14 2v6h6", "M8 13h8M8 17h8"],
  property: ["M4 2h16v20H4z", "M9 22v-4h6v4", "M8 6h2M14 6h2M8 10h2M14 10h2M8 14h2M14 14h2"],
  travel: [
    "M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z",
  ],
  bond: ["M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4", "M19 17V5a2 2 0 0 0-2-2H4", "M15 8h-5M15 12h-5"],
};

export function SectorIcon({
  sector,
  size = 20,
  className,
}: {
  sector?: string | null;
  size?: number;
  className?: string;
}) {
  const key = sectorIconKey(sector);
  if (!key) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {PATHS[key].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
