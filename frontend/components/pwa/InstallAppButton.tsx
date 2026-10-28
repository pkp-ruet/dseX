"use client";

import type { ReactNode } from "react";
import { useInstallPrompt, showInstallBanner } from "@/lib/install";
import { IconDownload } from "@/components/ui/icons";

/**
 * Persistent "Install app" button for the navbar / drawer. Renders nothing when
 * there's no actionable install path: already installed, or a browser that can't
 * install (desktop Firefox/Safari that isn't iOS). On Chromium it triggers the
 * native dialog directly; on iOS it pops the floating banner with the
 * Share → Add to Home Screen instructions (iOS has no programmatic install).
 *
 * Style is delegated via `className` so it can blend into either the desktop nav
 * cluster or the mobile drawer list; `children` replaces the default icon +
 * label when the caller needs its own layout (the menu's shortcut row).
 */
export default function InstallAppButton({
  className,
  label = "Install app",
  onClick: onExtraClick,
  children,
}: {
  className?: string;
  label?: string;
  onClick?: () => void;
  children?: ReactNode;
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
      {children ?? (
        <>
          <IconDownload size={14} />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
