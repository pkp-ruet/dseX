/** Format a number as ৳ currency (Bangladeshi Taka) */
export function taka(value: number | null | undefined, decimals = 2): string {
  if (value == null) return "--";
  return `৳${value.toFixed(decimals)}`;
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
