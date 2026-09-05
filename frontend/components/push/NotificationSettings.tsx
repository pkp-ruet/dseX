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
type Msg = { kind: "ok" | "err"; text: string } | null;

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
      setMsg({ kind: "ok", text: "Alerts are on for this device." });
    } else {
      setMsg({
        kind: "err",
        text:
          getPermission() === "denied"
            ? "Your browser is blocking notifications. Allow them for this site in your browser settings, then reload."
            : "Couldn't turn on alerts. Please try again.",
      });
    }
  }

  async function handleDisable() {
    setBusy(true);
    setMsg(null);
    await unsubscribeFromPush();
    setBusy(false);
    setRegistered(false);
    setMsg({ kind: "ok", text: "Alerts are off for this device." });
  }

  async function handleTest() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await apiSendTestPush();
      setMsg(
        r.sent > 0
          ? { kind: "ok", text: "Test sent — check your notifications." }
          : { kind: "err", text: "No device received it. Turn alerts on for this device first." },
      );
    } catch {
      setMsg({ kind: "err", text: "Couldn't send a test right now." });
    } finally {
      setBusy(false);
    }
  }

  const card = "bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4";
  const label = "text-xs text-[var(--text-muted)] uppercase tracking-wider";

  if (phase === "loading") {
    return (
      <div className={card}>
        <span className={label}>Notifications</span>
        <p className="text-[var(--text-muted)] text-sm mt-2">Checking…</p>
      </div>
    );
  }

  if (phase === "unsupported") {
    return (
      <div className={card}>
        <span className={label}>Notifications</span>
        <p className="text-[var(--text-muted)] text-sm mt-2">
          This browser doesn&apos;t support web notifications.
        </p>
      </div>
    );
  }

  return (
    <div className={card}>
      <span className={label}>Notifications</span>

      <div className="mt-2 flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: registered ? "var(--positive)" : "var(--text-muted)" }}
          aria-hidden
        />
        <p className="text-[var(--text)] font-medium">
          {registered ? "On for this device" : "Off for this device"}
        </p>
      </div>

      {!configured ? (
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Notifications aren&apos;t available right now.
        </p>
      ) : (
        <>
          <p className="mt-1 text-xs leading-snug text-[var(--text-muted)]">
            {registered
              ? "You'll get your daily stock update and alerts on this device."
              : "Turn on to get your daily stock update and alerts on this device."}
          </p>

          {msg && (
            <p
              className="mt-2 text-xs leading-snug"
              style={{ color: msg.kind === "ok" ? "var(--positive)" : "var(--negative)" }}
            >
              {msg.text}
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
                  {busy ? "Working…" : "Send me a test"}
                </button>
                <button
                  type="button"
                  onClick={handleDisable}
                  disabled={busy}
                  className="btn-quiet btn-sm"
                >
                  Turn off
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleEnable}
                disabled={busy}
                className="btn-primary btn-sm"
              >
                {busy ? "Turning on…" : "Turn on for this device"}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
