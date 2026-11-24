"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "@/components/ui/Link";
import { useAuth } from "@/context/AuthContext";
import PlanUsage from "@/components/premium/PlanUsage";
import { getCachedWatchlist, loadWatchlist, subscribeWatchlist } from "@/lib/watchlist";
import { getToken } from "@/lib/auth";
import NotificationSettings from "@/components/push/NotificationSettings";
import PageHeader from "@/components/ui/PageHeader";
import { formatDate } from "@/lib/formatters";
import { bnDate } from "@/lib/bn";
import { T } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import PremiumPlanCta from "@/components/premium/PremiumPlanCta";
import PasswordSheet from "@/components/auth/PasswordSheet";
import { PREMIUM_PATH } from "@/lib/premium";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://dsex.onrender.com";

async function updateProfile(displayName: string) {
  const token = getToken();
  const res = await fetch(`${API_URL}/api/user/profile`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ display_name: displayName }),
  });
  if (!res.ok) throw new Error("profile_update_failed");
  return res.json();
}

export default function ProfileClient() {
  const router = useRouter();
  const { user, isLoading, isLoggedIn, logout, refreshUser } = useAuth();
  const { lang } = useLang();
  const L = (en: string, bn: string) => (lang === "bn" ? bn : en);

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [watchCount, setWatchCount] = useState(0);
  const [pwOpen, setPwOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push("/login?next=%2Fprofile");
    }
  }, [isLoading, isLoggedIn, router]);

  useEffect(() => {
    if (user) setNameInput(user.display_name ?? "");
  }, [user]);

  useEffect(() => {
    const update = () => setWatchCount(getCachedWatchlist().length);
    loadWatchlist().then(update);
    return subscribeWatchlist(update);
  }, []);

  async function handleSaveName() {
    setSaveError("");
    const name = nameInput.trim();
    if (!name) {
      setSaveError(L("Please type a name.", "একটি নাম লিখুন।"));
      return;
    }
    setSaving(true);
    try {
      await updateProfile(name);
      await refreshUser();
      setEditingName(false);
    } catch {
      setSaveError(L("We couldn't save your name. Please try again.", "নাম সেভ করা যায়নি। আবার চেষ্টা করুন।"));
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    logout();
    router.push("/");
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-text-muted">
          <T en="Loading…" bn="লোড হচ্ছে…" />
        </p>
      </div>
    );
  }

  const identifier = user.email ?? user.phone ?? "—";
  const joinedDate = user.created_at ? (
    <T en={formatDate(user.created_at)} bn={bnDate(String(user.created_at).slice(0, 10))} />
  ) : (
    "—"
  );

  return (
    <div className="page-form pb-8">
      <PageHeader
        size="article"
        title={<T en="My profile" bn="আমার প্রোফাইল" />}
        lead={
          <T
            en="Your name, email or phone, watchlist and notifications, all in one place."
            bn="আপনার নাম, ইমেইল বা ফোন, ওয়াচলিস্ট আর নোটিফিকেশন, সব এক জায়গায়।"
          />
        }
      />

      <div className="flex flex-col gap-4">
        {/* Your plan — with what it allows and what you use (#plan: the limit toasts open it) */}
        <div id="plan" className="soft-card p-4 scroll-mt-24">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="text-xs text-text-muted">
              <T en="Your plan" bn="আপনার প্ল্যান" />
            </span>
            <Link href={PREMIUM_PATH} className="text-sm font-semibold text-primary">
              <T en="What Premium includes" bn="প্রিমিয়ামে যা আছে" />
            </Link>
          </div>
          <PremiumPlanCta linkOnly />
          <PlanUsage />
        </div>

        {/* Account — one grouped list (settings-app style), rows split by hairlines */}
        <div className="soft-card divide-y divide-border overflow-hidden">
          {/* Display name */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-text-muted">
                <T en="Name" bn="নাম" />
              </span>
              {!editingName && (
                <button
                  type="button"
                  onClick={() => setEditingName(true)}
                  className="btn-link btn-sm -my-2"
                >
                  <T en="Edit" bn="বদলান" />
                </button>
              )}
            </div>

            {editingName ? (
              <div className="flex flex-col gap-2 mt-1">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="input-field text-sm"
                  placeholder={L("Your name", "আপনার নাম")}
                  autoFocus
                />
                {saveError && <p className="text-xs font-semibold text-negative" role="alert">{saveError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveName}
                    disabled={saving}
                    className="btn-primary btn-sm"
                  >
                    {saving ? <T en="Saving…" bn="সেভ হচ্ছে…" /> : <T en="Save" bn="সেভ করুন" />}
                  </button>
                  <button
                    onClick={() => { setEditingName(false); setNameInput(user.display_name ?? ""); setSaveError(""); }}
                    className="btn-quiet btn-sm"
                  >
                    <T en="Cancel" bn="বাতিল" />
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-text-main font-medium mt-1">
                {user.display_name || <span className="text-text-muted italic">
                    <T en="Not set" bn="দেওয়া হয়নি" />
                  </span>}
              </p>
            )}
          </div>

          {/* Email / phone */}
          <div className="p-4">
            <span className="text-xs text-text-muted">
              {user.email ? <T en="Email" bn="ইমেইল" /> : <T en="Phone" bn="ফোন" />}
            </span>
            <p className="text-text-main font-medium mt-1">{identifier}</p>
          </div>

          {/* How you sign in — a Google-only account can add a password here.
              Hidden until the backend says (an older backend sends no flag). */}
          {typeof user.has_password === "boolean" && (
            <div id="sign-in" className="p-4 scroll-mt-24">
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className="text-xs text-text-muted">
                  <T en="Sign-in" bn="সাইন ইন" />
                </span>
                {user.has_password && (
                  <button
                    type="button"
                    onClick={() => setPwOpen(true)}
                    className="btn-link btn-sm -my-2"
                  >
                    <T en="Change password" bn="পাসওয়ার্ড বদলান" />
                  </button>
                )}
              </div>
              <p className="text-text-main font-medium mt-1">
                {user.google_linked && user.has_password ? (
                  user.email ? (
                    <T en="With Google, or your email and password" bn="Google দিয়ে, অথবা ইমেইল আর পাসওয়ার্ড দিয়ে" />
                  ) : (
                    <T en="With Google, or your phone and password" bn="Google দিয়ে, অথবা ফোন আর পাসওয়ার্ড দিয়ে" />
                  )
                ) : user.google_linked ? (
                  <T en="With Google" bn="Google দিয়ে" />
                ) : user.email ? (
                  <T en="With your email and password" bn="ইমেইল আর পাসওয়ার্ড দিয়ে" />
                ) : (
                  <T en="With your phone number and password" bn="ফোন নম্বর আর পাসওয়ার্ড দিয়ে" />
                )}
              </p>
              {!user.has_password && (
                <>
                  <p className="text-sm text-text-main mt-1">
                    <T
                      en="Add a password to sign in with your email too, without Google."
                      bn="পাসওয়ার্ড যোগ করলে Google ছাড়াও ইমেইল দিয়ে সাইন ইন করতে পারবেন।"
                    />
                  </p>
                  <button
                    type="button"
                    onClick={() => setPwOpen(true)}
                    className="btn-quiet btn-sm mt-3"
                  >
                    <T en="Add a password" bn="পাসওয়ার্ড যোগ করুন" />
                  </button>
                </>
              )}
              <PasswordSheet
                open={pwOpen}
                onClose={() => setPwOpen(false)}
                hasPassword={user.has_password}
                googleLinked={Boolean(user.google_linked)}
                identifier={user.email ?? user.phone ?? ""}
              />
            </div>
          )}

          {/* Member since */}
          <div className="p-4">
            <span className="text-xs text-text-muted">
              <T en="Member since" bn="সদস্য হয়েছেন" />
            </span>
            <p className="text-text-main font-medium mt-1">{joinedDate}</p>
          </div>

          {/* Watchlist */}
          <div className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-text-muted">
                <T en="Watchlist" bn="ওয়াচলিস্ট" />
              </span>
              <p className="text-text-main font-medium mt-1">
                <T en={`${watchCount} ${watchCount === 1 ? "share" : "shares"}`} bn={`${watchCount}টি শেয়ার`} />
              </p>
            </div>
            <Link href="/my" className="btn-quiet btn-sm">
              <T en="Open" bn="খুলুন" />
            </Link>
          </div>

          {/* The reader survey (2026-11-24) */}
          <div id="feedback" className="p-4 flex items-center justify-between gap-3 scroll-mt-24">
            <div>
              <span className="text-xs text-text-muted">
                <T en="Your feedback" bn="আপনার মতামত" />
              </span>
              <p className="text-text-main font-medium mt-1">
                {user.survey?.state === "done" ? (
                  <T en="Thank you for answering" bn="উত্তর দেওয়ার জন্য ধন্যবাদ" />
                ) : (
                  <T en="9 short questions, about 2 minutes" bn="9টি ছোট প্রশ্ন, মোটামুটি 2 মিনিট" />
                )}
              </p>
            </div>
            <Link href="/feedback?src=profile" className="btn-quiet btn-sm">
              {user.survey?.state === "done" ? <T en="Open" bn="খুলুন" /> : <T en="Answer" bn="উত্তর দিন" />}
            </Link>
          </div>
        </div>

        {/* Notifications */}
        <NotificationSettings />

        {/* Sign out */}
        <button
          type="button"
          onClick={handleLogout}
          className="mt-2 inline-flex min-h-10 items-center self-start text-sm font-semibold text-negative hover:underline"
        >
          <T en="Sign out" bn="সাইন আউট" />
        </button>
      </div>
    </div>
  );
}
