"use client";

import { useCallback, useEffect, useState } from "react";
import {
  isPushSupported,
  getPermission,
  registerServiceWorker,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push";
import { apiGetNotificationState, apiSendTestPush } from "@/lib/api";
import { T } from "@/components/i18n/T";

/**
 * Profile → Notifications control. Self-service recovery for web push.
 *
 * Unlike PushOptInPrompt (which only appears when permission is "default"), this
 * can (re)subscribe THIS device even when the browser permission is already
 * "granted" — it calls subscribeToPush() directly. That's what rescues users
 * stranded in the "granted but no subscription in the DB" dead-end. It also shows
 * whether this device is registered and can fire a real test push to verify the
 * whole pipeline on-device.
 */
type Phase = "loading" | "unsupported" | "ready";
type Msg = { kind: "ok" | "err"; en: string; bn: string } | null;

export default function NotificationSettings() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [registered, setRegistered] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  const refresh = useCallback(async () => {
    if (!isPushSupported()) {
      setPhase("unsupported");
      return;
    }
    await registerServiceWorker();
    let endpoint: string | undefined;
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      endpoint = sub?.endpoint;
    } catch {
      /* ignore — treat as no subscription */
    }
    try {
      const state = await apiGetNotificationState(endpoint);
      setRegistered(state.this_device_registered);
      setConfigured(state.configured);
    } catch {
      /* leave defaults; the buttons still work */
    }
    setPhase("ready");
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleEnable() {
    setBusy(true);
    setMsg(null);
    const state = await subscribeToPush();
    setBusy(false);
    if (state) {
      setRegistered(true);
      setMsg({ kind: "ok", en: "Notifications are on for this device.", bn: "এই ডিভাইসে নোটিফিকেশন চালু হয়েছে।" });
    } else {
      setMsg(
        getPermission() === "denied"
          ? {
              kind: "err",
              en: "Your browser is blocking notifications. Please allow them for this site in your browser settings, then reload the page.",
              bn: "আপনার ব্রাউজার নোটিফিকেশন বন্ধ রেখেছে। ব্রাউজারের সেটিংসে এই সাইটের জন্য নোটিফিকেশন চালু করে পেজটি আবার লোড করুন।",
            }
          : {
              kind: "err",
              en: "We couldn't turn on notifications. Please try again.",
              bn: "নোটিফিকেশন চালু করা যায়নি। আবার চেষ্টা করুন।",
            },
      );
    }
  }

  async function handleDisable() {
    setBusy(true);
    setMsg(null);
    await unsubscribeFromPush();
    setBusy(false);
    setRegistered(false);
    setMsg({ kind: "ok", en: "Notifications are off for this device.", bn: "এই ডিভাইসে নোটিফিকেশন বন্ধ হয়েছে।" });
  }

  async function handleTest() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await apiSendTestPush();
      setMsg(
        r.sent > 0
          ? { kind: "ok", en: "A test was sent. Please check your notifications.", bn: "একটি পরীক্ষামূলক নোটিফিকেশন পাঠানো হয়েছে। নোটিফিকেশন দেখে নিন।" }
          : {
              kind: "err",
              en: "No device received it. Please turn on notifications for this device first.",
              bn: "কোনো ডিভাইসে পৌঁছায়নি। আগে এই ডিভাইসে নোটিফিকেশন চালু করুন।",
            },
      );
    } catch {
      setMsg({ kind: "err", en: "We couldn't send a test right now.", bn: "এই মুহূর্তে পরীক্ষামূলক নোটিফিকেশন পাঠানো যাচ্ছে না।" });
    } finally {
      setBusy(false);
    }
  }

  const card = "bg-surface border border-border rounded-xl p-4";
  const label = "text-xs text-text-muted ";

  if (phase === "loading") {
    return (
      <div className={card}>
        <span className={label}>
          <T en="Notifications" bn="নোটিফিকেশন" />
        </span>
        <p className="text-text-muted text-sm mt-2">
          <T en="Checking…" bn="দেখা হচ্ছে…" />
        </p>
      </div>
    );
  }

  if (phase === "unsupported") {
    return (
      <div className={card}>
        <span className={label}>
          <T en="Notifications" bn="নোটিফিকেশন" />
        </span>
        <p className="text-text-muted text-sm mt-2">
          <T en="This browser does not support web notifications." bn="এই ব্রাউজারে ওয়েব নোটিফিকেশন চলে না।" />
        </p>
      </div>
    );
  }

  return (
    <div className={card}>
      <span className={label}>
        <T en="Notifications" bn="নোটিফিকেশন" />
      </span>

      <div className="mt-2 flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: registered ? "var(--positive)" : "var(--text-muted)" }}
          aria-hidden
        />
        <p className="text-text-main font-medium">
          {registered ? (
            <T en="On for this device" bn="এই ডিভাইসে চালু" />
          ) : (
            <T en="Off for this device" bn="এই ডিভাইসে বন্ধ" />
          )}
        </p>
      </div>

      {!configured ? (
        <p className="mt-2 text-xs text-text-muted">
          <T en="Notifications are not available right now." bn="এই মুহূর্তে নোটিফিকেশন চালু করা যাচ্ছে না।" />
        </p>
      ) : (
        <>
          <p className="mt-1 text-xs leading-snug text-text-muted">
            {registered ? (
              <T
                en="You will get your daily update and price alerts on this device."
                bn="এই ডিভাইসে আপনি প্রতিদিনের আপডেট আর প্রাইস অ্যালার্ট পাবেন।"
              />
            ) : (
              <T
                en="Turn them on to get your daily update and price alerts on this device."
                bn="চালু করলে এই ডিভাইসে প্রতিদিনের আপডেট আর প্রাইস অ্যালার্ট পাবেন।"
              />
            )}
          </p>

          {msg && (
            <p
              className="mt-2 text-xs leading-snug"
              style={{ color: msg.kind === "ok" ? "var(--positive)" : "var(--negative)" }}
            >
              <T en={msg.en} bn={msg.bn} />
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {registered ? (
              <>
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={busy}
                  className="btn-primary btn-sm"
                >
                  {busy ? <T en="Working…" bn="কাজ চলছে…" /> : <T en="Send me a test" bn="পরীক্ষামূলক পাঠান" />}
                </button>
                <button
                  type="button"
                  onClick={handleDisable}
                  disabled={busy}
                  className="btn-quiet btn-sm"
                >
                  <T en="Turn off" bn="বন্ধ করুন" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleEnable}
                disabled={busy}
                className="btn-primary btn-sm"
              >
                {busy ? (
                  <T en="Turning on…" bn="চালু হচ্ছে…" />
                ) : (
                  <T en="Turn on for this device" bn="এই ডিভাইসে চালু করুন" />
                )}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
