/**
 * The dashboard's single icon set — stroked SVGs, 24-unit grid, `currentColor`.
 * Replaces the mixed emoji (🥇 🚀 💰 📖 …) that rendered differently on every
 * device. Size is set by the caller via the `size` prop.
 */
import type { ReactNode } from "react";

function I({ size = 16, children, sw = 2.2 }: { size?: number; children: ReactNode; sw?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const IconTarget = (p: { size?: number }) => (
  <I {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
  </I>
);
export const IconTrendUp = (p: { size?: number }) => (
  <I {...p}>
    <polyline points="3 17 9 11 13 15 21 7" />
    <polyline points="15 7 21 7 21 13" />
  </I>
);
export const IconTrendDown = (p: { size?: number }) => (
  <I {...p}>
    <polyline points="3 7 9 13 13 9 21 17" />
    <polyline points="15 17 21 17 21 11" />
  </I>
);
export const IconArrowUp = (p: { size?: number }) => (
  <I {...p} sw={2.6}>
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="6 11 12 5 18 11" />
  </I>
);
export const IconArrowDown = (p: { size?: number }) => (
  <I {...p} sw={2.6}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <polyline points="6 13 12 19 18 13" />
  </I>
);
export const IconWallet = (p: { size?: number }) => (
  <I {...p}>
    <rect x="3" y="6" width="18" height="13" rx="2" />
    <path d="M3 10h18" />
    <circle cx="16.5" cy="14.5" r="1" fill="currentColor" />
  </I>
);
export const IconCoin = (p: { size?: number }) => (
  <I {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v10M9.5 9.5h3.5a1.75 1.75 0 0 1 0 3.5h-2a1.75 1.75 0 0 0 0 3.5H15" />
  </I>
);
export const IconNews = (p: { size?: number }) => (
  <I {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M7 8h10M7 12h10M7 16h6" />
  </I>
);
export const IconStar = (p: { size?: number }) => (
  <I {...p}>
    <polygon points="12 2.5 15 8.8 21.8 9.7 16.9 14.4 18.1 21.2 12 18 5.9 21.2 7.1 14.4 2.2 9.7 9 8.8" />
  </I>
);
export const IconSparkle = (p: { size?: number }) => (
  <I {...p}>
    <path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2L12 3z" />
  </I>
);
export const IconBulb = (p: { size?: number }) => (
  <I {...p}>
    <path d="M9 18h6M10 21h4" />
    <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5.9 1.2.9 2V16h5.2v-.1c0-.8.3-1.5.9-2A6 6 0 0 0 12 3z" />
  </I>
);
export const IconTrophy = (p: { size?: number }) => (
  <I {...p}>
    <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" />
    <path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4" />
    <path d="M12 13v4M9 21h6M10 17h4" />
  </I>
);
export const IconRocket = (p: { size?: number }) => (
  <I {...p}>
    <path d="M12 3c3 2 5 6 5 10l-2 2H9l-2-2c0-4 2-8 5-10z" />
    <path d="M9 15l-3 3M15 15l3 3M10 19l2 2 2-2" />
    <circle cx="12" cy="10" r="1.5" />
  </I>
);
export const IconList = (p: { size?: number }) => (
  <I {...p}>
    <path d="M8 6h13M8 12h13M8 18h13" />
    <circle cx="4" cy="6" r="1" fill="currentColor" />
    <circle cx="4" cy="12" r="1" fill="currentColor" />
    <circle cx="4" cy="18" r="1" fill="currentColor" />
  </I>
);
export const IconGrid = (p: { size?: number }) => (
  <I {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </I>
);
export const IconBook = (p: { size?: number }) => (
  <I {...p}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5z" />
    <path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" />
  </I>
);
export const IconBell = (p: { size?: number }) => (
  <I {...p}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </I>
);
export const IconCheck = (p: { size?: number }) => (
  <I {...p} sw={2.8}>
    <path d="M20 6L9 17l-5-5" />
  </I>
);
export const IconChevron = (p: { size?: number }) => (
  <I {...p}>
    <path d="M9 18l6-6-6-6" />
  </I>
);
export const IconTag = (p: { size?: number }) => (
  <I {...p}>
    <path d="M3 12V4h8l10 10-8 8L3 12z" />
    <circle cx="7.5" cy="8.5" r="1.2" fill="currentColor" />
  </I>
);
export const IconHeart = (p: { size?: number }) => (
  <I {...p}>
    <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
  </I>
);
export const IconTune = (p: { size?: number }) => (
  <I {...p}>
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </I>
);
export const IconArrowRight = (p: { size?: number }) => (
  <I {...p} sw={2.8}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </I>
);
