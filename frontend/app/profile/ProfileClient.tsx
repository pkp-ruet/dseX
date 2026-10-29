"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push("/login");
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
    setSaving(true);
    try {
      await updateProfile(nameInput);
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
            <span className="text-xs font-semibold text-text-muted">
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
              <span className="text-xs font-semibold text-text-muted">
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
            <span className="text-xs font-semibold text-text-muted">
              {user.email ? <T en="Email" bn="ইমেইল" /> : <T en="Phone" bn="ফোন" />}
            </span>
            <p className="text-text-main font-medium mt-1">{identifier}</p>
          </div>

          {/* Member since */}
          <div className="p-4">
            <span className="text-xs font-semibold text-text-muted">
              <T en="Member since" bn="সদস্য হয়েছেন" />
            </span>
            <p className="text-text-main font-medium mt-1">{joinedDate}</p>
          </div>

          {/* Watchlist */}
          <div className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-text-muted">
                <T en="Watchlist" bn="ওয়াচলিস্ট" />
              </span>
              <p className="text-text-main font-medium mt-1">
                <T en={`${watchCount} ${watchCount === 1 ? "share" : "shares"}`} bn={`${watchCount}টি শেয়ার`} />
              </p>
            </div>
            <Link href="/watchlist" className="btn-quiet btn-sm">
              <T en="Open" bn="খুলুন" />
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
