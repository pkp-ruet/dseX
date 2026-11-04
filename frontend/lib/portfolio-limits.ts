/**
 * THE portfolio lines (2026-11-05, portfolio review): one set for the grade,
 * the report's lights, "your next move", the loss chapter and the analysis
 * text, so no two parts of the page draw a line in a different place.
 *
 * Mirrored by the backend: signal_service TRIM_WEIGHT_PCT /
 * BUY_MORE_MAX_WEIGHT_PCT / HEAVY_SECTOR_PCT / FIN_HEAVY_PCT and
 * recommend.HEAVY_PCT / FIN_HEAVY_PCT (backend/tests/test_agreement.py).
 */

/** One share over this much of the money leans on it (the backend's Trim line). */
export const ONE_SHARE_FAIR_PCT = 25;
/** …and over this much it is a real risk. */
export const ONE_SHARE_BAD_PCT = 40;
/** One business over this much of the money is heavy (no new buys in it). */
export const SECTOR_FAIR_PCT = 40;
/** …and over this much it is a real risk. */
export const SECTOR_BAD_PCT = 60;
/** Banks + finance + insurers together over this much lean on finance. */
export const FIN_HEAVY_PCT = 50;
/** "Buy more" and every buy-more example stay under this much of the money. */
export const BUY_MORE_MAX_PCT = 20;
/** Fewer shares than this is "too few". */
export const MIN_SHARES = 5;
