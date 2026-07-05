// localStorage-backed "what changed since your last visit day" for the
// homepage discovery lists. One record per list: the codes last seen on a
// previous day plus the diff computed when the day rolled over, so New/▲ tags
// stay stable across reloads within the same day. Per-device by design — the
// server keeps no rank history.

export interface ListDelta {
  /** Codes that were not on the list the last day the user looked. */
  newCodes: Set<string>;
  /** Places climbed since the last visit day (code → positions moved up). */
  movedUp: Map<string, number>;
}

interface StoredDelta {
  date: string;
  codes: string[];
  newCodes: string[];
  movedUp: Record<string, number>;
}

const PREFIX = "dsex.listDelta.";

const EMPTY: ListDelta = { newCodes: new Set(), movedUp: new Map() };

/** Diff `codes` (in display order) against the list stored for `listKey` and
 *  persist today's snapshot. Call from an effect — touches localStorage. */
export function getListDelta(listKey: string, codes: string[]): ListDelta {
  if (typeof window === "undefined" || codes.length === 0) return EMPTY;
  const key = PREFIX + listKey;
  const today = new Date().toDateString();
  try {
    const raw = window.localStorage.getItem(key);
    const stored: StoredDelta | null = raw ? (JSON.parse(raw) as StoredDelta) : null;

    if (stored && stored.date === today && Array.isArray(stored.codes)) {
      // Same day: keep the diff computed at rollover, but refresh the snapshot
      // so tomorrow diffs against the latest list the user saw today.
      window.localStorage.setItem(key, JSON.stringify({ ...stored, codes }));
      return {
        newCodes: new Set((stored.newCodes ?? []).filter((c) => codes.includes(c))),
        movedUp: new Map(
          Object.entries(stored.movedUp ?? {}).filter(([c]) => codes.includes(c)),
        ),
      };
    }

    // Day rolled over (or first visit): diff vs the last-seen list.
    const prev = stored && Array.isArray(stored.codes) ? stored.codes : null;
    const newCodes = prev ? codes.filter((c) => !prev.includes(c)) : [];
    const movedUp: Record<string, number> = {};
    if (prev) {
      codes.forEach((c, i) => {
        const pi = prev.indexOf(c);
        if (pi > i) movedUp[c] = pi - i;
      });
    }
    window.localStorage.setItem(
      key,
      JSON.stringify({ date: today, codes, newCodes, movedUp } satisfies StoredDelta),
    );
    return { newCodes: new Set(newCodes), movedUp: new Map(Object.entries(movedUp)) };
  } catch {
    return EMPTY;
  }
}
