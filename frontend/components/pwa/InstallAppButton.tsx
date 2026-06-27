"use client";

import { useInstallPrompt, showInstallBanner } from "@/lib/install";

/**
 * Persistent "Install app" button for the navbar / drawer. Renders nothing when
 * there's no actionable install path: already installed, or a browser that can't
 * install (desktop Firefox/Safari that isn't iOS). On Chromium it triggers the
 * native dialog directly; on iOS it pops the floating banner with the
 * Share → Add to Home Screen instructions (iOS has no programmatic install).
 *
 * Style is delegated via `className` so it can blend into either the desktop nav
 * cluster or the mobile drawer list.
 */
export default function InstallAppButton({
  className,
  label = "Install app",
  onClick: onExtraClick,
}: {
  className?: string;
  label?: string;
  onClick?: () => void;
}) {
  const { canInstall, installed, ios, promptInstall } = useInstallPrompt();

  if (installed) return null;
  if (!canInstall && !ios) return null;

  async function handle() {
    onExtraClick?.();
    if (canInstall) {
      await promptInstall();
    } else {
      // iOS: there's no API — show the manual instructions card.
      showInstallBanner();
    }
  }

  return (
    <button type="button" onClick={handle} className={className} aria-label={label}>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </svg>
      <span>{label}</span>
    </button>
  );
}
