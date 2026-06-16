/**
 * Map a sector name (plain or raw) to a small industry emoji.
 * Keyword-based so it tolerates both the plain names the backend sends
 * ("Banks", "Power & gas", "Phone & internet"…) and any raw DSE sector.
 * Returns null when nothing matches, so callers can fall back (e.g. to the
 * first letter of the trading code).
 */
export function sectorIcon(sector?: string | null): string | null {
  if (!sector) return null;
  const s = sector.toLowerCase();
  if (s.includes("bank")) return "🏦";
  if (s.includes("financ")) return "💰";
  if (s.includes("fund")) return "📊";
  if (s.includes("pharma") || s.includes("medicine") || s.includes("chemical")) return "💊";
  if (s.includes("power") || s.includes("fuel") || s.includes("gas") || s.includes("energy")) return "⚡";
  if (s.includes("engineer")) return "🏭";
  if (s.includes("food")) return "🍚";
  if (s.includes("textile") || s.includes("cloth")) return "🧵";
  if (s.includes("tech") || s.includes("information")) return "💻";
  if (s.includes("phone") || s.includes("telecom")) return "📱";
  if (s.includes("cement")) return "🧱";
  if (s.includes("insur")) return "🛡️";
  if (s.includes("leather") || s.includes("tann")) return "👜";
  if (s.includes("ceramic")) return "🏺";
  if (s.includes("jute")) return "🌾";
  if (s.includes("paper") || s.includes("print")) return "📄";
  if (s.includes("service") || s.includes("propert") || s.includes("real estate")) return "🏢";
  if (s.includes("travel") || s.includes("leisure")) return "✈️";
  if (s.includes("bond") || s.includes("debenture")) return "📜";
  return null;
}
