/** Format a number as ৳ currency (Bangladeshi Taka) */
export function taka(value: number | null | undefined, decimals = 2): string {
  if (value == null) return "--";
  return `৳${value.toFixed(decimals)}`;
}

/**
 * Group an integer the South-Asian way — last three digits, then pairs:
 *   234000 → "2,34,000" · 12500000 → "1,25,00,000".
 * This is how Bangladeshi users read money (lakh/crore), unlike en-US grouping
 * which would show "234,000". Rounds to a whole number and keeps the sign.
 */
export function bdGroup(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "--";
  const neg = value < 0;
  const digits = String(Math.round(Math.abs(value)));
  if (digits.length <= 3) return (neg ? "-" : "") + digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return (neg ? "-" : "") + rest + "," + last3;
}

/**
 * Taka amount with South-Asian digit grouping: 234000 → "৳2,34,000".
 * Use for personal money figures (portfolio value, P/L) so they read native.
 * A negative uses a proper minus sign (−) for display.
 */
export function takaGroup(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "--";
  return `${value < 0 ? "−" : ""}৳${bdGroup(Math.abs(value))}`;
}

/** Format a percentage value */
export function pct(value: number | null | undefined, decimals = 1): string {
  if (value == null) return "--";
  return `${value.toFixed(decimals)}%`;
}

/** Format a large number in millions */
export function millions(value: number | null | undefined): string {
  if (value == null) return "--";
  if (value >= 1000) return `${(value / 1000).toFixed(1)}B`;
  return `${value.toFixed(1)}M`;
}

/**
 * Format a money amount given in MILLIONS of BDT as crore (the standard
 * Bangladeshi unit). 1 crore = 10 million, so cr = mn / 10.
 *   26616.69 → "৳2,662 Cr" · 825.5 → "৳82.6 Cr" · 5 → "৳0.50 Cr"
 */
export function crore(valueMn: number | null | undefined): string {
  if (valueMn == null || isNaN(valueMn)) return "--";
  const cr = valueMn / 10;
  const abs = Math.abs(cr);
  const sign = cr < 0 ? "-" : "";
  if (abs >= 100) return `${sign}৳${Math.round(abs).toLocaleString("en-US")} Cr`;
  if (abs >= 1)   return `${sign}৳${abs.toFixed(1)} Cr`;
  return `${sign}৳${abs.toFixed(2)} Cr`;
}

/**
 * Format a raw share/unit count as crore. 1 crore = 10,000,000 (1e7).
 *   279_933_066 → "28.0 Cr" · 5_000_000 → "0.50 Cr"
 */
export function croreShares(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "--";
  const cr = value / 1e7;
  const abs = Math.abs(cr);
  const sign = cr < 0 ? "-" : "";
  if (abs >= 100) return `${sign}${Math.round(abs).toLocaleString("en-US")} Cr`;
  if (abs >= 10)  return `${sign}${abs.toFixed(1)} Cr`;
  return `${sign}${abs.toFixed(2)} Cr`;
}

/** Return +/- prefix string for change values */
export function signed(value: number | null | undefined, decimals = 2): string {
  if (value == null) return "--";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}`;
}

/** Format date string to readable format */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "--";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric"
    });
  } catch {
    return dateStr;
  }
}

/** Abbreviate large numbers */
export function abbrev(value: number | null | undefined): string {
  if (value == null) return "--";
  if (Math.abs(value) >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(1);
}
