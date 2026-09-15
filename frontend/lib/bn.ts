/**
 * Small Bengali copy helpers for server-rendered Bengali pages (`/share-bazar`).
 *
 * Numbers stay in Western digits on purpose — see `components/i18n/Bn.tsx`:
 * Bengali numeral glyphs do not render reliably on every phone the audience
 * uses, so "5,472" is written as-is inside Bengali prose.
 */

const BN_MONTHS = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
];
const BN_WEEKDAYS = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];

/** "15 সেপ্টেম্বর 2026" from an ISO date string; "" when absent/invalid. */
export function bnDate(iso: string | null | undefined, withWeekday = false): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return "";
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (Number.isNaN(d.getTime())) return "";
  const core = `${d.getUTCDate()} ${BN_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  return withWeekday ? `${BN_WEEKDAYS[d.getUTCDay()]}, ${core}` : core;
}

/** DSE sector names in everyday Bengali. Unknown names fall back to English. */
const SECTOR_BN: Record<string, string> = {
  Bank: "ব্যাংক",
  "Financial Institutions": "আর্থিক প্রতিষ্ঠান",
  NBFI: "আর্থিক প্রতিষ্ঠান",
  Insurance: "বিমা",
  "Life Insurance": "জীবন বিমা",
  "General Insurance": "সাধারণ বিমা",
  "Pharmaceuticals & Chemicals": "ওষুধ ও রাসায়নিক",
  Pharmaceuticals: "ওষুধ",
  Textile: "বস্ত্র",
  Engineering: "প্রকৌশল",
  "Food & Allied": "খাদ্য",
  "Fuel & Power": "জ্বালানি ও বিদ্যুৎ",
  Cement: "সিমেন্ট",
  IT: "আইটি",
  "IT Sector": "আইটি",
  Telecommunication: "টেলিযোগাযোগ",
  Ceramics: "সিরামিক",
  "Ceramics Sector": "সিরামিক",
  Tannery: "চামড়া",
  "Tannery Industries": "চামড়া",
  "Paper & Printing": "কাগজ ও মুদ্রণ",
  "Services & Real Estate": "সেবা ও আবাসন",
  "Travel & Leisure": "পর্যটন ও বিনোদন",
  Jute: "পাট",
  Miscellaneous: "বিবিধ",
  "Mutual Funds": "মিউচুয়াল ফান্ড",
  "Corporate Bond": "কর্পোরেট বন্ড",
  "Debenture": "ডিবেঞ্চার",
};

export function sectorBn(name: string | null | undefined): string {
  if (!name) return "";
  return SECTOR_BN[name] ?? name;
}

/** "+1.7%" / "-0.4%" with Western digits; "—" when null. */
export function bnSignedPct(v: number | null | undefined, decimals = 1): string {
  if (v == null || Number.isNaN(v)) return "—";
  const s = v.toFixed(decimals);
  return `${v > 0 ? "+" : ""}${s}%`;
}

/** Whole number with thousands separators (Western digits). */
export function bnInt(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  return Math.round(v).toLocaleString("en-US");
}

/** Taka in crore from a value in millions: 12,345 mn → "1,235 কোটি টাকা". */
export function bnCroreTaka(valueMn: number | null | undefined): string {
  if (valueMn == null || Number.isNaN(valueMn)) return "—";
  const cr = valueMn / 10;
  const txt = cr >= 100 ? Math.round(cr).toLocaleString("en-US") : cr.toFixed(1);
  return `${txt} কোটি টাকা`;
}
