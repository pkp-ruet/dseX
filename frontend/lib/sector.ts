/**
 * DSE sector name → URL slug for `/sector/[slug]`.
 *
 * Mirrors `backend/services/sector_service.py:sector_slug` exactly — if one
 * changes, change both, or heatmap tiles will link to pages that don't exist.
 *   "Pharmaceuticals & Chemicals" → "pharmaceuticals-and-chemicals"
 */
export function sectorSlug(name: string): string {
  return (name || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
