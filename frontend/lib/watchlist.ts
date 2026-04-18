const KEY = "dsex.watchlist";
const EVENT = "dsex:watchlist-change";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function write(codes: string[]) {
  if (typeof window === "undefined") return;
  const unique = Array.from(new Set(codes.map((c) => c.toUpperCase())));
  window.localStorage.setItem(KEY, JSON.stringify(unique));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function getWatchlist(): string[] {
  return read();
}

export function isWatched(code: string): boolean {
  return read().includes(code.toUpperCase());
}

export function addToWatchlist(code: string) {
  const list = read();
  const upper = code.toUpperCase();
  if (!list.includes(upper)) write([...list, upper]);
}

export function removeFromWatchlist(code: string) {
  write(read().filter((c) => c !== code.toUpperCase()));
}

export function toggleWatchlist(code: string): boolean {
  if (isWatched(code)) {
    removeFromWatchlist(code);
    return false;
  }
  addToWatchlist(code);
  return true;
}

export function subscribeWatchlist(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
