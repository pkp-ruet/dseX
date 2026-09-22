"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getCachedWatchlist, loadWatchlist, subscribeWatchlist } from "@/lib/watchlist";
import { getToken } from "@/lib/auth";
import NotificationSettings from "@/components/push/NotificationSettings";
import PageHeader from "@/components/ui/PageHeader";
import { formatDate } from "@/lib/formatters";

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
  if (!res.ok) throw new Error("Failed to update profile.");
  return res.json();
}

export default function ProfileClient() {
  const router = useRouter();
  const { user, isLoading, isLoggedIn, logout, refreshUser } = useAuth();

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
      setSaveError("Failed to save. Try again.");
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
        <p className="text-text-muted">Loading…</p>
      </div>
    );
  }

  const identifier = user.email ?? user.phone ?? "—";
  const joinedDate = user.created_at ? formatDate(user.created_at) : "—";

  return (
    <div className="page-form pb-8">
      <PageHeader
        size="article"
        title="My Profile"
        bn="আপনার নাম, ইমেইল বা ফোন, ওয়াচলিস্ট আর নোটিফিকেশন — সব এক জায়গায়।"
        lead="Manage your account"
      />

      <div className="flex flex-col gap-4">
        {/* Display name */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-text-muted uppercase tracking-wider">Name</span>
            {!editingName && (
              <button
                type="button"
                onClick={() => setEditingName(true)}
                className="btn-link btn-sm -my-2"
              >
                Edit
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
                placeholder="Your name"
                autoFocus
              />
              {saveError && <p className="text-xs font-semibold text-negative" role="alert">{saveError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleSaveName}
                  disabled={saving}
                  className="btn-primary btn-sm"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => { setEditingName(false); setNameInput(user.display_name ?? ""); setSaveError(""); }}
                  className="btn-quiet btn-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-text-main font-medium mt-1">
              {user.display_name || <span className="text-text-muted italic">Not set</span>}
            </p>
          )}
        </div>

        {/* Email / phone */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <span className="text-xs text-text-muted uppercase tracking-wider">
            {user.email ? "Email" : "Phone"}
          </span>
          <p className="text-text-main font-medium mt-1">{identifier}</p>
        </div>

        {/* Member since */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <span className="text-xs text-text-muted uppercase tracking-wider">Member since</span>
          <p className="text-text-main font-medium mt-1">{joinedDate}</p>
        </div>

        {/* Watchlist */}
        <div className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-text-muted uppercase tracking-wider">Watchlist</span>
            <p className="text-text-main font-medium mt-1">{watchCount} stocks</p>
          </div>
          <Link href="/watchlist" className="btn-quiet btn-sm">
            View
          </Link>
        </div>

        {/* Notifications */}
        <NotificationSettings />

        {/* Sign out */}
        <button
          type="button"
          onClick={handleLogout}
          className="mt-2 inline-flex min-h-10 items-center self-start text-sm font-semibold text-negative hover:underline"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
