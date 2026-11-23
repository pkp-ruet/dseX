"use client";

import { useEffect, useId, useState } from "react";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import { useAuth } from "@/context/AuthContext";
import { apiSetPassword } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { toast } from "@/lib/toast";

/** Same limits as the backend (`auth_service.PASSWORD_MIN` / `PASSWORD_MAX`). */
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

type Proof = "current" | "google";

/**
 * Add a password to a Google-only account, or change one (2026-11-23).
 *
 * Adding one is confirmed with Google once more: the saved sign-in alone lasts
 * 30 days on a phone, so whoever holds a shared or lost phone could otherwise
 * add a password and keep the account. Changing one asks for the current
 * password; a Google-linked account may confirm with Google instead (its
 * "forgot my password"). A change signs out every other device.
 */
export default function PasswordSheet({
  open,
  onClose,
  hasPassword,
  googleLinked,
  identifier,
}: {
  open: boolean;
  onClose: () => void;
  hasPassword: boolean;
  googleLinked: boolean;
  /** The email or phone the password goes with (for password managers). */
  identifier: string;
}) {
  const { lang } = useLang();
  const L = (en: string, bn: string) => (lang === "bn" ? bn : en);
  const { login } = useAuth();
  const ids = useId();
  const googleReady = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

  const [proof, setProof] = useState<Proof>(hasPassword ? "current" : "google");
  const [current, setCurrent] = useState("");
  const [next1, setNext1] = useState("");
  const [next2, setNext2] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // A fresh start each time it opens.
  useEffect(() => {
    if (!open) return;
    setProof(hasPassword ? "current" : "google");
    setCurrent("");
    setNext1("");
    setNext2("");
    setShow(false);
    setSaving(false);
    setError("");
  }, [open, hasPassword]);

  const tooShort = next1.length > 0 && next1.length < PASSWORD_MIN;
  const mismatch = next2.length > 0 && next1 !== next2;
  const passwordsOk = next1.length >= PASSWORD_MIN && next1 === next2;
  const canSubmitCurrent = passwordsOk && current.length > 0 && !saving;

  function reasonText(err: unknown): string {
    const msg = err instanceof Error ? err.message : "";
    const status = (err as { status?: number } | null)?.status;
    if (msg === "current_password") return L("Your current password is not right.", "আপনার এখনকার পাসওয়ার্ডটি ঠিক নয়।");
    if (msg === "confirm_google") return L("Confirm with Google to add a password.", "পাসওয়ার্ড যোগ করতে Google দিয়ে নিশ্চিত করুন।");
    if (msg === "google_mismatch")
      return L(
        "That Google account is not the one this account uses. Choose the Google account you sign in with.",
        "এই Google অ্যাকাউন্টটি আপনার অ্যাকাউন্টের সাথে যুক্ত নয়। যে Google অ্যাকাউন্ট দিয়ে সাইন ইন করেন, সেটি বেছে নিন।",
      );
    if (msg === "google_invalid" || msg.includes("Google token"))
      return L("Google could not confirm it was you. Please try again.", "Google নিশ্চিত করতে পারেনি। আবার চেষ্টা করুন।");
    if (status === 429) return L("Too many tries. Please wait a few minutes and try again.", "অনেকবার চেষ্টা হয়েছে। কয়েক মিনিট পর আবার চেষ্টা করুন।");
    if (status === 503) return L("We couldn't reach Google right now. Please try again.", "এখন Google-এর সাথে যোগাযোগ করা যাচ্ছে না। আবার চেষ্টা করুন।");
    return L("We couldn't save your password. Please try again.", "পাসওয়ার্ড সেভ করা যায়নি। আবার চেষ্টা করুন।");
  }

  async function save(body: { current_password?: string; google_id_token?: string }) {
    setError("");
    setSaving(true);
    try {
      const res = await apiSetPassword({ new_password: next1, ...body });
      const token = res.access_token ?? getToken();
      if (token) login(token, res.user);
      toast({
        tone: "success",
        message: res.changed ? (
          <T
            en="Password changed. Your other phones and computers are signed out."
            bn="পাসওয়ার্ড বদলানো হয়েছে। অন্য ফোন আর কম্পিউটার থেকে সাইন আউট হয়ে গেছে।"
          />
        ) : (
          <T
            en="Password saved. You can now sign in with your email and password too."
            bn="পাসওয়ার্ড সেভ হয়েছে। এখন ইমেইল আর পাসওয়ার্ড দিয়েও সাইন ইন করতে পারবেন।"
          />
        ),
      });
      onClose();
    } catch (err) {
      if (err instanceof Error && err.message === "AUTH_EXPIRED") return;
      setError(reasonText(err));
    } finally {
      setSaving(false);
    }
  }

  function onGoogle(res: CredentialResponse) {
    if (!res.credential) {
      setError(L("Google could not confirm it was you. Please try again.", "Google নিশ্চিত করতে পারেনি। আবার চেষ্টা করুন।"));
      return;
    }
    void save({ google_id_token: res.credential });
  }

  const title = hasPassword ? (
    <T en="Change your password" bn="পাসওয়ার্ড বদলান" />
  ) : (
    <T en="Add a password" bn="পাসওয়ার্ড যোগ করুন" />
  );

  const pwType = show ? "text" : "password";

  const footer =
    proof === "current" ? (
      <div className="flex gap-2 justify-end">
        <Button variant="quiet" onClick={onClose} disabled={saving}>
          <T en="Cancel" bn="বাতিল" />
        </Button>
        <Button type="submit" form={`${ids}-form`} disabled={!canSubmitCurrent}>
          {saving ? <T en="Saving…" bn="সেভ হচ্ছে…" /> : <T en="Save password" bn="পাসওয়ার্ড সেভ করুন" />}
        </Button>
      </div>
    ) : undefined;

  return (
    <Sheet open={open} onClose={onClose} title={title} footer={footer} dismissible={!saving}>
      <form
        id={`${ids}-form`}
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (proof === "current" && canSubmitCurrent) void save({ current_password: current });
        }}
      >
        <p className="text-sm text-text-main">
          {hasPassword ? (
            <T
              en="Your other phones and computers will be signed out after the change."
              bn="বদলানোর পর অন্য ফোন আর কম্পিউটার থেকে সাইন আউট হয়ে যাবে।"
            />
          ) : (
            <T
              en="With a password you can sign in with your email too, without Google. Google sign-in keeps working."
              bn="পাসওয়ার্ড থাকলে Google ছাড়াও ইমেইল দিয়ে সাইন ইন করতে পারবেন। Google দিয়ে সাইন ইনও চলবে।"
            />
          )}
        </p>

        {/* Tells a password manager which account this password belongs to. */}
        <input type="text" name="username" autoComplete="username" value={identifier} readOnly hidden />

        {proof === "current" && (
          <div className="flex flex-col gap-1">
            <label htmlFor={`${ids}-cur`} className="text-sm font-medium text-text-main">
              <T en="Current password" bn="এখনকার পাসওয়ার্ড" />
            </label>
            <input
              id={`${ids}-cur`}
              type={pwType}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              maxLength={PASSWORD_MAX}
              autoComplete="current-password"
              className="input-field"
              required
            />
            {googleLinked && googleReady && (
              <button
                type="button"
                onClick={() => { setProof("google"); setError(""); }}
                className="btn-link btn-sm self-start"
              >
                <T en="Forgot it? Confirm with Google instead" bn="ভুলে গেছেন? এর বদলে Google দিয়ে নিশ্চিত করুন" />
              </button>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor={`${ids}-new`} className="text-sm font-medium text-text-main">
            <T en="New password" bn="নতুন পাসওয়ার্ড" />
          </label>
          <input
            id={`${ids}-new`}
            type={pwType}
            value={next1}
            onChange={(e) => setNext1(e.target.value)}
            maxLength={PASSWORD_MAX}
            autoComplete="new-password"
            placeholder={L("At least 8 characters", "অন্তত 8 অক্ষর")}
            className="input-field"
            required
          />
          {tooShort && (
            <p className="text-xs text-text-main">
              <T en="Use at least 8 characters." bn="অন্তত 8 অক্ষর দিন।" />
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${ids}-again`} className="text-sm font-medium text-text-main">
            <T en="Type it again" bn="আবার লিখুন" />
          </label>
          <input
            id={`${ids}-again`}
            type={pwType}
            value={next2}
            onChange={(e) => setNext2(e.target.value)}
            maxLength={PASSWORD_MAX}
            autoComplete="new-password"
            className="input-field"
            required
          />
          {mismatch && (
            <p className="text-xs text-text-main">
              <T en="The two passwords are not the same." bn="দুটি পাসওয়ার্ড এক নয়।" />
            </p>
          )}
        </div>

        <label htmlFor={`${ids}-show`} className="flex min-h-10 items-center gap-2 self-start text-sm text-text-main">
          <input id={`${ids}-show`} type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
          <T en="Show passwords" bn="পাসওয়ার্ড দেখান" />
        </label>

        {proof === "google" && (
          <div className="flex flex-col gap-3 border-t border-border pt-4">
            {!googleReady ? (
              <p className="text-sm text-text-main">
                <T
                  en="Google sign-in isn't available right now, so a password can't be added. Please try again later."
                  bn="এখন Google সাইন ইন চালু নেই, তাই পাসওয়ার্ড যোগ করা যাচ্ছে না। পরে আবার চেষ্টা করুন।"
                />
              </p>
            ) : passwordsOk ? (
              <>
                <p className="text-sm font-semibold text-text-main">
                  <T
                    en="Last step: confirm it's you with Google. That saves the password."
                    bn="শেষ ধাপ: Google দিয়ে নিশ্চিত করুন যে এটা আপনি। তাহলেই পাসওয়ার্ড সেভ হবে।"
                  />
                </p>
                <div className="flex justify-center" aria-busy={saving}>
                  <GoogleLogin
                    onSuccess={onGoogle}
                    onError={() => setError(L("Google could not confirm it was you. Please try again.", "Google নিশ্চিত করতে পারেনি। আবার চেষ্টা করুন।"))}
                    text="continue_with"
                    theme="outline"
                    shape="pill"
                    size="large"
                    logo_alignment="left"
                    width="280"
                  />
                </div>
                {saving && (
                  <p className="text-sm text-text-main text-center">
                    <T en="Saving…" bn="সেভ হচ্ছে…" />
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-text-main">
                <T
                  en="Type your new password twice. Then you'll confirm it's you with Google."
                  bn="নতুন পাসওয়ার্ড দুবার লিখুন। তারপর Google দিয়ে নিশ্চিত করবেন যে এটা আপনি।"
                />
              </p>
            )}
            {hasPassword && (
              <button
                type="button"
                onClick={() => { setProof("current"); setError(""); }}
                className="btn-link btn-sm self-start"
              >
                <T en="Use my current password instead" bn="এর বদলে এখনকার পাসওয়ার্ড দিন" />
              </button>
            )}
          </div>
        )}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Sheet>
  );
}
