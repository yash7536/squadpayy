"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSquadPay } from "@/lib/data/store-context";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";

export default function ProfilePage() {
  const router = useRouter();
  const {
    participants,
    currentUserId,
    authState,
    userEmail,
    localSplitCount,
    recentlySyncedCount,
    updateDisplayName,
    signOut,
  } = useSquadPay();
  const you = participants.find((p) => p.id === currentUserId);
  const authenticated = authState === "real";

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(you?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  function startEditing() {
    setDraftName(you?.name ?? "");
    setEditing(true);
  }

  async function handleSave() {
    if (!draftName.trim()) return;
    setSaving(true);
    try {
      await updateDisplayName(draftName);
      setEditing(false);
    } catch (err) {
      console.error("[profile] failed to update name:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
    router.push("/login");
  }

  // --- Not authenticated: a clean sign-in prompt, nothing else. -------------
  if (!authenticated) {
    return (
      <div className="container-narrow gutter w-full py-16">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant">
            <Icon name="person" size={28} />
          </div>
          <h1 className="text-headline-lg text-on-surface">Sign in to SquadPay</h1>
          <p className="text-body-md text-on-surface-variant max-w-sm">
            Sign in to save your splits and access them across devices.
          </p>
          {localSplitCount > 0 && (
            <p className="text-body-sm text-on-surface-variant">
              You have {localSplitCount} {localSplitCount === 1 ? "split" : "splits"} saved on
              this device.
            </p>
          )}
          <a
            href="/login"
            className="inline-flex items-center gap-2 bg-primary-container text-on-primary hover:bg-primary px-6 py-3 rounded-xl text-label-md font-semibold shadow-card transition-colors active:scale-95 mt-2"
          >
            Continue with magic link
          </a>
        </div>
      </div>
    );
  }

  // --- Authenticated: the real profile page. ---------------------------------
  return (
    <div className="container-narrow gutter w-full py-8">
      <span className="text-caption-caps text-primary-container tracking-widest">Profile</span>
      <h1 className="text-display-lg text-on-surface tracking-tight mt-1">Your account</h1>
      {recentlySyncedCount != null && recentlySyncedCount > 0 && (
        <p className="text-label-sm text-tertiary-container font-semibold mt-2">
          {recentlySyncedCount} {recentlySyncedCount === 1 ? "split" : "splits"} synced to your
          account.
        </p>
      )}

      <Card className="p-6 flex flex-col items-center text-center gap-3 mb-4 mt-8">
        <Avatar name={you?.name ?? "You"} size="lg" tone="accent" />
        <div>
          <h2 className="text-headline-lg text-on-surface">{you?.name ?? "You"}</h2>
          <p className="text-body-sm text-on-surface-variant">{userEmail}</p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={startEditing}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-container text-on-surface hover:bg-surface-variant text-label-sm font-semibold transition-colors focus-ring mt-1"
          >
            <Icon name="edit" size={16} />
            Edit profile
          </button>
        )}
      </Card>

      {editing && (
        <Card className="p-6 flex flex-col gap-4 mb-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="display-name" className="text-label-sm text-on-surface font-semibold">
              Display name
            </label>
            <input
              id="display-name"
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              className="h-12 px-4 rounded-xl bg-surface-container-low text-on-surface text-body-md focus:outline-none focus-ring border border-surface-variant"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !draftName.trim()}
              className="inline-flex items-center justify-center gap-2 bg-primary-container text-on-primary hover:bg-primary px-5 py-2.5 rounded-xl text-label-md font-semibold shadow-card transition-colors active:scale-95 disabled:opacity-50"
            >
              <Icon name={saving ? "sync" : "check"} size={18} className={saving ? "animate-spin" : undefined} />
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-5 py-2.5 rounded-xl bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-variant text-label-md font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </Card>
      )}

      <Card className="p-5 flex items-center justify-between">
        <div>
          <p className="text-label-md text-on-surface font-semibold">Sign out</p>
          <p className="text-body-sm text-on-surface-variant">
            You&rsquo;ll need to sign in again to see your splits.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          className="px-4 py-2 rounded-xl bg-surface-container text-on-surface hover:bg-surface-variant text-label-sm font-semibold transition-colors shrink-0 disabled:opacity-50"
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </Card>
    </div>
  );
}
