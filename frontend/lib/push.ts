/**
 * Web push client helpers — service-worker registration + subscribe/unsubscribe.
 *
 * All browser-only; guarded by feature checks so they no-op on the server and on
 * unsupported browsers. `subscribeToPush()` MUST be called from a user gesture
 * (it triggers the OS permission dialog).
 */
import { apiSubscribePush, apiUnsubscribePush, type NotificationState } from "@/lib/api";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

/** localStorage flag set once the push opt-in has been shown (dismissed/enabled). */
export const PUSH_ASKED_KEY = "dsex.push.asked";

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    // iOS Safari exposes navigator.standalone on installed PWAs.
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    // iPadOS 13+ identifies as Mac; disambiguate via touch points.
    (navigator.platform === "MacIntel" &&
      (navigator as unknown as { maxTouchPoints?: number }).maxTouchPoints !== undefined &&
      (navigator as unknown as { maxTouchPoints: number }).maxTouchPoints > 1)
  );
}

export function getPermission(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

/**
 * Whether the push opt-in card would still show for this user — i.e. they're a
 * logged-in watchlist user who hasn't been asked and could be subscribed (or, on
 * iOS, needs to install first). Mirrors the gate in PushOptInPrompt so the
 * install banner can defer to it and avoid stacking two bottom cards.
 */
export function isPushOptInPending(opts: {
  isLoggedIn: boolean;
  watchlistCount: number;
}): boolean {
  if (typeof window === "undefined") return false;
  if (!opts.isLoggedIn || opts.watchlistCount <= 0) return false;
  try {
    if (localStorage.getItem(PUSH_ASKED_KEY)) return false;
  } catch {
    /* ignore */
  }
  const canPrompt = isPushSupported() && getPermission() === "default";
  const iosInstallHint = isIOS() && !isStandalone();
  return canPrompt || iosInstallHint;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

/**
 * Request permission, subscribe, and POST the subscription to the backend.
 * Returns the new notification state, or null if unsupported / not configured /
 * permission denied. Call from a click handler.
 */
export async function subscribeToPush(): Promise<NotificationState | null> {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) return null;
  const reg = await registerServiceWorker();
  if (!reg) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      // Cast: lib.dom types applicationServerKey as BufferSource; the new generic
      // Uint8Array<ArrayBufferLike> isn't structurally assignable, but the runtime
      // value is a valid key.
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource,
    });
  }

  const json = sub.toJSON() as {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return null;

  try {
    return await apiSubscribePush({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    });
  } catch {
    return null;
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await apiUnsubscribePush(endpoint).catch(() => {});
    }
  } catch {
    /* ignore */
  }
}
